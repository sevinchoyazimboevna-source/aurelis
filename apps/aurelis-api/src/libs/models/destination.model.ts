import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { ContentStatus } from '../enums/yacht.enum';

/** ER collection: destinations. String IDs use UUIDs. */
export const DestinationSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		name: { type: String, required: true },
		slug: { type: String, required: true },
		region: { type: String, required: true },
		country: { type: String, required: true },
		description: { type: String, required: true },
		heroImage: { type: String, required: true },
		gallery: { type: [String], default: undefined },
		status: {
			type: String,
			required: true,
			enum: Object.values(ContentStatus),
			default: ContentStatus.HIDDEN,
		},
	},
	{ timestamps: true, collection: 'destinations' },
);

DestinationSchema.index({ slug: 1 }, { unique: true });

export default DestinationSchema;
