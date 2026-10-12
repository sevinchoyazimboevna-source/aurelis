import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';

/** ER collection: wishlists. String IDs use UUIDs. */
export const WishlistSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		memberId: { type: String, required: true, ref: 'MemberRecord', index: true },
		yachtId: { type: String, required: true, ref: 'Yacht', index: true },
	},
	{ timestamps: true, collection: 'wishlists' },
);
WishlistSchema.index({ memberId: 1, yachtId: 1 }, { unique: true });

export default WishlistSchema;
