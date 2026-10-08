import { Field, ID, InputType, Int, OmitType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
	IsDate,
	IsEmail,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	MaxLength,
	Max,
	Min,
	MinLength,
} from 'class-validator';
import { InquiryStatus, InquiryType } from '../../enums/inquiry.enum';

const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

@InputType()
export class CreateYachtInquiryInput {
	@Field(() => InquiryType)
	@IsEnum(InquiryType)
	type: InquiryType;

	@Field(() => ID)
	@IsMongoId()
	yachtId: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	name: string;

	@Field()
	@Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsEmail()
	@MaxLength(254)
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@Trim()
	@IsString()
	@MaxLength(40)
	phone?: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(10)
	@MaxLength(4000)
	message: string;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	startDate?: Date;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	endDate?: Date;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	guestCount?: number;
}

@InputType()
export class CreateSalesInquiryInput extends OmitType(CreateYachtInquiryInput, [
	'type',
	'startDate',
	'endDate',
	'guestCount',
] as const) {}

@InputType()
export class CreateCharterInquiryInput extends OmitType(CreateYachtInquiryInput, [
	'type',
	'startDate',
	'endDate',
] as const) {
	@Field(() => Date)
	@Type(() => Date)
	@IsDate()
	startDate: Date;

	@Field(() => Date)
	@Type(() => Date)
	@IsDate()
	endDate: Date;
}

@InputType()
export class UpdateYachtInquiryInput {
	@Field(() => ID)
	@IsMongoId()
	_id: string;

	@Field(() => InquiryStatus)
	@IsEnum(InquiryStatus)
	status: InquiryStatus;
}

@InputType()
export class YachtInquiryAdminFilter {
	@Field(() => InquiryType, { nullable: true }) @IsOptional() @IsEnum(InquiryType) type?: InquiryType;
	@Field(() => ID, { nullable: true }) @IsOptional() @IsMongoId() yachtId?: string;
	@Field(() => ID, { nullable: true }) @IsOptional() @IsMongoId() memberId?: string;
	@Field({ nullable: true })
	@IsOptional()
	@Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsEmail()
	@MaxLength(254)
	email?: string;
	@Field(() => Date, { nullable: true }) @IsOptional() @Type(() => Date) @IsDate() createdFrom?: Date;
	@Field(() => Date, { nullable: true }) @IsOptional() @Type(() => Date) @IsDate() createdTo?: Date;
	@Field(() => InquiryStatus, { nullable: true })
	@IsOptional()
	@IsEnum(InquiryStatus)
	status?: InquiryStatus;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page = 1;

	@Field(() => Int, { nullable: true, defaultValue: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit = 20;
}

@InputType()
export class YachtInquiryCatalogInput extends YachtInquiryAdminFilter {
	@Field(() => Int, { nullable: true, defaultValue: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	limit = 20;
}
