import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import type { Request } from 'express';
import { RedisService } from './redis.service';

export const RATE_LIMIT = 'aurelis:rate-limit';
export const RATE_POLICIES = {
	login: { scope: 'login', limit: 10, windowSeconds: 60 },
	view: { scope: 'view', limit: 60, windowSeconds: 60 },
	inquiry: { scope: 'inquiry', limit: 5, windowSeconds: 600 },
	sell: { scope: 'sell', limit: 5, windowSeconds: 600 },
} as const;
export const RateLimit = (policy: keyof typeof RATE_POLICIES) => SetMetadata(RATE_LIMIT, RATE_POLICIES[policy]);

@Injectable()
export class RateLimitGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly redis: RedisService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const policy = this.reflector.get<(typeof RATE_POLICIES)[keyof typeof RATE_POLICIES] | undefined>(
			RATE_LIMIT,
			context.getHandler(),
		);
		if (!policy) return true;
		const { req } = GqlExecutionContext.create(context).getContext<{ req: Request }>();
		// Express defaults to trust proxy=false. Never read spoofable forwarded headers.
		const identity = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
		const result = await this.redis.consumeRateLimit(policy.scope, identity, policy.limit, policy.windowSeconds);
		if (!result)
			throw new GraphQLError('Rate limiting temporarily unavailable. Please retry.', {
				extensions: { code: 'RATE_LIMIT_UNAVAILABLE', retryAfterSeconds: 5 },
			});
		if (!result.allowed)
			throw new GraphQLError('Too many requests. Please retry later.', {
				extensions: { code: 'RATE_LIMITED', retryAfterSeconds: result.retryAfterSeconds },
			});
		return true;
	}
}
