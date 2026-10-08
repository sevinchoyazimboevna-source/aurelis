import { Schema, Types } from 'mongoose';
import type { WishlistItem } from '../dto/wishlist/wishlist';

export interface WishlistItemRecord extends WishlistItem {
	memberId: Types.ObjectId;
}

const WishlistItemSchema = new Schema<WishlistItemRecord>(
	{
		memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
		yachtId: { type: Schema.Types.ObjectId, ref: 'Yacht', required: true },
	},
	{ timestamps: true, collection: 'wishlistItems' },
);

WishlistItemSchema.index({ memberId: 1, yachtId: 1 }, { unique: true });
WishlistItemSchema.index({ memberId: 1, createdAt: -1, _id: -1 });

export default WishlistItemSchema;
