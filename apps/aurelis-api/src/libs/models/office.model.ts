import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { ContentStatus } from '../enums/yacht.enum';

/** ER collection: offices. String IDs use UUIDs. */
export const OfficeSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		name: { type: String, required: true },
		slug: { type: String, required: true },
		region: { type: String, required: true },
		country: { type: String, required: true },
		city: { type: String, required: true },
		address: { type: String, required: true },
		latitude: { type: Number, required: true, min: -90, max: 90 },
		longitude: { type: Number, required: true, min: -180, max: 180 },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		timezone: { type: String, required: true },
		coverImage: { type: String, required: true },
		description: { type: String },
		status: {
			type: String,
			required: true,
			enum: Object.values(ContentStatus),
			default: ContentStatus.HIDDEN,
		},
	},
	{ timestamps: true, collection: 'offices' },
);

OfficeSchema.index({ slug: 1 }, { unique: true });

export default OfficeSchema;
