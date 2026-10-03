import { Schema } from 'mongoose';
import { YachtListingMode, YachtStatus } from '../enums/yacht.enum';

const YachtSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		builder: { type: String, required: true, trim: true },
		model: { type: String, trim: true },
		yearBuilt: { type: Number, required: true, min: 1800 },
		lengthM: { type: Number, required: true, min: 0 },
		beamM: { type: Number, min: 0 },
		draftM: { type: Number, min: 0 },
		cabins: { type: Number, min: 0 },
		guests: { type: Number, min: 0 },
		crew: { type: Number, min: 0 },
		location: { type: String, required: true, trim: true },
		country: { type: String, required: true, trim: true },
		description: { type: String },
		images: { type: [String], default: [] },
		listingModes: { type: [String], enum: Object.values(YachtListingMode), required: true },
		salePrice: { type: Number, min: 0 },
		saleCurrency: { type: String, uppercase: true, trim: true },
		charterRate: { type: Number, min: 0 },
		charterCurrency: { type: String, uppercase: true, trim: true },
		charterRatePeriod: { type: String, trim: true },
		featured: { type: Boolean, default: false },
		status: { type: String, enum: Object.values(YachtStatus), default: YachtStatus.DRAFT },
		brokerId: { type: Schema.Types.ObjectId, ref: 'BrokerProfile', required: true },
	},
	{ timestamps: true, collection: 'yachts' },
);

YachtSchema.index({ status: 1, listingModes: 1, featured: -1, createdAt: -1 });
YachtSchema.index({ builder: 1, model: 1, location: 1, country: 1 });

export default YachtSchema;
