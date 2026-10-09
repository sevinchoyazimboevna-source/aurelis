import { HttpStatus } from '@nestjs/common';
import { AuthErrorCode, AuthException, authError, formatGraphQLError } from './auth-errors';

describe('authentication GraphQL errors', () => {
	it.each([
		[AuthErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT],
		[AuthErrorCode.PASSWORD_MISMATCH, HttpStatus.BAD_REQUEST],
		[AuthErrorCode.INVALID_EMAIL, HttpStatus.BAD_REQUEST],
		[AuthErrorCode.ACCOUNT_BLOCKED, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.ACCOUNT_DELETED, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.INVALID_TOKEN, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN],
		[AuthErrorCode.GOOGLE_INVALID, HttpStatus.UNAUTHORIZED],
		[AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT, HttpStatus.CONFLICT],
		[AuthErrorCode.CONFIGURATION_ERROR, HttpStatus.INTERNAL_SERVER_ERROR],
	])('preserves %s and its HTTP status', (code, status) => {
		const exception = authError(code);
		const graphQLError = formatGraphQLError(
			{ message: exception.message, extensions: { code: 'INTERNAL_SERVER_ERROR' } },
			{ originalError: exception },
		);
		expect(exception).toBeInstanceOf(AuthException);
		expect(exception.getStatus()).toBe(status);
		expect(graphQLError.extensions.code).toBe(code);
		expect(graphQLError.message).not.toContain('JWT_SECRET');
		expect(JSON.stringify(graphQLError)).not.toMatch(
			/secret-password|secret-hash|sensitive-google-token|Bearer\s+sensitive-jwt|mongodb:\/\/private|private\\auth\.ts|secret stack/i,
		);
	});

	it.each(['secret-password', 'sensitive-google-token', 'private message', 'lead@example.test'])(
		'does not reflect variable input values containing %s',
		(value) => {
			const result = formatGraphQLError({
				message: 'Variable "$input" got invalid value ' + JSON.stringify({ password: value, role: 'ADMIN' }),
				extensions: { code: 'BAD_USER_INPUT', stacktrace: ['private stack'] },
			});
			expect(result).toEqual({ message: 'Invalid request input.', extensions: { code: 'BAD_USER_INPUT' } });
		},
	);

	it('does not expose internal server error messages or exception details', () => {
		const result = formatGraphQLError({
			message: 'MongoServerError: password hash at C:\\private\\auth.ts',
			extensions: { code: 'INTERNAL_SERVER_ERROR', stacktrace: ['secret stack'] },
		});
		expect(result).toEqual({ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } });
	});
});
