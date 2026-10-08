import { Schema } from 'mongoose';
import { YachtListingMode, YachtStatus } from '../enums/yacht.enum';

const YachtSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		builder: { type: String, trim: true },
		model: { type: String, trim: true },
		yearBuilt: {
			type: Number,
			min: 1800,
			validate: {
				validator: (year: number) => Number.isInteger(year) && year <= new Date().getFullYear(),
				message: 'Invalid build year',
			},
		},
		lengthM: {
			type: Number,
			validate: {
				validator: (value: number) => Number.isFinite(value) && value > 0,
				message: 'Dimension must be positive',
			},
		},
		beamM: {
			type: Number,
			validate: {
				validator: (value: number) => Number.isFinite(value) && value > 0,
				message: 'Dimension must be positive',
			},
		},
		draftM: {
			type: Number,
			validate: {
				validator: (value: number) => Number.isFinite(value) && value > 0,
				message: 'Dimension must be positive',
			},
		},
		cabins: { type: Number, min: 0, validate: Number.isInteger },
		guests: { type: Number, min: 0, validate: Number.isInteger },
		crew: { type: Number, min: 0, validate: Number.isInteger },
		location: { type: String, required: true, trim: true },
		country: { type: String, required: true, trim: true },
		destinationIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Destination' }], default: [] },
		description: { type: String },
		images: { type: [String], default: [] },
		listingModes: {
			type: [String],
			enum: Object.values(YachtListingMode),
			required: true,
			validate: { validator: (modes: string[]) => modes.length > 0, message: 'At least one listing mode is required' },
		},
		salePrice: { type: Number, min: 0 },
		saleCurrency: { type: String, uppercase: true, trim: true },
		charterPrice: { type: Number, min: 0 },
		charterCurrency: { type: String, uppercase: true, trim: true },
		charterRatePeriod: { type: String, trim: true },
		viewsCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
		likesCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
		featured: { type: Boolean, default: false },
		status: { type: String, enum: Object.values(YachtStatus), default: YachtStatus.DRAFT },
		brokerId: { type: Schema.Types.ObjectId, ref: 'BrokerProfile', required: true },
	},
	{ timestamps: true, collection: 'yachts' },
);

YachtSchema.index({ status: 1, listingModes: 1, featured: -1, createdAt: -1 });
YachtSchema.index({ builder: 1, model: 1, location: 1, country: 1 });
YachtSchema.index({ status: 1, destinationIds: 1, createdAt: -1 });

export default YachtSchema;
