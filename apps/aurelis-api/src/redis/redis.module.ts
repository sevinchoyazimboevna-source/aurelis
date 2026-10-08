import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RedisService } from './redis.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisHealthController } from './redis-health.controller';

@Global()
@Module({
	imports: [ConfigModule],
	providers: [RedisService, { provide: APP_GUARD, useClass: RateLimitGuard }],
	controllers: [RedisHealthController],
	exports: [RedisService],
})
export class RedisModule {}
