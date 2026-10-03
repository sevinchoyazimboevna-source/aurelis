import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BrokerModule } from './broker/broker.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { StaffAuthModule } from './staff-auth/staff-auth.module';
import { YachtModule } from './yacht/yacht.module';

@Module({
	imports: [AuthModule, StaffAuthModule, BrokerModule, YachtModule, InquiryModule],
})
export class ComponentsModule {}
