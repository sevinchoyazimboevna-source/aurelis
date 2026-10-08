import type { ExecutionContext } from '@nestjs/common';
import { OptionalInquiryAuthGuard } from './optional-inquiry-auth.guard';
import type { AuthRequest, AuthService } from '../auth/auth.service';
import { AuthErrorCode, authError } from '../auth/auth-errors';

describe('OptionalInquiryAuthGuard', () => {
	const context = (req?: AuthRequest) =>
		({
			getType: () => 'graphql',
			getHandler: () => ({}),
			getClass: () => ({}),
			getArgs: () => [null, {}, { req }, {}],
		}) as unknown as ExecutionContext;
	it('allows guests and removes unverified stale context without authenticating', async () => {
		const req: AuthRequest = { headers: {} };
		const service = { authenticateRequest: jest.fn() };
		expect(await new OptionalInquiryAuthGuard(service as unknown as AuthService).canActivate(context(req))).toBe(true);
		expect(service.authenticateRequest).not.toHaveBeenCalled();
		expect(req.authMember).toBeUndefined();
	});
	it('delegates supplied credentials exactly once to shared authentication', async () => {
		const req: AuthRequest = { headers: { authorization: 'Bearer jwt' } };
		const service = { authenticateRequest: jest.fn().mockResolvedValue(undefined) };
		expect(await new OptionalInquiryAuthGuard(service as unknown as AuthService).canActivate(context(req))).toBe(true);
		expect(service.authenticateRequest).toHaveBeenCalledTimes(1);
		expect(service.authenticateRequest).toHaveBeenCalledWith(req);
	});
	it.each([AuthErrorCode.INVALID_TOKEN, AuthErrorCode.ACCOUNT_BLOCKED, AuthErrorCode.ACCOUNT_DELETED])(
		'preserves shared failure %s instead of downgrading credentials to guest',
		async (code) => {
			const service = { authenticateRequest: jest.fn().mockRejectedValue(authError(code)) };
			await expect(
				new OptionalInquiryAuthGuard(service as unknown as AuthService).canActivate(
					context({ headers: { authorization: 'Bearer jwt' } }),
				),
			).rejects.toMatchObject({ authErrorCode: code });
		},
	);
	it('fails closed for missing request context', async () => {
		await expect(
			new OptionalInquiryAuthGuard({ authenticateRequest: jest.fn() } as unknown as AuthService).canActivate(context()),
		).rejects.toMatchObject({ authErrorCode: AuthErrorCode.UNAUTHENTICATED });
	});
});
