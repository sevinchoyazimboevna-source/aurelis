import { Test } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { RedisHealthController } from './redis-health.controller';

describe('Redis module wiring (offline)', () => {
	it('resolves configuration, global limiter and health without live connections', async () => {
		const module = await Test.createTestingModule({ imports: [RedisModule] })
			.overrideProvider(RedisService)
			.useValue({ health: () => Promise.resolve({ status: 'down' }) })
			.compile();
		try {
			expect(module.get(RedisHealthController)).toBeInstanceOf(RedisHealthController);
			expect(await module.get(RedisHealthController).health()).toEqual({
				status: 'degraded',
				redis: { status: 'down' },
				rateLimitPolicy: 'fail-closed',
			});
		} finally {
			await module.close();
		}
	});
});
