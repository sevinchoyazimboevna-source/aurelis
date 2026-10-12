import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import YachtSchema from '../../schemas/yacht.schema';
import YachtListingSchema from '../../schemas/yacht-listing.schema';
import YachtDestinationSchema from '../../schemas/yacht-destination.schema';
import { YachtResolver } from './yacht.resolver';
import { YachtService } from './yacht.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Yacht', schema: YachtSchema },
			{ name: 'YachtListing', schema: YachtListingSchema },
			{ name: 'YachtDestination', schema: YachtDestinationSchema },
		]),
	],
	providers: [YachtResolver, YachtService],
	exports: [YachtService],
})
export class YachtModule {}
