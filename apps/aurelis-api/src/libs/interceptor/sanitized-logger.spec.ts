import { ConsoleLogger, LoggerService } from '@nestjs/common';
import { SanitizedLogger } from './sanitized-logger';

describe('Bootstrap error logging', () => {
	it('drops raw database errors, credentials, PII, private bodies and stacks', () => {
		const environment = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const logged = jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined);
		try {
			const logger: LoggerService = new SanitizedLogger();
			for (const value of [
				'Mongo duplicate email private@example.com',
				'redis://user:secret@host',
				'Bearer private-token',
				'private message body',
				new Error('C:/private/file.ts password'),
				{ password: 'secret' },
			])
				logger.error(value, 'private stack', 'sensitive context');
			expect(logged).toHaveBeenCalledTimes(6);
			for (const call of logged.mock.calls) expect(call).toEqual(['Backend operation failed']);
			logger.error('Authentication configuration missing: JWT_SECRET');
			expect(logged).toHaveBeenLastCalledWith('Authentication configuration missing: JWT_SECRET');
		} finally {
			process.env.NODE_ENV = environment;
			logged.mockRestore();
		}
	});

	it('retains the development error and stack while redacting credentials and contacts', () => {
		const environment = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		const logged = jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined);
		try {
			new SanitizedLogger().error(
				'Connection refused mongodb://user:password@host/db for private@example.com Bearer private-token',
				'Error: password="private-password"\n    at bootstrap (main.ts:10:5)',
			);
			expect(logged).toHaveBeenCalledWith(
				'Connection refused [REDACTED URI] for [REDACTED EMAIL] Bearer [REDACTED]',
				'Error: password=[REDACTED]\n    at bootstrap (main.ts:10:5)',
			);
		} finally {
			process.env.NODE_ENV = environment;
			logged.mockRestore();
		}
	});

	it('handles Error instances and drops arbitrary exception objects in development', () => {
		const environment = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		const logged = jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined);
		try {
			const error = new Error('MONGODB_URI must be configured');
			new SanitizedLogger().error(error);
			expect(logged).toHaveBeenLastCalledWith(error.message, error.stack);
			new SanitizedLogger().error({ password: 'secret' });
			expect(logged).toHaveBeenLastCalledWith('Backend operation failed', undefined);
		} finally {
			process.env.NODE_ENV = environment;
			logged.mockRestore();
		}
	});
});
