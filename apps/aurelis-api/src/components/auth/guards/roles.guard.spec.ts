import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
	const reflector = { get: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
	const authService = { verifyToken: jest.fn() };
	let guard: RolesGuard;

	beforeEach(() => {
		jest.clearAllMocks();
		guard = new RolesGuard(reflector, authService as never);
	});

	function makeContext() {
		const request = { headers: { authorization: 'Bearer valid-token' }, body: {} };
		return {
			contextType: 'graphql',
			getHandler: () => ({}),
			getArgByIndex: () => ({ req: request }),
			request,
		};
	}

	it('allows active administrators', async () => {
		authService.verifyToken.mockResolvedValue({ memberType: 'ADMIN', memberStatus: 'ACTIVE', memberNick: 'staff' });
		const context = makeContext();
		await expect(guard.canActivate(context as any)).resolves.toBe(true);
		expect(context.request.body.authMember.memberType).toBe('ADMIN');
	});

	it('denies non-admin members', async () => {
		authService.verifyToken.mockResolvedValue({ memberType: 'USER', memberStatus: 'ACTIVE' });
		await expect(guard.canActivate(makeContext() as any)).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('denies blocked accounts', async () => {
		authService.verifyToken.mockResolvedValue({ memberType: 'ADMIN', memberStatus: 'BLOCK' });
		await expect(guard.canActivate(makeContext() as any)).rejects.toThrow();
	});
});
