import { ConsoleLogger } from '@nestjs/common';

const SAFE_ERRORS = new Set([
	'Authentication token signing failed',
	'Authentication configuration missing: JWT_SECRET',
	'Authentication configuration missing: GOOGLE_CLIENT_ID',
]);

// Nest logs bootstrap/provider exceptions before GraphQL formatting. Production
// stays generic; development retains diagnostic strings, never exception objects.
export class SanitizedLogger extends ConsoleLogger {
	error(message: unknown, ...optionalParams: unknown[]): void {
		if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
			const detail = message instanceof Error ? message.message : message;
			const stack = message instanceof Error ? message.stack : optionalParams[0];
			super.error(
				typeof detail === 'string' ? redactDiagnostic(detail) : 'Backend operation failed',
				typeof stack === 'string' ? redactDiagnostic(stack) : undefined,
			);
			return;
		}
		super.error(typeof message === 'string' && SAFE_ERRORS.has(message) ? message : 'Backend operation failed');
	}
}

function redactDiagnostic(value: string): string {
	// Cover configured credentials even when the provider prints only a fragment.
	for (const [key, secret] of Object.entries(process.env)) {
		if (secret && /SECRET|TOKEN|PASSWORD|CREDENTIAL|(?:MONGO|REDIS).*URL|MONGODB_URI|MONGO_DEV|MONGO_PROD/i.test(key)) {
			value = value.split(secret).join('[REDACTED]');
			if (/^(?:mongodb(?:\+srv)?|rediss?):\/\//i.test(secret)) {
				try {
					const url = new URL(secret);
					for (const part of [url.username, url.password]) {
						if (part) value = value.split(decodeURIComponent(part)).join('[REDACTED]');
					}
				} catch {
					// Malformed URLs are still removed in full above.
				}
			}
		}
	}
	return value
		.replace(/(?:mongodb(?:\+srv)?|rediss?):\/\/[^\s"'<>]+/gi, '[REDACTED URI]')
		.replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
		.replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED TOKEN]')
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED EMAIL]')
		.replace(
			/((?:["']?)(?:password|confirmPassword|accessToken|credential|secret|phone|message|body)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi,
			'$1[REDACTED]',
		);
}
