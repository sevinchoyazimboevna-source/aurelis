import { RegisterInput } from './auth.dto';
import { AuthErrorCode } from './auth-errors';
import { AuthValidationPipe } from './auth-validation.pipe';

describe('AuthValidationPipe', () => {
	const pipe = new AuthValidationPipe();
	const metadata = { type: 'body' as const, metatype: RegisterInput, data: undefined };

	it('maps invalid auth email format to AUTH_INVALID_EMAIL without echoing submitted secrets', async () => {
		await expect(pipe.transform({ email: 'invalid', password: 'sensitive-password', confirmPassword: 'sensitive-password' }, metadata)).rejects.toMatchObject({
			authErrorCode: AuthErrorCode.INVALID_EMAIL,
			message: 'Enter a valid email address.',
		});
	});

	it.each(['ADMIN', 'OWNER', 'CREW'])('rejects client-supplied %s role fields', async (role) => {
		await expect(pipe.transform({ email: 'sailor@example.com', password: 'sensitive-password', confirmPassword: 'sensitive-password', role }, metadata)).rejects.toBeDefined();
	});
});
