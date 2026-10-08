import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SocketAdapterService } from './socket-adapter.service';
@Controller('health/socket')
export class SocketHealthController {
	constructor(
		private readonly redis: RedisService,
		private readonly adapter: SocketAdapterService,
	) {}
	@Get()
	async health() {
		const redis = await this.redis.health();
		const ready = this.adapter.ready() && redis.status === 'up';
		return {
			status: ready ? 'ok' : 'degraded',
			ready,
			adapter: this.adapter.ready() ? 'up' : 'down',
			redis,
			policy: 'fail-closed',
		};
	}
}
