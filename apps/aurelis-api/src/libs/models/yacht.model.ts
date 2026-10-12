import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { YachtType, ContentStatus } from '../enums/yacht.enum';

/** ER collection: yachts. String IDs use UUIDs. */
export const YachtSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		name: { type: String, required: true },
		slug: { type: String, required: true },
		yachtType: { type: String, required: true, enum: Object.values(YachtType) },
		builder: { type: String },
		model: { type: String },
		buildYear: { type: Number, required: true, min: 0, validate: Number.isInteger },
		refitYear: { type: Number, min: 0, validate: Number.isInteger },
		lengthM: { type: Number, required: true, min: 0 },
		beamM: { type: Number, min: 0 },
		draftM: { type: Number, min: 0 },
		cruiseSpeedKnots: { type: Number, min: 0 },
		maxSpeedKnots: { type: Number, min: 0 },
		cabins: { type: Number, required: true, min: 0, validate: Number.isInteger },
		guestCapacity: { type: Number, required: true, min: 0, validate: Number.isInteger },
		crewCapacity: { type: Number, required: true, min: 0, validate: Number.isInteger },
		description: { type: String, required: true },
		amenities: { type: [String], default: undefined },
		images: { type: [String], required: true, default: undefined },
		videoUrl: { type: String },
		status: {
			type: String,
			required: true,
			enum: Object.values(ContentStatus),
			default: ContentStatus.HIDDEN,
		},
	},
	{ timestamps: true, collection: 'yachts' },
);

YachtSchema.index({ slug: 1 }, { unique: true });

export default YachtSchema;
