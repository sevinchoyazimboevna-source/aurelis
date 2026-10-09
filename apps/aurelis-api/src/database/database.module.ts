import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => {
				const uri = process.env.MONGODB_URI;
				if (!uri) throw new Error('MONGODB_URI must be configured');
				return { uri };
			},
		}),
	],
	exports: [],
})
export class DatabaseModule {}
