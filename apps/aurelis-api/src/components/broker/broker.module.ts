import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../libs/schemas/Member.model';
import BrokerProfileSchema from '../../libs/schemas/BrokerProfile.model';
import { AuthModule } from '../auth/auth.module';
import { BrokerResolver } from './broker.resolver';
import { BrokerService } from './broker.service';
import { OfficeModule } from '../office/office.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'BrokerProfile', schema: BrokerProfileSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
		OfficeModule,
	],
	providers: [BrokerResolver, BrokerService],
	exports: [BrokerService],
})
export class BrokerModule {}
