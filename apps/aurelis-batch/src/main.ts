import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch.module';

async function bootstrap() {
	const app = await NestFactory.create(BatchModule);
	await app.listen(app.get(ConfigService).getOrThrow<number>('PORT_BATCH'));
}
bootstrap();
