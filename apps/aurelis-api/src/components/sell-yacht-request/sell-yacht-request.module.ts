import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { OptionalInquiryAuthGuard } from '../inquiry/optional-inquiry-auth.guard';
import SellYachtRequestSchema from '../../libs/schemas/SellYachtRequest.model';
import { SellYachtRequestResolver } from './sell-yacht-request.resolver';
import { SellYachtRequestService } from './sell-yacht-request.service';

@Module({
	imports: [AuthModule, MongooseModule.forFeature([{ name: 'SellYachtRequest', schema: SellYachtRequestSchema }])],
	providers: [SellYachtRequestResolver, SellYachtRequestService, OptionalInquiryAuthGuard],
})
export class SellYachtRequestModule {}
