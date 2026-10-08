import { AuthService } from './auth.service';
import { AuthErrorCode, authError } from './auth-errors';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';

describe('AuthService', () => {
	const memberId = '507f1f77bcf86cd799439011';
	const dates = { createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') };
	const makeMember = (overrides: Record<string, unknown> = {}) => ({
		_id: { toString: () => memberId },
		email: 'sailor@example.com',
		password: 'hashed-password',
		googleId: undefined,
		role: MemberRole.USER,
		status: MemberStatus.ACTIVE,
		...dates,
		save: jest.fn().mockResolvedValue(undefined),
		...overrides,
	});
	const query = (result: unknown) => ({ select: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(result) });
	let model: any;
	let jwt: any;
	let google: any;
	let service: AuthService;

	beforeEach(() => {
		process.env.JWT_SECRET = 'test-only-secret';
		model = { exists: jest.fn(), create: jest.fn(), findOne: jest.fn(), findById: jest.fn() };
		jwt = { signAsync: jest.fn().mockResolvedValue('test.jwt.token'), verifyAsync: jest.fn() };
		google = { verifyCredential: jest.fn() };
		service = new AuthService(model, jwt, google);
	});

	afterAll(() => {
		delete process.env.JWT_SECRET;
	});

	it('registers a USER and returns only the AuthResponse member fields', async () => {
		const member = makeMember({ password: undefined });
		model.exists.mockResolvedValue(null);
		model.create.mockImplementation(async (input: any) => ({ ...member, ...input, _id: member._id }));
		const result = await service.register({ email: ' Sailor@Example.com ', password: 'secret', confirmPassword: 'secret' });
		expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'sailor@example.com', role: MemberRole.USER, status: MemberStatus.ACTIVE }));
		expect(model.create.mock.calls[0][0]).not.toHaveProperty('confirmPassword');
		expect(result).toEqual({
			accessToken: 'test.jwt.token',
			member: { _id: memberId, email: 'sailor@example.com', googleId: null, role: MemberRole.USER, status: MemberStatus.ACTIVE, ...dates },
		});
		expect(JSON.stringify(result)).not.toMatch(/password|hash/i);
	});

	it('maps password mismatch, invalid email, and duplicate email to stable errors', async () => {
		await expect(service.register({ email: 'sailor@example.com', password: 'a', confirmPassword: 'b' })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.PASSWORD_MISMATCH });
		await expect(service.register({ email: 'not-an-email', password: 'a', confirmPassword: 'a' })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.INVALID_EMAIL });
		model.exists.mockResolvedValue({ _id: memberId });
		await expect(service.register({ email: 'sailor@example.com', password: 'a', confirmPassword: 'a' })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.EMAIL_ALREADY_EXISTS });
	});

	it('maps concurrent duplicate email writes without misclassifying unrelated unique-index failures', async () => {
		model.exists.mockResolvedValue(null);
		model.create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000, keyPattern: { email: 1 } }));
		await expect(service.register({ email: 'sailor@example.com', password: 'a', confirmPassword: 'a' })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.EMAIL_ALREADY_EXISTS });
		model.create.mockRejectedValueOnce(Object.assign(new Error('legacy unique index'), { code: 11000, keyPattern: { memberNick: 1 } }));
		await expect(service.register({ email: 'another@example.com', password: 'a', confirmPassword: 'a' })).rejects.toThrow('legacy unique index');
	});

	it('returns identical errors for unknown emails and wrong passwords', async () => {
		model.findOne.mockReturnValue(query(null));
		let unknownError: any;
		try { await service.login({ email: 'sailor@example.com', password: 'wrong' }); } catch (error) { unknownError = error; }
		model.findOne.mockReturnValue(query(makeMember()));
		let passwordError: any;
		try { await service.login({ email: 'sailor@example.com', password: 'wrong' }); } catch (error) { passwordError = error; }
		expect(unknownError.authErrorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
		expect(passwordError.authErrorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
		expect(unknownError.getResponse().message).toBe(passwordError.getResponse().message);
		expect(model.findOne.mock.results[0].value.select).toHaveBeenCalledWith('+password');
	});

	it.each([[MemberStatus.BLOCKED, AuthErrorCode.ACCOUNT_BLOCKED], [MemberStatus.DELETED, AuthErrorCode.ACCOUNT_DELETED]])(
		'rejects %s members at login', async (status, code) => {
			model.findOne.mockReturnValue(query(makeMember({ status })));
			jest.spyOn(service, 'comparePasswords').mockResolvedValue(true);
			await expect(service.login({ email: 'sailor@example.com', password: 'secret' })).rejects.toMatchObject({ authErrorCode: code });
		},
	);

	it('creates a new USER from a verified Google identity', async () => {
		google.verifyCredential.mockResolvedValue({ email: 'sailor@example.com', googleId: 'google-subject' });
		model.findOne.mockReturnValueOnce(query(null)).mockReturnValueOnce(query(null));
		model.create.mockImplementation(async (input: any) => makeMember({ ...input, password: undefined }));
		const result = await service.googleLogin('google-id-token');
		expect(model.create).toHaveBeenCalledWith({ email: 'sailor@example.com', googleId: 'google-subject', role: MemberRole.USER, status: MemberStatus.ACTIVE });
		expect(result.member.role).toBe(MemberRole.USER);
		expect(result.member.status).toBe(MemberStatus.ACTIVE);
		expect(result.member.googleId).toBe('google-subject');
	});

	it('links a verified email to an existing member and rejects a conflicting Google ID', async () => {
		google.verifyCredential.mockResolvedValue({ email: 'sailor@example.com', googleId: 'google-subject' });
		const member = makeMember();
		model.findOne.mockReturnValue(query(member));
		await service.googleLogin('credential');
		expect(member.save).toHaveBeenCalled();
		expect(member.googleId).toBe('google-subject');
		model.findOne.mockReturnValue(query(makeMember({ googleId: 'google-subject' })));
		await expect(service.googleLogin('credential')).resolves.toMatchObject({ member: { googleId: 'google-subject' } });
		model.findOne.mockReturnValue(query(makeMember({ googleId: 'other-subject' })));
		await expect(service.googleLogin('credential')).rejects.toMatchObject({ authErrorCode: AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT });
	});

	it('does not expose Google verification failures', async () => {
		google.verifyCredential.mockRejectedValue(authError(AuthErrorCode.GOOGLE_INVALID));
		await expect(service.googleLogin('sensitive-google-token')).rejects.toMatchObject({ authErrorCode: AuthErrorCode.GOOGLE_INVALID });
	});

	it.each([[MemberStatus.BLOCKED, AuthErrorCode.ACCOUNT_BLOCKED], [MemberStatus.DELETED, AuthErrorCode.ACCOUNT_DELETED]])(
		'rejects %s Google accounts', async (status, code) => {
			google.verifyCredential.mockResolvedValue({ email: 'sailor@example.com', googleId: 'google-subject' });
			model.findOne.mockReturnValue(query(makeMember({ status, googleId: 'google-subject' })));
			await expect(service.googleLogin('credential')).rejects.toMatchObject({ authErrorCode: code });
		},
	);

	it('returns active current member and rejects inactive or missing members', async () => {
		model.findById.mockReturnValue(query(makeMember()));
		await expect(service.getMe(memberId)).resolves.toMatchObject({ _id: memberId, email: 'sailor@example.com' });
		model.findById.mockReturnValue(query(makeMember({ status: MemberStatus.BLOCKED })));
		await expect(service.getMe(memberId)).rejects.toMatchObject({ authErrorCode: AuthErrorCode.ACCOUNT_BLOCKED });
		model.findById.mockReturnValue(query(null));
		await expect(service.getMe(memberId)).rejects.toMatchObject({ authErrorCode: AuthErrorCode.UNAUTHENTICATED });
	});

	it('distinguishes missing and invalid JWTs and rejects blocked or deleted request members', async () => {
		await expect(service.authenticateRequest({ headers: {} })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.UNAUTHENTICATED });
		jwt.verifyAsync.mockRejectedValue(new Error('private JWT details'));
		await expect(service.authenticateRequest({ headers: { authorization: 'Bearer bad-token' } })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.INVALID_TOKEN });
		jwt.verifyAsync.mockResolvedValue({ memberId, email: 'sailor@example.com', role: MemberRole.USER, status: MemberStatus.ACTIVE });
		model.findById.mockReturnValue(query(makeMember({ status: MemberStatus.BLOCKED })));
		await expect(service.authenticateRequest({ headers: { authorization: 'Bearer valid-token' } })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.ACCOUNT_BLOCKED });
		model.findById.mockReturnValue(query(makeMember({ status: MemberStatus.DELETED })));
		await expect(service.authenticateRequest({ headers: { authorization: 'Bearer valid-token' } })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.ACCOUNT_DELETED });
	});

	it('returns true for stateless logout and emits only the required JWT claims', async () => {
		const member = makeMember();
		model.exists.mockResolvedValue(null);
		model.create.mockResolvedValue(member);
		await expect(service.logout()).resolves.toBe(true);
		await service.register({ email: 'sailor@example.com', password: 'secret', confirmPassword: 'secret' });
		expect(jwt.signAsync).toHaveBeenCalledWith({ memberId, email: 'sailor@example.com', role: MemberRole.USER, status: MemberStatus.ACTIVE });
	});

	it('returns a generic configuration error when JWT_SECRET is missing', async () => {
		delete process.env.JWT_SECRET;
		model.exists.mockResolvedValue(null);
		model.create.mockResolvedValue(makeMember());
		await expect(service.register({ email: 'sailor@example.com', password: 'secret', confirmPassword: 'secret' })).rejects.toMatchObject({ authErrorCode: AuthErrorCode.CONFIGURATION_ERROR });
	});
});
