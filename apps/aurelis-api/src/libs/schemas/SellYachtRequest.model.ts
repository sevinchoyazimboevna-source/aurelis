import { Schema } from 'mongoose';
import { SellYachtRequestStatus } from '../enums/sell-yacht-request.enum';
import { validSellYachtBuildYear } from '../validators/sell-yacht-request';

const positive = (value: number) => Number.isFinite(value) && value > 0;
const SellYachtRequestSchema = new Schema(
	{
		status: {
			type: String,
			enum: Object.values(SellYachtRequestStatus),
			default: SellYachtRequestStatus.NEW,
			required: true,
		},
		memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
		ownerName: { type: String, required: true, trim: true, maxlength: 120 },
		email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
		phone: { type: String, required: true, trim: true, maxlength: 40, match: /\d/ },
		yachtName: { type: String, required: true, trim: true, maxlength: 120 },
		builder: { type: String, required: true, trim: true, maxlength: 120 },
		model: { type: String, trim: true, minlength: 1, maxlength: 120 },
		yearBuilt: {
			type: Number,
			required: true,
			validate: { validator: (value: unknown) => validSellYachtBuildYear(value), message: 'Invalid build year' },
		},
		lengthM: { type: Number, required: true, validate: { validator: positive, message: 'Length must be positive' } },
		location: { type: String, required: true, trim: true, maxlength: 240 },
		country: { type: String, required: true, trim: true, maxlength: 120 },
		askingPrice: { type: Number, validate: { validator: positive, message: 'Asking price must be positive' } },
		currency: {
			type: String,
			trim: true,
			uppercase: true,
			match: /^[A-Z]{3}$/,
			required: function (this: { askingPrice?: number }) {
				return this.askingPrice !== undefined;
			},
		},
		description: { type: String, trim: true, maxlength: 4000 },
	},
	{ timestamps: true, collection: 'sellYachtRequests' },
);

// Unfiltered newest-first and status-based staff queues; no speculative PII indexes.
SellYachtRequestSchema.index({ createdAt: -1, _id: -1 });
SellYachtRequestSchema.index({ status: 1, createdAt: -1, _id: -1 });

export default SellYachtRequestSchema;
