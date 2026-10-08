import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { RedisService } from './redis.service';
@Injectable()
export class RateLimitService {
	constructor(private readonly redis: RedisService) {}
	async message(memberId: string): Promise<void> {
		const result = await this.redis.consumeRateLimit('chat-message', memberId, 30, 60);
		if (!result)
			throw new GraphQLError('Rate limiting temporarily unavailable. Please retry.', {
				extensions: { code: 'RATE_LIMIT_UNAVAILABLE', retryAfterSeconds: 5 },
			});
		if (!result.allowed)
			throw new GraphQLError('Too many requests. Please retry later.', {
				extensions: { code: 'RATE_LIMITED', retryAfterSeconds: result.retryAfterSeconds },
			});
	}
}
