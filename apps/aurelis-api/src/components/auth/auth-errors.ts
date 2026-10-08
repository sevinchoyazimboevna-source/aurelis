import { HttpException, HttpStatus, Logger } from '@nestjs/common';

export enum AuthErrorCode {
	INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
	EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
	PASSWORD_MISMATCH = 'AUTH_PASSWORD_MISMATCH',
	INVALID_EMAIL = 'AUTH_INVALID_EMAIL',
	ACCOUNT_BLOCKED = 'AUTH_ACCOUNT_BLOCKED',
	ACCOUNT_DELETED = 'AUTH_ACCOUNT_DELETED',
	UNAUTHENTICATED = 'AUTH_UNAUTHENTICATED',
	INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
	FORBIDDEN = 'AUTH_FORBIDDEN',
	GOOGLE_INVALID = 'AUTH_GOOGLE_INVALID',
	GOOGLE_ACCOUNT_CONFLICT = 'AUTH_GOOGLE_ACCOUNT_CONFLICT',
	CONFIGURATION_ERROR = 'AUTH_CONFIGURATION_ERROR',
}

const definitions: Record<AuthErrorCode, { status: HttpStatus; message: string }> = {
	[AuthErrorCode.INVALID_CREDENTIALS]: { status: HttpStatus.UNAUTHORIZED, message: 'Invalid email or password.' },
	[AuthErrorCode.EMAIL_ALREADY_EXISTS]: { status: HttpStatus.CONFLICT, message: 'An account with this email already exists.' },
	[AuthErrorCode.PASSWORD_MISMATCH]: { status: HttpStatus.BAD_REQUEST, message: 'Passwords do not match.' },
	[AuthErrorCode.INVALID_EMAIL]: { status: HttpStatus.BAD_REQUEST, message: 'Enter a valid email address.' },
	[AuthErrorCode.ACCOUNT_BLOCKED]: { status: HttpStatus.UNAUTHORIZED, message: 'This account has been blocked.' },
	[AuthErrorCode.ACCOUNT_DELETED]: { status: HttpStatus.UNAUTHORIZED, message: 'This account is no longer available.' },
	[AuthErrorCode.UNAUTHENTICATED]: { status: HttpStatus.UNAUTHORIZED, message: 'Authentication is required.' },
	[AuthErrorCode.INVALID_TOKEN]: { status: HttpStatus.UNAUTHORIZED, message: 'Authentication token is invalid or expired.' },
	[AuthErrorCode.FORBIDDEN]: { status: HttpStatus.FORBIDDEN, message: 'You do not have permission to perform this action.' },
	[AuthErrorCode.GOOGLE_INVALID]: { status: HttpStatus.UNAUTHORIZED, message: 'Google authentication failed.' },
	[AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT]: { status: HttpStatus.CONFLICT, message: 'This Google account cannot be linked to the existing account automatically.' },
	[AuthErrorCode.CONFIGURATION_ERROR]: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Authentication service is temporarily unavailable.' },
};

export class AuthException extends HttpException {
	readonly authErrorCode: AuthErrorCode;

	constructor(code: AuthErrorCode) {
		const definition = definitions[code];
		super({ statusCode: definition.status, message: definition.message, authErrorCode: code }, definition.status);
		this.authErrorCode = code;
	}
}

export function authError(code: AuthErrorCode): AuthException {
	return new AuthException(code);
}

export function logAuthConfigurationIssue(variable: 'JWT_SECRET' | 'GOOGLE_CLIENT_ID'): void {
	new Logger('Authentication').error(`Authentication configuration missing: ${variable}`);
}

export function formatGraphQLError(error: any, rawError?: any): { message: string; extensions: Record<string, unknown> } {
	const source = rawError ?? error;
	const original = source?.originalError ?? error?.originalError ?? error?.extensions?.originalError ?? source;
	let response: any;
	try {
		response = typeof original?.getResponse === 'function' ? original.getResponse() : original?.response;
	} catch {
		response = undefined;
	}
	const authCode = response?.authErrorCode ?? error?.extensions?.response?.authErrorCode ?? original?.authErrorCode ?? error?.extensions?.authErrorCode;
	if (Object.values(AuthErrorCode).includes(authCode)) {
		return { message: definitions[authCode as AuthErrorCode].message, extensions: { code: authCode } };
	}

	const code = error?.extensions?.code ?? 'INTERNAL_SERVER_ERROR';
	if (code === 'RATE_LIMITED' || code === 'RATE_LIMIT_UNAVAILABLE') {
		return { message: error.message, extensions: { code, retryAfterSeconds: error.extensions.retryAfterSeconds } };
	}
	const statusCode = response?.statusCode;
	const internal = code === 'INTERNAL_SERVER_ERROR' || statusCode >= 500;
	const message = internal ? 'Internal server error' : safeMessage(response?.message) ?? safeMessage(error?.message) ?? 'Request failed';
	return { message, extensions: { code } };
}

function safeMessage(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join(', ');
	return undefined;
}
