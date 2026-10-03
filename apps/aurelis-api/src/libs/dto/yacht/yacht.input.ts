import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	ArrayNotEmpty,
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsNumber,
	IsOptional,
	IsString,
	Matches,
	Max,
	Min,
	MinLength,
} from 'class-validator';
import { YachtListingMode, YachtSortBy, YachtStatus } from '../../enums/yacht.enum';

@InputType({ isAbstract: true })
export class YachtFields {
	@Field()
	@IsString()
	@MinLength(2)
	name: string;

	@Field()
	@IsString()
	@MinLength(2)
	builder: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	model?: string;

	@Field(() => Int)
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	yearBuilt: number;

	@Field(() => Float)
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	lengthM: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	beamM?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	draftM?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	cabins?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	guests?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	crew?: number;

	@Field()
	@IsString()
	@MinLength(2)
	location: string;

	@Field()
	@IsString()
	@MinLength(2)
	country: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	description?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	images?: string[];

	@Field(() => [YachtListingMode])
	@IsArray()
	@ArrayNotEmpty()
	@ArrayUnique()
	@IsEnum(YachtListingMode, { each: true })
	listingModes: YachtListingMode[];

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	salePrice?: number;

	@Field({ nullable: true })
	@IsOptional()
	@Matches(/^[A-Z]{3}$/)
	saleCurrency?: string;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	charterRate?: number;

	@Field({ nullable: true })
	@IsOptional()
	@Matches(/^[A-Z]{3}$/)
	charterCurrency?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	charterRatePeriod?: string;

	@Field(() => Boolean, { nullable: true, defaultValue: false })
	@IsOptional()
	@IsBoolean()
	featured?: boolean;

	@Field(() => YachtStatus, { nullable: true })
	@IsOptional()
	@IsEnum(YachtStatus)
	status?: YachtStatus;

	@Field(() => ID)
	@IsMongoId()
	brokerId: string;
}

@InputType()
export class YachtInput extends YachtFields {}

@InputType()
export class YachtUpdateInput extends YachtFields {
	@Field(() => ID)
	@IsMongoId()
	_id: string;
}

@InputType()
export class YachtInquiryFilter {
	@Field(() => YachtListingMode, { nullable: true })
	@IsOptional()
	@IsEnum(YachtListingMode)
	mode?: YachtListingMode;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	text?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	location?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	country?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	minYear?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	maxYear?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	minLengthM?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	maxLengthM?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	minPrice?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	maxPrice?: number;

	@Field({ nullable: true })
	@IsOptional()
	@Matches(/^[A-Z]{3}$/)
	currency?: string;
}

@InputType()
export class YachtCatalogInput {
	@Field(() => YachtInquiryFilter, { nullable: true })
	@IsOptional()
	filter?: YachtInquiryFilter;

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
	@Max(100)
	limit = 20;

	@Field(() => YachtSortBy, { nullable: true, defaultValue: YachtSortBy.FEATURED })
	@IsOptional()
	@IsEnum(YachtSortBy)
	sortBy = YachtSortBy.FEATURED;

	@Field(() => Boolean, { nullable: true, defaultValue: false })
	@IsOptional()
	@IsBoolean()
	descending = false;
}
