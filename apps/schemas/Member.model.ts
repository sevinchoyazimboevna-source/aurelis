import { Schema } from 'mongoose';
import { MemberStatus, MemberType } from 'apps/aurelis-api/src/libs/enums/member.enum';

const MemberSchema = new Schema(
	{
		memberType: { type: String, enum: MemberType, default: MemberType.ADMIN },
		memberStatus: { type: String, enum: MemberStatus, default: MemberStatus.ACTIVE },
		memberPhone: { type: String, unique: true, required: true },
		memberNick: { type: String, unique: true, required: true },
		memberPassword: { type: String, select: false, required: true },
	},
	{ timestamps: true, collection: 'members' },
);

export default MemberSchema;
