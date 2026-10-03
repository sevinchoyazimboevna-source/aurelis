import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsDate,
	IsEmail,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator';
import { InquiryStatus, InquiryType } from '../../enums/inquiry.enum';

@InputType()
export class CreateYachtInquiryInput {
	@Field(() => InquiryType)
	@IsEnum(InquiryType)
	type: InquiryType;

	@Field(() => ID)
	@IsMongoId()
	yachtId: string;

	@Field()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	name: string;

	@Field()
	@IsEmail()
	@MaxLength(254)
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string;

	@Field()
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
