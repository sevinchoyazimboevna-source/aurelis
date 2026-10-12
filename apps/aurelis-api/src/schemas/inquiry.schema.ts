import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AppLanguage } from '../libs/enums/account.enum';
import {
	InquirySource,
	InquiryStatus,
	InquiryType,
	PreferredContact,
} from '../libs/enums/inquiry.enum';

export type InquiryDocument = HydratedDocument<Inquiry>;

@Schema({
	_id: false,
})
export class InquiryCharterDetails {
	@Prop({ type: Date })
	startDate?: Date;

	@Prop({ type: Date })
	endDate?: Date;

	@Prop({
		type: Number,
		min: 1,
	})
	guestCount?: number;

	@Prop({
		type: Types.ObjectId,
		ref: 'Destination',
	})
	destinationId?: Types.ObjectId;
}

@Schema({
	_id: false,
})
export class InquirySaleDetails {
	@Prop({
		type: String,
		trim: true,
	})
	yachtName?: string;

	@Prop({
		type: String,
		trim: true,
	})
	builder?: string;

	@Prop({
		type: Number,
		min: 1800,
		max: 3000,
	})
	buildYear?: number;

	@Prop({
		type: Number,
		min: 0,
	})
	lengthM?: number;
}

const InquiryCharterDetailsSchema = SchemaFactory.createForClass(InquiryCharterDetails);
const InquirySaleDetailsSchema = SchemaFactory.createForClass(InquirySaleDetails);

@Schema({
	collection: 'inquiries',
	timestamps: true,
})
export class Inquiry {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'Member',
	})
	memberId?: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(InquiryType),
		required: true,
	})
	type!: InquiryType;

	@Prop({
		type: String,
		enum: Object.values(InquirySource),
		required: true,
	})
	source!: InquirySource;

	@Prop({
		type: Types.ObjectId,
		ref: 'YachtListing',
	})
	listingId?: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'Office',
	})
	officeId?: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'TeamMember',
	})
	recipientStaffId?: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'TeamMember',
	})
	assignedStaffId?: Types.ObjectId;

	@Prop({
		type: String,
		trim: true,
	})
	title?: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	firstName!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	lastName!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
		lowercase: true,
	})
	email!: string;

	@Prop({
		type: String,
		trim: true,
	})
	phone?: string;

	@Prop({
		type: String,
		enum: Object.values(PreferredContact),
	})
	preferredContact?: PreferredContact;

	@Prop({
		type: String,
		enum: Object.values(AppLanguage),
		default: AppLanguage.EN,
	})
	preferredLanguage!: AppLanguage;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	message!: string;

	@Prop({
		type: InquiryCharterDetailsSchema,
	})
	charterDetails?: InquiryCharterDetails;

	@Prop({
		type: InquirySaleDetailsSchema,
	})
	saleDetails?: InquirySaleDetails;

	@Prop({
		type: Date,
		required: true,
	})
	consentAt!: Date;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	privacyPolicyVersion!: string;

	@Prop({
		type: String,
		enum: Object.values(InquiryStatus),
		required: true,
		default: InquiryStatus.NEW,
	})
	status!: InquiryStatus;

	createdAt!: Date;
	updatedAt!: Date;
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry);

InquirySchema.pre('validate', function (this: any) {
	if (
		this.charterDetails &&
		this.charterDetails.guestCount != null &&
		this.charterDetails.guestCount <= 0
	) {
		this.invalidate('charterDetails.guestCount', 'guestCount must be positive.');
	}

	if (
		this.saleDetails &&
		this.saleDetails.lengthM != null &&
		this.saleDetails.lengthM <= 0
	) {
		this.invalidate('saleDetails.lengthM', 'lengthM must be positive.');
	}

	if (
		this.charterDetails &&
		this.charterDetails.startDate &&
		this.charterDetails.endDate &&
		new Date(this.charterDetails.endDate).getTime() <=
			new Date(this.charterDetails.startDate).getTime()
	) {
		this.invalidate('charterDetails.endDate', 'endDate must be after startDate.');
	}
});

InquirySchema.index(
	{ memberId: 1, createdAt: -1 },
	{ name: 'inquiry_member_created_at_idx' },
);

InquirySchema.index(
	{ assignedStaffId: 1, status: 1, createdAt: -1 },
	{ name: 'inquiry_assigned_status_created_at_idx' },
);

export default InquirySchema;
