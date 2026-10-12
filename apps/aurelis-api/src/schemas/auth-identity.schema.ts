import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import { AuthProvider } from '../libs/enums/account.enum';
import { Member } from './member.schema';

export type AuthIdentityDocument = HydratedDocument<AuthIdentity>;

@Schema({
	collection: 'authIdentities',
	timestamps: true,
})
export class AuthIdentity {
	_id!: Types.ObjectId;

	@Prop({
		type: MongooseSchema.Types.ObjectId,
		ref: Member.name,
		required: true,
		immutable: true,
	})
	memberId!: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(AuthProvider),
		required: true,
		immutable: true,
	})
	provider!: AuthProvider;

	@Prop({
		type: String,
		required: true,
		immutable: true,
		trim: true,
		minlength: 1,
	})
	providerUserId!: string;

	createdAt!: Date;
	updatedAt!: Date;
}

export const AuthIdentitySchema = SchemaFactory.createForClass(AuthIdentity);

AuthIdentitySchema.index(
	{ provider: 1, providerUserId: 1 },
	{
		unique: true,
		name: 'auth_provider_identity_unique',
	},
);

AuthIdentitySchema.index({ memberId: 1 });
