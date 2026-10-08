import { SocketStateService, SESSION_SCRIPT } from './socket-state.service';
import { conversationRoom, memberRoom } from './socket.constants';
import { ChatService } from '../components/chat/chat.service';
import { RoomPolicy } from './room-policy';
import { RedisService } from '../redis/redis.service';
import { SocketAdapterService, safeSubscriber } from './socket-adapter.service';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
jest.mock('@socket.io/redis-adapter', () => ({ createAdapter: jest.fn(() => 'adapter') }));
describe('Socket foundation', () => {
	const id = 'ABCDEF000000000000000001';
	it('normalizes only strict BSON room IDs', () => {
		expect(conversationRoom(id)).toBe('conversation:' + id.toLowerCase());
		expect(memberRoom(id)).toBe('member:' + id.toLowerCase());
		for (const bad of ['', 'room:any', '../admin', null, {}, 'f'.repeat(25)])
			expect(() => conversationRoom(bad)).toThrow('INVALID_ROOM');
	});
	it('checks MongoDB authorization and denies failed membership checks', async () => {
		const access = jest.fn().mockRejectedValue(new Error('forbidden'));
		const policy = new RoomPolicy({ access } as unknown as ChatService);
		expect(await policy.canAccess(id, id)).toBe(false);
		access.mockResolvedValue({});
		expect(await policy.canAccess(id, id)).toBe(true);
		expect(access).toHaveBeenCalledWith(id, id);
	});
	it('uses bounded atomic Redis scripts for presence and typing', async () => {
		const evalState = jest.fn().mockResolvedValue(2);
		const state = new SocketStateService({ evalState } as unknown as RedisService);
		expect(await state.presence(id, 'session', 'touch')).toBe(true);
		expect(evalState).toHaveBeenLastCalledWith(SESSION_SCRIPT, 'aurelis:socket:presence:' + id.toLowerCase(), [
			'touch',
			'session',
			60,
		]);
		expect(await state.typing(id, id, 'session', true)).toBe(true);
		expect(evalState).toHaveBeenLastCalledWith(SESSION_SCRIPT, expect.stringContaining('typing:'), [
			'touch',
			'session',
			5,
		]);
		evalState.mockResolvedValue(0);
		expect(await state.presence(id, 'session', 'remove')).toBe(false);
		expect(await state.typing(id, id, 'session', false)).toBe(false);
		expect(evalState).toHaveBeenLastCalledWith(SESSION_SCRIPT, expect.any(String), ['remove', 'session', 5]);
		evalState.mockResolvedValue(undefined);
		expect(await state.presence(id)).toBeUndefined();
		expect(await state.typing(id, id, 'session', true)).toBeUndefined();
	});
	it('installs dedicated pub/sub clients, tracks readiness and cleans up', () => {
		const pub = {
			status: 'ready',
			on: jest.fn(),
			connect: jest.fn().mockResolvedValue(undefined),
			disconnect: jest.fn(),
		};
		const sub = { ...pub, disconnect: jest.fn() };
		const factory = jest.fn().mockReturnValueOnce(pub).mockReturnValueOnce(sub);
		const adapter = new SocketAdapterService({ createPubSubClient: factory } as unknown as RedisService);
		const server = { adapter: jest.fn(), sockets: { adapter: { on: jest.fn() } } };
		expect(adapter.ready()).toBe(false);
		adapter.install(server as unknown as Server);
		expect(factory).toHaveBeenCalledTimes(2);
		expect(createAdapter).toHaveBeenCalledWith(pub, sub, expect.objectContaining({ key: 'aurelis:socket.io' }));
		expect(adapter.ready()).toBe(true);
		sub.status = 'reconnecting';
		expect(adapter.ready()).toBe(false);
		sub.status = 'ready';
		expect(adapter.ready()).toBe(true);
		adapter.onModuleDestroy();
		expect(pub.disconnect).toHaveBeenCalled();
		expect(sub.disconnect).toHaveBeenCalled();
	});
	it('contains adapter initialization failures', () => {
		const disconnect = jest.fn();
		const client = { disconnect } as unknown as Redis;
		const adapter = new SocketAdapterService({ createPubSubClient: () => client } as unknown as RedisService);
		jest.mocked(createAdapter).mockImplementationOnce(() => {
			throw new Error('secret');
		});
		expect(() => adapter.install({ adapter: jest.fn() } as unknown as Server)).not.toThrow();
		expect(adapter.ready()).toBe(false);
		expect(disconnect).toHaveBeenCalled();
	});
	it('contains upstream fire-and-forget unsubscribe failures during offline shutdown', async () => {
		const client = {
			unsubscribe: jest.fn().mockRejectedValue(new Error('offline')),
			punsubscribe: jest.fn().mockRejectedValue(new Error('offline')),
		};
		const sub = safeSubscriber(client as unknown as Redis);
		await expect(sub.unsubscribe('channel')).resolves.toBe(0);
		await expect(sub.punsubscribe('channel*')).resolves.toBe(0);
	});
});
