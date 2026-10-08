import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import YachtInquirySchema from '../../libs/schemas/YachtInquiry.model';
import { AuthModule } from '../auth/auth.module';
import { YachtModule } from '../yacht/yacht.module';
import { InquiryResolver } from './inquiry.resolver';
import { InquiryService } from './inquiry.service';
import { OptionalInquiryAuthGuard } from './optional-inquiry-auth.guard';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'YachtInquiry', schema: YachtInquirySchema }]), AuthModule, YachtModule],
	providers: [InquiryResolver, InquiryService, OptionalInquiryAuthGuard],
})
export class InquiryModule {}
