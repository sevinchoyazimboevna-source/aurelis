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
	[AuthErrorCode.EMAIL_ALREADY_EXISTS]: {
		status: HttpStatus.CONFLICT,
		message: 'An account with this email already exists.',
	},
	[AuthErrorCode.PASSWORD_MISMATCH]: { status: HttpStatus.BAD_REQUEST, message: 'Passwords do not match.' },
	[AuthErrorCode.INVALID_EMAIL]: { status: HttpStatus.BAD_REQUEST, message: 'Enter a valid email address.' },
	[AuthErrorCode.ACCOUNT_BLOCKED]: { status: HttpStatus.UNAUTHORIZED, message: 'This account has been blocked.' },
	[AuthErrorCode.ACCOUNT_DELETED]: { status: HttpStatus.UNAUTHORIZED, message: 'This account is no longer available.' },
	[AuthErrorCode.UNAUTHENTICATED]: { status: HttpStatus.UNAUTHORIZED, message: 'Authentication is required.' },
	[AuthErrorCode.INVALID_TOKEN]: {
		status: HttpStatus.UNAUTHORIZED,
		message: 'Authentication token is invalid or expired.',
	},
	[AuthErrorCode.FORBIDDEN]: {
		status: HttpStatus.FORBIDDEN,
		message: 'You do not have permission to perform this action.',
	},
	[AuthErrorCode.GOOGLE_INVALID]: { status: HttpStatus.UNAUTHORIZED, message: 'Google authentication failed.' },
	[AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT]: {
		status: HttpStatus.CONFLICT,
		message: 'This Google account cannot be linked to the existing account automatically.',
	},
	[AuthErrorCode.CONFIGURATION_ERROR]: {
		status: HttpStatus.INTERNAL_SERVER_ERROR,
		message: 'Authentication service is temporarily unavailable.',
	},
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

function errorRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function formatGraphQLError(
	error: unknown,
	rawError?: unknown,
): { message: string; extensions: Record<string, unknown> } {
	const formatted = errorRecord(error);
	const extensions = errorRecord(formatted.extensions);
	const source = errorRecord(rawError ?? error);
	const original = errorRecord(source.originalError ?? formatted.originalError ?? extensions.originalError ?? source);
	let response: Record<string, unknown>;
	try {
		response = errorRecord(
			typeof original.getResponse === 'function'
				? (original.getResponse as () => unknown).call(original)
				: original.response,
		);
	} catch {
		response = {};
	}
	const authCode =
		response.authErrorCode ??
		errorRecord(extensions.response).authErrorCode ??
		original.authErrorCode ??
		extensions.authErrorCode;
	const knownAuthCode = Object.values(AuthErrorCode).find((value) => value === authCode);
	if (knownAuthCode) {
		return { message: definitions[knownAuthCode].message, extensions: { code: knownAuthCode } };
	}

	const code = typeof extensions.code === 'string' ? extensions.code : 'INTERNAL_SERVER_ERROR';
	// GraphQL variable-coercion errors can echo entire credential/contact input values.
	if (code === 'BAD_USER_INPUT' && typeof formatted.message === 'string' && /^Variable ["$]/.test(formatted.message)) {
		return { message: 'Invalid request input.', extensions: { code } };
	}
	if (code === 'RATE_LIMITED' || code === 'RATE_LIMIT_UNAVAILABLE') {
		return {
			message: safeMessage(formatted.message) ?? 'Request failed',
			extensions: { code, retryAfterSeconds: extensions.retryAfterSeconds },
		};
	}
	const statusCode = response.statusCode;
	const internal = code === 'INTERNAL_SERVER_ERROR' || (typeof statusCode === 'number' && statusCode >= 500);
	const message = internal
		? 'Internal server error'
		: (safeMessage(response.message) ?? safeMessage(formatted.message) ?? 'Request failed');
	return { message, extensions: { code } };
}

function safeMessage(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join(', ');
	return undefined;
}
