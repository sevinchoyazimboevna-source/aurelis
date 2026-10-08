import { Schema } from 'mongoose';
import { InquiryStatus, InquiryType } from '../enums/inquiry.enum';

const YachtInquirySchema = new Schema(
	{
		type: { type: String, enum: Object.values(InquiryType), required: true },
		status: { type: String, enum: Object.values(InquiryStatus), default: InquiryStatus.NEW },
		yachtId: { type: Schema.Types.ObjectId, ref: 'Yacht', required: true },
		memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, lowercase: true, trim: true },
		phone: { type: String, trim: true },
		message: { type: String, required: true, trim: true },
		startDate: { type: Date },
		endDate: { type: Date },
		guestCount: {
			type: Number,
			min: 1,
			validate: (count: number | null | undefined) => count == null || Number.isInteger(count),
		},
	},
	{ timestamps: true, collection: 'yachtInquiries' },
);

YachtInquirySchema.index({ status: 1, createdAt: -1 });
YachtInquirySchema.index({ yachtId: 1, createdAt: -1 });
// Discriminator/status filtering with stable chronological admin browsing.
YachtInquirySchema.index({ type: 1, status: 1, createdAt: -1, _id: -1 });

export default YachtInquirySchema;
