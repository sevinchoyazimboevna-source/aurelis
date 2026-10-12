import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { ContentStatus } from '../enums/yacht.enum';
import { Department } from '../enums/team-member.enum';

/** ER collection: teamMembers. String IDs use UUIDs. */
export const TeamMemberSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		officeId: { type: String, required: true, ref: 'Office', index: true },
		memberId: { type: String, ref: 'MemberRecord' },
		slug: { type: String, required: true },
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		jobTitle: { type: String, required: true },
		department: { type: String, required: true, enum: Object.values(Department) },
		photo: { type: String, required: true },
		bio: { type: String, required: true },
		languages: { type: [String], required: true, default: undefined },
		phone: { type: String },
		email: { type: String },
		sortOrder: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
			validate: Number.isInteger,
		},
		status: {
			type: String,
			required: true,
			enum: Object.values(ContentStatus),
			default: ContentStatus.HIDDEN,
		},
	},
	{ timestamps: true, collection: 'teamMembers' },
);

TeamMemberSchema.index({ slug: 1 }, { unique: true });
TeamMemberSchema.index(
	{ memberId: 1 },
	{ unique: true, partialFilterExpression: { memberId: { $type: 'string' } } },
);

export default TeamMemberSchema;
