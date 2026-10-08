import { Schema, Types } from 'mongoose';
import { MemberRole, MemberStatus } from '../enums/member.enum';

export interface MemberRecord {
	_id: Types.ObjectId;
	email: string;
	password?: string;
	googleId?: string | null;
	role: MemberRole;
	status: MemberStatus;
	createdAt: Date;
	updatedAt: Date;
}

const MemberSchema = new Schema<MemberRecord>(
	{
		email: { type: String, required: true, lowercase: true, trim: true },
		password: { type: String, select: false },
		googleId: { type: String },
		role: { type: String, enum: Object.values(MemberRole), default: MemberRole.USER, required: true },
		status: { type: String, enum: Object.values(MemberStatus), default: MemberStatus.ACTIVE, required: true },
	},
	{ timestamps: true, collection: 'members' },
);

MemberSchema.index({ email: 1 }, { unique: true, sparse: true });
MemberSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export default MemberSchema;
