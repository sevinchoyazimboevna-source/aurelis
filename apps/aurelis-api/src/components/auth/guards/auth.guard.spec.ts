import { AuthGuard } from './auth.guard';
import { AuthErrorCode } from '../auth-errors';
import { MemberStatus } from '../../../libs/enums/member.enum';

describe('AuthGuard', () => {
	const request = { headers: { authorization: 'Bearer jwt' } };
	const makeContext = () => ({
		getType: () => 'graphql',
		getHandler: () => ({}),
		getClass: () => ({}),
		getArgs: () => [null, {}, { req: request }, {}],
		getArgByIndex: () => ({ req: request }),
	});

	it('loads the active member once into GraphQL request context', async () => {
		const member = { _id: 'member-id', status: MemberStatus.ACTIVE } as any;
		const service = { authenticateRequest: jest.fn().mockResolvedValue(member) };
		const guard = new AuthGuard(service as any);
		await expect(guard.canActivate(makeContext() as any)).resolves.toBe(true);
		expect(service.authenticateRequest).toHaveBeenCalledWith(request);
	});

	it('returns AUTH_UNAUTHENTICATED when GraphQL request context is missing', async () => {
		const guard = new AuthGuard({ authenticateRequest: jest.fn() } as any);
		await expect(guard.canActivate({ getType: () => 'graphql', getHandler: () => ({}), getClass: () => ({}), getArgs: () => [null, {}, undefined, {}] } as any)).rejects.toMatchObject({ authErrorCode: AuthErrorCode.UNAUTHENTICATED, status: 401 });
	});
});
