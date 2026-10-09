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
						createAdapter(
							safePublisher(this.pub, () => this.onModuleDestroy()),
							safeSubscriber(this.sub, () => this.onModuleDestroy()),
							{ key: 'aurelis:socket.io', requestsTimeout: 1000 },
						),
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

// The upstream adapter fires subscription and teardown promises without awaiting them.
// Contain rejection and fail closed on a lost subscription; teardown remains harmless.
export function safeSubscriber(client: Redis, onFailure: () => void = () => undefined): Redis {
	return new Proxy(client, {
		get(target, property, receiver): unknown {
			if (['subscribe', 'psubscribe', 'unsubscribe', 'punsubscribe'].includes(String(property))) {
				return async (...channels: (string | string[])[]): Promise<unknown> => {
					try {
						const command = Reflect.get(target, property) as (...args: (string | string[])[]) => Promise<unknown>;
						return await command.apply(target, channels);
					} catch {
						if (property === 'subscribe' || property === 'psubscribe') onFailure();
						return 0;
					}
				};
			}
			return Reflect.get(target, property, receiver) as unknown;
		},
	});
}

// Upstream broadcasts also fire publish promises without awaiting them.
export function safePublisher(client: Redis, onFailure: () => void): Redis {
	return new Proxy(client, {
		get(target, property, receiver): unknown {
			if (property === 'publish') {
				return async (channel: string, message: string | Buffer): Promise<number> => {
					try {
						return await target.publish(channel, message);
					} catch {
						onFailure();
						return 0;
					}
				};
			}
			return Reflect.get(target, property, receiver) as unknown;
		},
	});
}
