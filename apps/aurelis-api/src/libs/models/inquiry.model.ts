import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import {
	InquiryType,
	InquirySource,
	InquiryStatus,
	PreferredContact,
} from '../enums/inquiry.enum';

/** ER collection: inquiries. String IDs use UUIDs. */
export const InquirySchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		memberId: { type: String, ref: 'MemberRecord', index: true },
		type: { type: String, required: true, enum: Object.values(InquiryType) },
		source: { type: String, required: true, enum: Object.values(InquirySource) },
		listingId: { type: String, ref: 'YachtListing', index: true },
		officeId: { type: String, ref: 'Office', index: true },
		recipientStaffId: { type: String, ref: 'TeamMember', index: true },
		assignedStaffId: { type: String, ref: 'TeamMember', index: true },
		title: { type: String },
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, required: true },
		phone: { type: String },
		preferredContact: { type: String, enum: Object.values(PreferredContact) },
		preferredLanguage: { type: String, default: 'en' },
		message: { type: String, required: true },
		charterDetails: { type: Schema.Types.Mixed },
		saleDetails: { type: Schema.Types.Mixed },
		consentAt: { type: Date, required: true },
		privacyPolicyVersion: { type: String, required: true },
		status: {
			type: String,
			required: true,
			enum: Object.values(InquiryStatus),
			default: InquiryStatus.NEW,
		},
	},
	{ timestamps: true, collection: 'inquiries' },
);
InquirySchema.index({ status: 1, createdAt: -1 });

export default InquirySchema;
