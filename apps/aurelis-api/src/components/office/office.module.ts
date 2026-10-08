import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import OfficeSchema from '../../libs/schemas/Office.model';
import { AuthModule } from '../auth/auth.module';
import { OfficeResolver } from './office.resolver';
import { OfficeService } from './office.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Office', schema: OfficeSchema }]), AuthModule],
	providers: [OfficeResolver, OfficeService],
	exports: [OfficeService],
})
export class OfficeModule {}
