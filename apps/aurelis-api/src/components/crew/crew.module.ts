import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import CrewProfileSchema from '../../libs/schemas/CrewProfile.model';
import MemberSchema from '../../libs/schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { CrewResolver } from './crew.resolver';
import { CrewService } from './crew.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'CrewProfile', schema: CrewProfileSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
	],
	providers: [CrewResolver, CrewService],
	exports: [CrewService],
})
export class CrewModule {}
