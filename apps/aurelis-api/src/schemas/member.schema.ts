import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
	AppLanguage,
	AuthProvider,
	MemberRole,
	MemberStatus,
} from '../libs/enums/account.enum';

export type MemberDocument = HydratedDocument<Member>;

export function normalizeMemberName(name: string): string {
	return name.normalize('NFKC').trim().toLowerCase();
}

@Schema({
	collection: 'members',
	timestamps: true,
})
export class Member {
	_id!: Types.ObjectId;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	name!: string;

	@Prop({
		type: String,
		required: true,
	})
	nameKey!: string;

	@Prop({
		type: String,
		trim: true,
	})
	fullName?: string;

	@Prop({
		type: String,
		trim: true,
		match: /^\+[1-9]\d{1,14}$/,
	})
	phone?: string;

	@Prop({
		type: String,
		trim: true,
		lowercase: true,
	})
	email?: string;

	@Prop({
		type: String,
		select: false,
	})
	passwordHash?: string;

	@Prop({
		type: String,
		trim: true,
	})
	avatarUrl?: string;

	@Prop({
		type: String,
		enum: Object.values(MemberRole),
		required: true,
		default: MemberRole.USER,
	})
	role!: MemberRole;

	@Prop({
		type: String,
		enum: Object.values(MemberStatus),
		required: true,
		default: MemberStatus.ACTIVE,
	})
	status!: MemberStatus;

	@Prop({
		type: String,
		enum: Object.values(AppLanguage),
		required: true,
		default: AppLanguage.EN,
	})
	preferredLanguage!: AppLanguage;

	@Prop({ type: Date })
	phoneVerifiedAt?: Date;

	@Prop({ type: Date })
	emailVerifiedAt?: Date;

	@Prop({ type: Date })
	lastLoginAt?: Date;

	createdAt!: Date;
	updatedAt!: Date;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

MemberSchema.index(
	{ nameKey: 1 },
	{
		unique: true,
		name: 'member_name_key_unique',
	},
);

MemberSchema.index(
	{ phone: 1 },
	{
		unique: true,
		partialFilterExpression: {
			phone: { $type: 'string', $gt: '' },
		},
		name: 'member_phone_unique',
	},
);

MemberSchema.index({ role: 1, status: 1 });

MemberSchema.pre('validate', function (this: any) {
	if (typeof this.name === 'string') {
		this.name = this.name.normalize('NFKC').trim();
		this.nameKey = normalizeMemberName(this.name);
	}
});

MemberSchema.set('toJSON', {
	transform: (_document, result) => {
		delete result.passwordHash;
		return result;
	},
});
