import { Schema } from 'mongoose';
import type { CrewProfile } from '../dto/crew/crew';
import { CrewRole, CrewStatus } from '../enums/crew.enum';

const CrewProfileSchema = new Schema<CrewProfile>(
	{
		memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
		role: { type: String, enum: Object.values(CrewRole), required: true },
		status: { type: String, enum: Object.values(CrewStatus), default: CrewStatus.DRAFT, required: true },
		firstName: { type: String, required: true, trim: true },
		lastName: { type: String, trim: true, minlength: 1 },
		displayName: { type: String, trim: true, minlength: 1 },
		nationality: { type: String, trim: true, minlength: 1 },
		location: { type: String, trim: true, minlength: 1 },
		bio: { type: String },
		experienceYears: { type: Number, min: 0, validate: Number.isInteger },
		languages: {
			type: [{ type: String, trim: true, required: true }],
			default: [],
			validate: {
				validator: (values: string[]) => new Set(values).size === values.length,
				message: 'Languages must be unique',
			},
		},
		profileImage: { type: String, trim: true, minlength: 1 },
		images: { type: [{ type: String, trim: true, required: true }], default: [] },
		featured: { type: Boolean, default: false },
	},
	{ timestamps: true, collection: 'crewProfiles' },
);

// Unlinked profiles do not participate in the one-profile-per-member constraint.
CrewProfileSchema.index(
	{ memberId: 1 },
	{
		unique: true,
		partialFilterExpression: { memberId: { $type: 'objectId' } },
		name: 'crew_member_unique',
	},
);
CrewProfileSchema.index({ status: 1, createdAt: -1, _id: -1 });
CrewProfileSchema.index({ status: 1, featured: 1, createdAt: -1, _id: -1 });

export default CrewProfileSchema;
