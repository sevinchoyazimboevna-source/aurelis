import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

@Module({
	imports: [ConfigModule.forRoot()],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
