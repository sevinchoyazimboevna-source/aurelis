import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { AuthProvider } from '../enums/account.enum';

/** ER collection: authIdentities. String IDs use UUIDs. */
export const AuthIdentitySchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		memberId: { type: String, required: true, ref: 'MemberRecord', index: true },
		provider: { type: String, required: true, enum: Object.values(AuthProvider) },
		providerUserId: { type: String, required: true },
	},
	{ timestamps: true, collection: 'authIdentities' },
);
AuthIdentitySchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

export default AuthIdentitySchema;
