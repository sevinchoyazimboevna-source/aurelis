import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from 'apps/schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { StaffAuthResolver } from './staff-auth.resolver';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]), AuthModule],
	providers: [StaffAuthResolver],
})
export class StaffAuthModule {}
