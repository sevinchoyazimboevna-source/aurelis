import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import DestinationSchema from '../../libs/schemas/Destination.model';
import { AuthModule } from '../auth/auth.module';
import { DestinationResolver } from './destination.resolver';
import { DestinationService } from './destination.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Destination', schema: DestinationSchema }]), AuthModule],
	providers: [DestinationResolver, DestinationService],
	exports: [DestinationService],
})
export class DestinationModule {}
