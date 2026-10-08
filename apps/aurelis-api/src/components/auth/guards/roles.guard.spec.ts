import { Reflector } from '@nestjs/core';
import { MemberRole } from '../../../libs/enums/member.enum';
import { AuthErrorCode } from '../auth-errors';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
	let requiredRoles: MemberRole[] | undefined;
	let guard: RolesGuard;

	beforeEach(() => {
		requiredRoles = [MemberRole.ADMIN];
		const reflector = { getAllAndOverride: jest.fn().mockImplementation(() => requiredRoles) } as unknown as Reflector;
		guard = new RolesGuard(reflector);
	});

	function makeContext(role?: MemberRole) {
		const request = role ? { authMember: { role } } : {};
		return {
			getType: () => 'graphql',
			getHandler: () => ({}),
			getClass: () => ({}),
			getArgs: () => [null, {}, { req: request }, {}],
			getArgByIndex: () => ({ req: request }),
		};
	}

	it('allows ADMIN for an admin-only operation', () => {
		expect(guard.canActivate(makeContext(MemberRole.ADMIN) as any)).toBe(true);
	});

	it.each([MemberRole.USER, MemberRole.OWNER, MemberRole.CREW])('rejects %s for an admin-only operation with AUTH_FORBIDDEN', (role) => {
		try {
			guard.canActivate(makeContext(role) as any);
			throw new Error('Expected role guard to reject');
		} catch (error) {
			expect(error).toMatchObject({ authErrorCode: AuthErrorCode.FORBIDDEN, status: 403 });
		}
	});

	it('supports all defined member roles when explicitly allowed', () => {
		requiredRoles = Object.values(MemberRole);
		for (const role of Object.values(MemberRole)) expect(guard.canActivate(makeContext(role) as any)).toBe(true);
	});

	it('returns AUTH_UNAUTHENTICATED when AuthGuard has not supplied a member', () => {
		expect(() => guard.canActivate(makeContext() as any)).toThrow(expect.objectContaining({ authErrorCode: AuthErrorCode.UNAUTHENTICATED }));
	});
});
