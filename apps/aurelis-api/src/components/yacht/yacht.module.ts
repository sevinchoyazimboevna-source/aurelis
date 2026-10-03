import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import YachtSchema from '../../libs/schemas/Yacht.model';
import { AuthModule } from '../auth/auth.module';
import { BrokerModule } from '../broker/broker.module';
import { YachtResolver } from './yacht.resolver';
import { YachtService } from './yacht.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Yacht', schema: YachtSchema }]), AuthModule, BrokerModule],
	providers: [YachtResolver, YachtService],
	exports: [YachtService],
})
export class YachtModule {}
