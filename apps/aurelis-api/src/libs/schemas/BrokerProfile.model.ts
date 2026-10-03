import { Schema } from 'mongoose';

const BrokerProfileSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		title: { type: String, trim: true },
		email: { type: String, required: true, lowercase: true, trim: true },
		phone: { type: String, trim: true },
		image: { type: String },
		biography: { type: String },
		languages: { type: [String], default: [] },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true, collection: 'brokerProfiles' },
);
BrokerProfileSchema.index({ email: 1 }, { unique: true });

export default BrokerProfileSchema;
