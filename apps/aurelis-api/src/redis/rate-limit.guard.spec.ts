import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RateLimitGuard, RATE_LIMIT, RATE_POLICIES } from './rate-limit.guard';
import { RedisService } from './redis.service';
import { AuthResolver } from '../components/auth/auth.resolver';
import { YachtResolver } from '../components/yacht/yacht.resolver';
import { InquiryResolver } from '../components/inquiry/inquiry.resolver';
import { SellYachtRequestResolver } from '../components/sell-yacht-request/sell-yacht-request.resolver';

describe('RateLimitGuard', () => {
	const consumeRateLimit = jest.fn();
	const reflector = new Reflector();
	const guard = new RateLimitGuard(reflector, { consumeRateLimit } as unknown as RedisService);
	const context = { getHandler: () => handler(AuthResolver.prototype, 'login') } as ExecutionContext;
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
			getContext: () => ({
				req: { ip: 'trusted-ip', headers: { 'x-forwarded-for': 'spoofed-ip' } },
			}),
		} as unknown as GqlExecutionContext);
	});
	afterEach(() => jest.restoreAllMocks());
	it.each([
		[handler(AuthResolver.prototype, 'login'), 'login'],
		[handler(AuthResolver.prototype, 'googleLogin'), 'login'],
		[handler(YachtResolver.prototype, 'recordYachtView'), 'view'],
		[handler(InquiryResolver.prototype, 'submitYachtInquiry'), 'inquiry'],
		[handler(InquiryResolver.prototype, 'submitSalesInquiry'), 'inquiry'],
		[handler(InquiryResolver.prototype, 'submitCharterInquiry'), 'inquiry'],
		[handler(SellYachtRequestResolver.prototype, 'submitSellYachtRequest'), 'sell'],
	] as const)('protects %p with the shared %s policy', (handler, policy) => {
		expect(reflector.get(RATE_LIMIT, handler)).toEqual(RATE_POLICIES[policy]);
	});
	it('leaves read operations and unrelated writes untouched', async () => {
		expect(
			await guard.canActivate({ getHandler: () => handler(YachtResolver.prototype, 'getYachts') } as ExecutionContext),
		).toBe(true);
		expect(consumeRateLimit).not.toHaveBeenCalled();
	});
	it('uses server IP and ignores forwarded headers', async () => {
		consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
		expect(await guard.canActivate(context)).toBe(true);
		expect(consumeRateLimit).toHaveBeenCalledWith('login', 'trusted-ip', 10, 60);
	});
	it('returns stable exhaustion code with retry time', async () => {
		consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 23 });
		await expect(guard.canActivate(context)).rejects.toMatchObject({
			extensions: { code: 'RATE_LIMITED', retryAfterSeconds: 23 },
		});
	});
	it('fails closed on Redis outage', async () => {
		consumeRateLimit.mockResolvedValue(undefined);
		await expect(guard.canActivate(context)).rejects.toMatchObject({
			extensions: { code: 'RATE_LIMIT_UNAVAILABLE', retryAfterSeconds: 5 },
		});
	});
});

function handler(prototype: object, name: string): (...args: never[]) => unknown {
	return Object.getOwnPropertyDescriptor(prototype, name)!.value as (...args: never[]) => unknown;
}
