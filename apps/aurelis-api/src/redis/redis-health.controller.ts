import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('health/redis')
export class RedisHealthController {
	constructor(private readonly redis: RedisService) {}

	@Get()
	async health() {
		const redis = await this.redis.health();
		return { status: redis.status === 'up' ? 'ok' : 'degraded', redis, rateLimitPolicy: 'fail-closed' };
	}
}
