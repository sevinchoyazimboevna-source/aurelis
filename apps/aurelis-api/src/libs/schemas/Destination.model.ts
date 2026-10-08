import { Schema } from 'mongoose';
import { DestinationStatus, DestinationType } from '../enums/destination.enum';

const DestinationSchema = new Schema(
	{
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		slug: { type: String, required: true, maxlength: 120, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
		type: { type: String, required: true, enum: Object.values(DestinationType) },
		status: { type: String, enum: Object.values(DestinationStatus), default: DestinationStatus.DRAFT },
		parentId: { type: Schema.Types.ObjectId, ref: 'Destination', default: null },
		country: { type: String, trim: true },
		region: { type: String, trim: true },
		shortDescription: String,
		description: String,
		heroImage: { type: String, trim: true },
		images: { type: [String], default: [] },
		featured: { type: Boolean, default: false },
		sortOrder: { type: Number, default: 0, min: 0, validate: Number.isInteger },
	},
	{ timestamps: true, collection: 'destinations' },
);

DestinationSchema.index({ slug: 1 }, { unique: true });
DestinationSchema.index({ status: 1, parentId: 1, sortOrder: 1, name: 1, _id: 1 });
DestinationSchema.index({ status: 1, featured: -1, sortOrder: 1, name: 1, _id: 1 });
export default DestinationSchema;
