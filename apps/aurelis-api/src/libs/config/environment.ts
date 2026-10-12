import { ConfigService } from '@nestjs/config';
export interface Environment {
	NODE_ENV: 'development' | 'test' | 'production';
	PORT_API: number;
	PORT_BATCH: number;
	MONGO_DEV: string;
	MONGO_PROD?: string;
	SECRET_TOKEN: string;
	JWT_EXPIRES_IN: string;
	CORS_ORIGINS: string;
}
/** Fail early with names only, never log configuration secrets. */
export function validateEnvironment(
	input: Record<string, unknown>,
): Record<string, unknown> & Environment {
	const env = { ...input };
	const nodeEnv = String(env.NODE_ENV ?? 'development');
	if (!['development', 'test', 'production'].includes(nodeEnv))
		throw new Error('Invalid NODE_ENV');
	function port(key: string, fallback: number): number {
		const value = Number(env[key] ?? fallback);
		if (!Number.isInteger(value) || value < 1 || value > 65535)
			throw new Error(`Invalid ${key}`);
		return value;
	}
	const mongoKey = nodeEnv === 'production' ? 'MONGO_PROD' : 'MONGO_DEV';
	const uri = env[mongoKey];
	if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\/\S+$/.test(uri))
		throw new Error(`Invalid or missing ${mongoKey}`);
	if (typeof env.SECRET_TOKEN !== 'string' || env.SECRET_TOKEN.trim().length < 32)
		throw new Error('SECRET_TOKEN must contain at least 32 characters');
	const expiresIn = String(env.JWT_EXPIRES_IN ?? '30d');
	if (!/^[1-9]\d*(s|m|h|d)$/.test(expiresIn))
		throw new Error('JWT_EXPIRES_IN must be a positive duration such as 30d');
	const origins = String(
		env.CORS_ORIGINS ?? 'http://localhost:3002,http://localhost:5173',
	);
	for (const origin of origins.split(',')) {
		let url: URL;
		try {
			url = new URL(origin.trim());
		} catch {
			throw new Error('Invalid CORS_ORIGINS');
		}
		if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin.trim())
			throw new Error('CORS_ORIGINS must contain comma-separated HTTP origins');
	}
	return {
		...env,
		NODE_ENV: nodeEnv as Environment['NODE_ENV'],
		PORT_API: port('PORT_API', 3000),
		PORT_BATCH: port('PORT_BATCH', 3001),
		MONGO_DEV: String(env.MONGO_DEV ?? ''),
		MONGO_PROD: env.MONGO_PROD as string | undefined,
		SECRET_TOKEN: env.SECRET_TOKEN,
		JWT_EXPIRES_IN: expiresIn,
		CORS_ORIGINS: origins,
	};
}
export function mongoUri(config: ConfigService): string {
	return config.getOrThrow<string>(
		config.get('NODE_ENV') === 'production' ? 'MONGO_PROD' : 'MONGO_DEV',
	);
}
