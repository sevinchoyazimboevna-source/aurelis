import { validateEnvironment } from './environment';

describe('API environment validation', () => {
	const valid = { MONGODB_URI: 'mongodb://127.0.0.1:27017/aurelis', JWT_SECRET: 'test-secret' };
	it('accepts required configuration without requiring Google or overriding values', () => {
		expect(validateEnvironment(valid)).toBe(valid);
	});
	it('explains obsolete environment names without reflecting credentials', () => {
		expect(() => validateEnvironment({ MONGO_DEV: 'private-uri', SECRET_TOKEN: 'private-secret' })).toThrow(
			'MONGODB_URI is required',
		);
		try {
			validateEnvironment({ MONGO_DEV: 'private-uri', SECRET_TOKEN: 'private-secret' });
		} catch (error) {
			expect(String(error)).toContain('JWT_SECRET is required');
			expect(String(error)).not.toMatch(/private-uri|private-secret/);
		}
	});
	it.each(['https://private:secret@host', 'private-uri', ''])(
		'rejects invalid MongoDB configuration safely',
		(MONGODB_URI) => {
			expect(() => validateEnvironment({ ...valid, MONGODB_URI })).toThrow('MONGODB_URI');
		},
	);
	it.each(['redis://localhost:6379', 'rediss://user:password@host:6380/2'])(
		'accepts supported Redis URLs',
		(REDIS_URL) => {
			expect(() => validateEnvironment({ ...valid, REDIS_URL })).not.toThrow();
		},
	);
	it.each(['http://host', 'redis://', 'redis://host/-1', 'redis://host/not-a-db', ''])(
		'rejects invalid Redis URLs',
		(REDIS_URL) => {
			expect(() => validateEnvironment({ ...valid, REDIS_URL })).toThrow('REDIS_URL');
		},
	);
	it.each(['0', '65536', '3000abc', ''])('rejects invalid ports', (AURELIS_API_PORT) => {
		expect(() => validateEnvironment({ ...valid, AURELIS_API_PORT })).toThrow('AURELIS_API_PORT');
	});
	it.each(['REDIS_URL', 'AURELIS_API_PORT'])('rejects nonprimitive %s values without serialization', (key) => {
		expect(() => validateEnvironment({ ...valid, [key]: { password: 'private-secret' } })).toThrow(key);
	});
});
