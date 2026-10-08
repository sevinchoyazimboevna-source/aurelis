import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';
@Injectable()
export class SocketAdapterService implements OnModuleDestroy {
	private pub?: Redis;
	private sub?: Redis;
	private installed = false;
	private stopped = false;
	constructor(private readonly redis: RedisService) {}
	install(server: Server): void {
		try {
			this.pub = this.redis.createPubSubClient();
			this.sub = this.redis.createPubSubClient();
			const activate = () => {
				if (this.stopped || this.installed || this.pub?.status !== 'ready' || this.sub?.status !== 'ready') return;
				try {
					server.adapter(
						createAdapter(this.pub, safeSubscriber(this.sub), { key: 'aurelis:socket.io', requestsTimeout: 1000 }),
					);
					server.sockets.adapter.on('error', () => undefined);
					this.installed = true;
				} catch {
					this.onModuleDestroy();
				}
			};
			this.pub.on('ready', activate);
			this.sub.on('ready', activate);
			activate();
			// Install only when commands can execute: the shared offline queue is disabled.
			void this.pub.connect().catch(() => undefined);
			void this.sub.connect().catch(() => undefined);
		} catch {
			this.onModuleDestroy();
		}
	}
	ready(): boolean {
		return this.installed && this.pub?.status === 'ready' && this.sub?.status === 'ready';
	}
	onModuleDestroy(): void {
		this.stopped = true;
		this.installed = false;
		this.pub?.disconnect();
		this.sub?.disconnect();
	}
}

// The upstream adapter fires unawaited unsubscribe promises from close().
// Contain those teardown-only failures, including when Redis is already offline.
export function safeSubscriber(client: Redis): Redis {
	return new Proxy(client, {
		get(target, property, receiver): unknown {
			if (property === 'unsubscribe' || property === 'punsubscribe') {
				return async (...channels: string[]): Promise<unknown> => {
					try {
						return property === 'unsubscribe'
							? await target.unsubscribe(...channels)
							: await target.punsubscribe(...channels);
					} catch {
						return 0;
					}
				};
			}
			return Reflect.get(target, property, receiver) as unknown;
		},
	});
}
