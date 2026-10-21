import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptors/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { WsAdapter } from '@nestjs/platform-ws';
async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());
	app.enableCors({ origin: true, credentials: true });
	app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
	app.useWebSocketAdapter(new WsAdapter(app));
	app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
	await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
