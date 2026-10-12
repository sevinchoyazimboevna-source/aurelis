import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

@Schema({
	collection: 'wishlists',
	timestamps: true,
})
export class Wishlist {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Member',
	})
	memberId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Yacht',
	})
	yachtId!: Types.ObjectId;

	createdAt!: Date;
	updatedAt!: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

WishlistSchema.index(
	{ memberId: 1, yachtId: 1 },
	{
		unique: true,
		name: 'wishlist_member_yacht_unique',
	},
);

WishlistSchema.index(
	{ memberId: 1, createdAt: -1 },
	{ name: 'wishlist_member_created_at_idx' },
);

export default WishlistSchema;
