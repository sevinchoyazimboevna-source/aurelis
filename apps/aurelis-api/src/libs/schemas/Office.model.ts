import { Schema } from 'mongoose';
import { isEmail } from 'class-validator';
import { DayOfWeek, OfficeStatus } from '../enums/office.enum';
import { validOfficeBusinessHours, validOfficeTimezone } from '../validators/office-business-hours';
const BusinessHoursSchema = new Schema(
	{
		day: { type: String, required: true, enum: Object.values(DayOfWeek) },
		openTime: { type: String },
		closeTime: { type: String },
		closed: { type: Boolean, default: false },
	},
	{ _id: false },
);
const OfficeSchema = new Schema(
	{
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		slug: { type: String, required: true, maxlength: 120, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
		status: { type: String, enum: Object.values(OfficeStatus), default: OfficeStatus.DRAFT },
		country: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		city: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		addressLine1: { type: String, required: true, trim: true, minlength: 1, maxlength: 240 },
		addressLine2: { type: String, trim: true, minlength: 1, maxlength: 240 },
		postalCode: { type: String, trim: true, minlength: 1, maxlength: 40 },
		phone: { type: String, trim: true, minlength: 1, maxlength: 80 },
		email: { type: String, trim: true, lowercase: true, validate: isEmail },
		timezone: { type: String, trim: true, validate: validOfficeTimezone },
		businessHours: { type: [BusinessHoursSchema], default: [], validate: validOfficeBusinessHours },
		shortDescription: String,
		description: String,
		heroImage: { type: String, trim: true },
		images: { type: [String], default: [] },
		featured: { type: Boolean, default: false },
		sortOrder: { type: Number, default: 0, min: 0, validate: Number.isInteger },
	},
	{ timestamps: true, collection: 'offices' },
);
OfficeSchema.index({ slug: 1 }, { unique: true });
OfficeSchema.index({ status: 1, featured: -1, sortOrder: 1, name: 1, _id: 1 });
OfficeSchema.index({ status: 1, sortOrder: 1, name: 1, _id: 1 });
export default OfficeSchema;
