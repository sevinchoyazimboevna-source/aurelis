import { Field, InputType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEmail,
	IsEnum,
	IsDate,
	IsUUID,
} from 'class-validator';
import { InquiryType, InquirySource, PreferredContact } from '../../enums/inquiry.enum';
import { JsonValue } from '../../types/json.type';
import { JsonScalar } from '../../types/json.scalar';
import { IsJsonValue } from '../../types/json.validator';

@InputType()
export class CreateInquiryInput {
	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	memberId?: string;

	@IsDefined()
	@IsEnum(InquiryType)
	@Field(() => InquiryType)
	type!: InquiryType;

	@IsDefined()
	@IsEnum(InquirySource)
	@Field(() => InquirySource)
	source!: InquirySource;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	listingId?: string;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	officeId?: string;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	recipientStaffId?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	title?: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	firstName!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	lastName!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email!: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	phone?: string;

	@IsOptional()
	@IsEnum(PreferredContact)
	@Field(() => PreferredContact, { nullable: true })
	preferredContact?: PreferredContact;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	preferredLanguage?: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	message!: string;

	@IsOptional()
	@IsJsonValue()
	@Field(() => JsonScalar, { nullable: true })
	charterDetails?: JsonValue;

	@IsOptional()
	@IsJsonValue()
	@Field(() => JsonScalar, { nullable: true })
	saleDetails?: JsonValue;

	@IsDefined()
	@Type(() => Date)
	@IsDate()
	@Field(() => GraphQLISODateTime)
	consentAt!: Date;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	privacyPolicyVersion!: string;
}
