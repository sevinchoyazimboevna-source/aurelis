import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { AppLanguage, MemberRole, MemberStatus } from '../enums/account.enum';

/** ER collection: members. String IDs use UUIDs. */
export const MemberRecordSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		name: { type: String, required: true },
		nameKey: { type: String, required: true },
		fullName: { type: String },
		phone: { type: String },
		email: { type: String },
		passwordHash: { type: String, select: false },
		avatarUrl: { type: String },
		role: {
			type: String,
			required: true,
			enum: Object.values(MemberRole),
			default: MemberRole.USER,
		},
		status: {
			type: String,
			required: true,
			enum: Object.values(MemberStatus),
			default: MemberStatus.ACTIVE,
		},
		preferredLanguage: {
			type: String,
			required: true,
			enum: Object.values(AppLanguage),
			default: AppLanguage.EN,
		},
		phoneVerifiedAt: { type: Date },
		emailVerifiedAt: { type: Date },
		lastLoginAt: { type: Date },
	},
	{ timestamps: true, collection: 'members' },
);
MemberRecordSchema.index({ nameKey: 1 }, { unique: true });
MemberRecordSchema.index(
	{ email: 1 },
	{ unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

export default MemberRecordSchema;
