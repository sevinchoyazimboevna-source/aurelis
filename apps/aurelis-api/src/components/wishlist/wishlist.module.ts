import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import WishlistItemSchema from '../../libs/schemas/WishlistItem.model';
import YachtSchema from '../../libs/schemas/Yacht.model';
import { AuthModule } from '../auth/auth.module';
import { WishlistResolver } from './wishlist.resolver';
import { WishlistService } from './wishlist.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'WishlistItem', schema: WishlistItemSchema },
			{ name: 'Yacht', schema: YachtSchema },
		]),
		AuthModule,
	],
	providers: [WishlistResolver, WishlistService],
	exports: [WishlistService],
})
export class WishlistModule {}
