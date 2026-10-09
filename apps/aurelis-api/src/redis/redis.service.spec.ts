import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService, RATE_SCRIPT, presenceKey } from './redis.service';

jest.mock('ioredis', () => jest.fn());

describe('RedisService (offline client)', () => {
	const client = {
		status: 'ready',
		duplicate: jest.fn(),
		on: jest.fn(),
		connect: jest.fn(),
		disconnect: jest.fn(),
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
		ping: jest.fn(),
		eval: jest.fn(),
	};
	let service: RedisService;
	beforeEach(() => {
		jest.resetAllMocks();
		client.status = 'ready';
		client.connect.mockResolvedValue(undefined);
		client.set.mockResolvedValue('OK');
		client.get.mockResolvedValue(null);
		jest.mocked(Redis).mockImplementation(() => client as unknown as Redis);
		service = new RedisService(new ConfigService({ REDIS_URL: 'redis://localhost:6379' }));
	});
	it('uses bounded commands, no offline queue and sanitized error listener', () => {
		expect(Redis).toHaveBeenCalledWith(
			'redis://localhost:6379',
			expect.objectContaining({
				lazyConnect: true,
				enableOfflineQueue: false,
				commandTimeout: 1000,
				maxRetriesPerRequest: 0,
			}),
		);
		expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
	});
	it('starts without awaiting Redis and closes the reconnecting client', async () => {
		client.connect.mockRejectedValue(new Error('offline'));
		service.onModuleInit();
		await Promise.resolve();
		service.onModuleDestroy();
		expect(client.disconnect).toHaveBeenCalledTimes(1);
	});
	it('reports real ping health and sanitizes failures', async () => {
		client.ping.mockResolvedValue('PONG');
		expect(await service.health()).toEqual({ status: 'up' });
		client.ping.mockRejectedValue(new Error('secret'));
		expect(await service.health()).toEqual({ status: 'down' });
	});
	it('reads JSON and treats corrupt values as cache misses', async () => {
		client.get.mockResolvedValueOnce('{"count":0}').mockResolvedValueOnce('bad');
		expect(await service.getJson('cache')).toEqual({ count: 0 });
		expect(await service.getJson('cache')).toBeUndefined();
	});
	it('sets explicit TTL and catches serialization failures', async () => {
		expect(await service.setJson('cache', { count: 1 }, 30)).toBe(true);
		expect(client.set).toHaveBeenCalledWith('cache', '{"count":1}', 'EX', 30);
		expect(await service.setJson('cache', 1n, 30)).toBe(false);
		expect(await service.setJson('cache', undefined, 30)).toBe(false);
	});
	it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid TTL %s', async (ttl) => {
		await expect(service.setJson('cache', {}, ttl)).rejects.toThrow('TTL');
	});
	it('returns cached false and does not call the loader', async () => {
		client.get.mockResolvedValue('false');
		const load = jest.fn().mockResolvedValue(true);
		expect(await service.remember('cache', 30, load)).toBe(false);
		expect(load).not.toHaveBeenCalled();
	});
	it('bypasses disconnected Redis without queueing and propagates source failures', async () => {
		client.status = 'reconnecting';
		expect(await service.remember('cache', 30, () => Promise.resolve('mongo'))).toBe('mongo');
		expect(client.get).not.toHaveBeenCalled();
		expect(client.set).not.toHaveBeenCalled();
		expect(await service.consumeRateLimit('login', 'ip', 10, 60)).toBeUndefined();
		await expect(service.remember('cache', 30, () => Promise.reject(new Error('mongo failure')))).rejects.toThrow(
			'mongo failure',
		);
	});
	it('contains command rejections for cache writes, deletes, rate limits and invalidation', async () => {
		for (const method of [client.get, client.set, client.del, client.eval])
			method.mockRejectedValue(new Error('offline'));
		expect(await service.remember('cache', 30, () => Promise.resolve(42))).toBe(42);
		expect(await service.delete('cache')).toBe(false);
		await expect(service.invalidatePopularity()).resolves.toBeUndefined();
		expect(await service.consumeRateLimit('login', 'ip', 10, 60)).toBeUndefined();
	});
	it('uses one atomic Lua counter/expiry operation and hashes identity', async () => {
		client.eval.mockResolvedValueOnce([10, 3001]).mockResolvedValueOnce([11, 3000]);
		expect(await service.consumeRateLimit('login', 'private-ip', 10, 60)).toEqual({
			allowed: true,
			retryAfterSeconds: 4,
		});
		expect(await service.consumeRateLimit('login', 'private-ip', 10, 60)).toEqual({
			allowed: false,
			retryAfterSeconds: 3,
		});
		expect(client.eval).toHaveBeenCalledWith(
			RATE_SCRIPT,
			1,
			expect.stringMatching(/^aurelis:rate:login:[a-f0-9]{64}$/),
			60000,
		);
		expect(RATE_SCRIPT).toContain('PEXPIRE');
	});
	it.each([null, [], [1, -1], ['1', 1000]])('treats invalid script reply %j as unavailable', async (reply) => {
		client.eval.mockResolvedValue(reply);
		expect(await service.consumeRateLimit('login', 'ip', 10, 60)).toBeUndefined();
	});
	it('isolates generations and filtered cache keys without storing request data', async () => {
		const initial = await service.popularityKey({ page: 1 });
		client.get.mockResolvedValue('new-generation');
		const next = await service.popularityKey({ page: 1 });
		expect(initial).not.toBe(next);
		expect(await service.popularityKey({ page: 2 })).not.toBe(next);
		await service.invalidatePopularity();
		expect(client.set).toHaveBeenCalledWith('aurelis:cache:popularity:generation', expect.any(String), 'EX', 86400);
	});
	it('isolates every popularity request dimension', async () => {
		const base = {
			input: { page: 1, limit: 20, sortBy: 'POPULAR', filter: { listingMode: 'SALE', country: 'Italy' } },
			featuredOnly: false,
		};
		const initial = await service.popularityKey(base);
		for (const variant of [
			{ ...base, input: { ...base.input, page: 2 } },
			{ ...base, input: { ...base.input, limit: 10 } },
			{ ...base, input: { ...base.input, sortBy: 'MOST_LIKED' } },
			{ ...base, input: { ...base.input, filter: { ...base.input.filter, listingMode: 'CHARTER' } } },
			{ ...base, input: { ...base.input, filter: { ...base.input.filter, country: 'France' } } },
			{ ...base, featuredOnly: true },
		])
			expect(await service.popularityKey(variant)).not.toBe(initial);
	});
	it('namespaces temporary state and makes presence specific to each session', async () => {
		await service.setTemporary('token', 'private-id', { value: 1 }, 90);
		expect(client.set).toHaveBeenCalledWith(expect.stringMatching(/^aurelis:temporary:/), '{"value":1}', 'EX', 90);
		await service.touchPresence('member', 'session-a');
		expect(client.set).toHaveBeenCalledWith(presenceKey('member', 'session-a'), expect.any(String), 'EX', 60);
		expect(presenceKey('member', 'session-a')).not.toBe(presenceKey('member', 'session-b'));
		await service.getPresence('member', 'session-a');
		await service.clearPresence('member', 'session-a');
		expect(client.get).toHaveBeenCalledWith(presenceKey('member', 'session-a'));
		expect(client.del).toHaveBeenCalledWith(presenceKey('member', 'session-a'));
		await service.getTemporary('token', 'private-id');
		await service.deleteTemporary('token', 'private-id');
	});
	it('duplicates dedicated pub/sub clients without exposing the command connection', () => {
		const dedicated = { on: jest.fn() };
		client.duplicate.mockReturnValue(dedicated);
		expect(service.createPubSubClient()).toBe(dedicated);
		expect(client.duplicate).toHaveBeenCalledWith({ lazyConnect: true });
		expect(dedicated.on).toHaveBeenCalledWith('error', expect.any(Function));
	});
	it('bounds socket state scripts and contains command failures', async () => {
		client.eval.mockResolvedValue(2);
		expect(await service.evalState('script', 'state', ['touch', 'session', 60])).toBe(2);
		expect(client.eval).toHaveBeenCalledWith('script', 1, 'state', 'touch', 'session', 60);
		client.eval.mockRejectedValue(new Error('private failure'));
		expect(await service.evalState('script', 'state', [])).toBeUndefined();
		client.status = 'reconnecting';
		client.eval.mockClear();
		expect(await service.evalState('script', 'state', [])).toBeUndefined();
		expect(client.eval).not.toHaveBeenCalled();
	});
});
