import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptors/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe({ transform: true }));
	app.useGlobalInterceptors(new LoggingInterceptor());
	const config = app.get(ConfigService);
	app.enableCors({
		origin: config
			.getOrThrow<string>('CORS_ORIGINS')
			.split(',')
			.map((origin) => origin.trim()),
		credentials: true,
	});
	app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
	app.useWebSocketAdapter(new WsAdapter(app));
	app.use('/uploads', express.static('./uploads'));
	await app.listen(config.getOrThrow<number>('PORT_API'));
}
bootstrap();
