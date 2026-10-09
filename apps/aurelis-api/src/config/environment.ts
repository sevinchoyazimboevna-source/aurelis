// Validate names/formats without including configuration values in errors.
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
	const issues: string[] = [];
	const mongo = config.MONGODB_URI;
	if (typeof mongo !== 'string' || !mongo.trim()) {
		issues.push('MONGODB_URI is required (legacy MONGO_DEV/MONGO_PROD are not read; copy the intended URI explicitly)');
	} else if (!/^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(mongo)) {
		issues.push('MONGODB_URI must be a mongodb:// or mongodb+srv:// URI');
	}
	if (typeof config.JWT_SECRET !== 'string' || !config.JWT_SECRET.trim()) {
		issues.push('JWT_SECRET is required (legacy SECRET_TOKEN is not read)');
	}
	if (config.REDIS_URL !== undefined) {
		try {
			if (typeof config.REDIS_URL !== 'string') throw new Error();
			const redis = new URL(config.REDIS_URL);
			if (!['redis:', 'rediss:'].includes(redis.protocol) || !redis.hostname) throw new Error();
			if (redis.pathname && redis.pathname !== '/' && !/^\/\d+$/.test(redis.pathname)) throw new Error();
		} catch {
			issues.push('REDIS_URL must be a redis:// or rediss:// URI with an optional nonnegative database number');
		}
	}
	for (const key of ['AURELIS_API_PORT', 'PORT_API', 'AURELIS_BATCH_PORT', 'PORT_BATCH']) {
		const port = config[key];
		if (
			port !== undefined &&
			((typeof port !== 'string' && typeof port !== 'number') ||
				!/^\d+$/.test(String(port)) ||
				Number(port) < 1 ||
				Number(port) > 65535)
		) {
			issues.push(`${key} must be an integer between 1 and 65535`);
		}
	}
	if (issues.length) throw new Error(`Backend configuration invalid:\n${issues.join('\n')}`);
	return config;
}
