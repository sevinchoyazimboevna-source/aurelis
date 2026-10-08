import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';

export const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private readonly client: Redis;

	constructor(config: ConfigService) {
		const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
		const parsed = new URL(url);
		if (!['redis:', 'rediss:'].includes(parsed.protocol)) throw new Error('Invalid REDIS_URL protocol');
		this.client = new Redis(url, {
			lazyConnect: true,
			enableOfflineQueue: false,
			maxRetriesPerRequest: 0,
			connectTimeout: 1000,
			commandTimeout: 1000,
			retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
		});
		this.client.on('error', () => {
			// Never log the URL, credentials, keys or request data.
			this.logger.warn('Redis unavailable; cache bypassed and protected mutations fail closed');
		});
	}

	onModuleInit(): void {
		void this.client.connect().catch(() => undefined);
	}

	onModuleDestroy(): void {
		this.client.disconnect();
	}

	private async safe<T>(operation: () => Promise<T>): Promise<T | undefined> {
		if (this.client.status !== 'ready') return undefined;
		try {
			return await operation();
		} catch {
			return undefined;
		}
	}

	// Dedicated connections inherit STEP 13 timeouts/reconnect policy; never subscribe the command client.
	createPubSubClient(): Redis {
		const client = this.client.duplicate({ lazyConnect: true });
		client.on('error', () => undefined);
		return client;
	}

	async evalState(script: string, key: string, args: (string | number)[]): Promise<unknown> {
		return this.safe(() => this.client.eval(script, 1, key, ...args));
	}

	async health(): Promise<{ status: 'up' | 'down' }> {
		return { status: (await this.safe(() => this.client.ping())) === 'PONG' ? 'up' : 'down' };
	}

	async getJson<T>(key: string): Promise<T | undefined> {
		const value = await this.safe(() => this.client.get(key));
		if (!value) return undefined;
		try {
			return JSON.parse(value) as T;
		} catch {
			return undefined;
		}
	}

	async setJson(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
		assertTtl(ttlSeconds);
		try {
			const serialized = JSON.stringify(value);
			if (serialized === undefined) return false;
			return (await this.safe(() => this.client.set(key, serialized, 'EX', ttlSeconds))) === 'OK';
		} catch {
			return false;
		}
	}

	async delete(key: string): Promise<boolean> {
		return ((await this.safe(() => this.client.del(key))) ?? 0) > 0;
	}

	async remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
		assertTtl(ttlSeconds);
		const cached = await this.getJson<T>(key);
		if (cached !== undefined) return cached;
		const value = await load();
		await this.setJson(key, value, ttlSeconds);
		return value;
	}

	async popularityKey(query: unknown): Promise<string | undefined> {
		// UUID generations isolate in-flight fills from invalidations; old pages expire.
		const generation = await this.safe(() => this.client.get('aurelis:cache:popularity:generation'));
		if (generation === undefined) return undefined;
		return `aurelis:cache:popularity:${generation ?? 'initial'}:${digest(JSON.stringify(query))}`;
	}

	async invalidatePopularity(): Promise<void> {
		await this.safe(() => this.client.set('aurelis:cache:popularity:generation', randomUUID(), 'EX', 86400));
	}

	async consumeRateLimit(
		scope: string,
		identity: string,
		limit: number,
		windowSeconds: number,
	): Promise<
		| {
				allowed: boolean;
				retryAfterSeconds: number;
		  }
		| undefined
	> {
		assertTtl(windowSeconds);
		if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid rate limit');
		const result = await this.safe(() =>
			this.client.eval(RATE_SCRIPT, 1, `aurelis:rate:${scope}:${digest(identity)}`, windowSeconds * 1000),
		);
		if (!Array.isArray(result) || result.length !== 2) return undefined;
		const [count, ttl] = result as unknown[];
		if (typeof count !== 'number' || typeof ttl !== 'number' || ttl < 0) return undefined;
		return { allowed: count <= limit, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
	}

	setTemporary<T>(namespace: string, id: string, value: T, ttlSeconds: number): Promise<boolean> {
		return this.setJson(stateKey(namespace, id), value, ttlSeconds);
	}

	getTemporary<T>(namespace: string, id: string): Promise<T | undefined> {
		return this.getJson<T>(stateKey(namespace, id));
	}

	deleteTemporary(namespace: string, id: string): Promise<boolean> {
		return this.delete(stateKey(namespace, id));
	}

	// Foundation only: a separate TTL heartbeat per authenticated member/session.
	touchPresence(memberId: string, sessionId: string, ttlSeconds = 60): Promise<boolean> {
		return this.setJson(presenceKey(memberId, sessionId), { lastSeenAt: new Date().toISOString() }, ttlSeconds);
	}

	getPresence(memberId: string, sessionId: string): Promise<{ lastSeenAt: string } | undefined> {
		return this.getJson(presenceKey(memberId, sessionId));
	}

	clearPresence(memberId: string, sessionId: string): Promise<boolean> {
		return this.delete(presenceKey(memberId, sessionId));
	}
}

function digest(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function stateKey(namespace: string, id: string): string {
	return `aurelis:temporary:${digest(namespace)}:${digest(id)}`;
}

export function presenceKey(memberId: string, sessionId: string): string {
	return `aurelis:presence:${digest(memberId)}:${digest(sessionId)}`;
}

function assertTtl(ttl: number): void {
	if (!Number.isSafeInteger(ttl) || ttl < 1) throw new Error('TTL must be a positive integer in seconds');
}
