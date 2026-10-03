import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import BrokerProfileSchema from '../../libs/schemas/BrokerProfile.model';
import { AuthModule } from '../auth/auth.module';
import { BrokerResolver } from './broker.resolver';
import { BrokerService } from './broker.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'BrokerProfile', schema: BrokerProfileSchema }]), AuthModule],
	providers: [BrokerResolver, BrokerService],
	exports: [BrokerService],
})
export class BrokerModule {}
