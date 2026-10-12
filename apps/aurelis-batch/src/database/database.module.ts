import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoUri } from '../../../aurelis-api/src/libs/config/environment';
@Module({
	imports: [
		MongooseModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({ uri: mongoUri(config) }),
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule {}
