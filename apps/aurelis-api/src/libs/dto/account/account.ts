import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { AppLanguage, MemberRole, MemberStatus } from '../../enums/account.enum';

@ObjectType('MemberRecord')
export class MemberRecord {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => String)
	name!: string;

	@Expose()
	@Field(() => String)
	nameKey!: string;

	@Expose()
	@Field(() => String, { nullable: true })
	fullName?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	phone?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	email?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	avatarUrl?: string;

	@Expose()
	@Field(() => MemberRole)
	role!: MemberRole;

	@Expose()
	@Field(() => MemberStatus)
	status!: MemberStatus;

	@Expose()
	@Field(() => AppLanguage)
	preferredLanguage!: AppLanguage;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	phoneVerifiedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	emailVerifiedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	lastLoginAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
