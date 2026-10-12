import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import {
	InquiryType,
	InquirySource,
	InquiryStatus,
	PreferredContact,
} from '../../enums/inquiry.enum';
import { JsonValue } from '../../types/json.type';
import { JsonScalar } from '../../types/json.scalar';

@ObjectType('Inquiry')
export class Inquiry {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	memberId?: string;

	@Expose()
	@Field(() => InquiryType)
	type!: InquiryType;

	@Expose()
	@Field(() => InquirySource)
	source!: InquirySource;

	@Expose()
	@Field(() => ID, { nullable: true })
	listingId?: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	officeId?: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	recipientStaffId?: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	assignedStaffId?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	title?: string;

	@Expose()
	@Field(() => String)
	firstName!: string;

	@Expose()
	@Field(() => String)
	lastName!: string;

	@Expose()
	@Field(() => String)
	email!: string;

	@Expose()
	@Field(() => String, { nullable: true })
	phone?: string;

	@Expose()
	@Field(() => PreferredContact, { nullable: true })
	preferredContact?: PreferredContact;

	@Expose()
	@Field(() => String, { nullable: true })
	preferredLanguage?: string;

	@Expose()
	@Field(() => String)
	message!: string;

	@Expose()
	@Field(() => JsonScalar, { nullable: true })
	charterDetails?: JsonValue;

	@Expose()
	@Field(() => JsonScalar, { nullable: true })
	saleDetails?: JsonValue;

	@Expose()
	@Field(() => GraphQLISODateTime)
	consentAt!: Date;

	@Expose()
	@Field(() => String)
	privacyPolicyVersion!: string;

	@Expose()
	@Field(() => InquiryStatus)
	status!: InquiryStatus;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
