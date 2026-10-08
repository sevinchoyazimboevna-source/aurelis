import { Field, Float, ID, InputType, Int, PartialType } from '@nestjs/graphql';
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
	IsPositive,
	ValidateNested,
	ValidateIf,
	registerDecorator,
} from 'class-validator';
import { YachtListingMode, YachtSortBy, YachtStatus } from '../../enums/yacht.enum';

function IsBuildYear(): PropertyDecorator {
	return (target, propertyKey) =>
		registerDecorator({
			name: 'isBuildYear',
			target: target.constructor,
			propertyName: String(propertyKey),
			validator: {
				validate: (value: unknown) =>
					typeof value === 'number' && Number.isInteger(value) && value >= 1800 && value <= new Date().getFullYear(),
				defaultMessage: () => 'yearBuilt must be between 1800 and the current year',
			},
		});
}

@InputType({ isAbstract: true })
export class YachtFields {
	@Field()
	@IsString()
	@MinLength(2)
	@Matches(/\S/)
	name: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	@MinLength(2)
	builder?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	model?: string;

	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsInt()
	@Min(1800)
	@IsBuildYear()
	yearBuilt?: number;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@IsPositive()
	lengthM?: number;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@IsPositive()
	beamM?: number;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@IsPositive()
	draftM?: number;

	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsInt()
	@Min(0)
	cabins?: number;

	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsInt()
	@Min(0)
	guests?: number;

	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
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

	@Field(() => [ID], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsArray()
	@ArrayUnique((id: unknown) => (typeof id === 'string' ? id.toLowerCase() : id))
	@IsMongoId({ each: true })
	destinationIds?: string[];

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	description?: string;

	@Field(() => [String], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
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
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@Min(0)
	salePrice?: number;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Matches(/^[A-Z]{3}$/)
	saleCurrency?: string;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@Min(0)
	charterPrice?: number;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsNumber()
	@Min(0)
	charterRate?: number;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Matches(/^[A-Z]{3}$/)
	charterCurrency?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	charterRatePeriod?: string;

	@Field(() => Boolean, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsBoolean()
	featured?: boolean;

	@Field(() => YachtStatus, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsEnum(YachtStatus)
	status?: YachtStatus;

	@Field(() => ID)
	@IsMongoId()
	brokerId: string;
}

@InputType()
export class YachtInput extends YachtFields {}

@InputType()
export class YachtUpdateInput extends PartialType(YachtFields, { skipNullProperties: false }) {
	@Field(() => ID)
	@IsMongoId()
	_id: string;
}

@InputType()
export class YachtInquiryFilter {
	@Field(() => ID, { nullable: true })
	@IsOptional()
	@IsMongoId()
	destinationId?: string;

	@Field(() => YachtListingMode, { nullable: true })
	@IsOptional()
	@IsEnum(YachtListingMode)
	mode?: YachtListingMode;

	@Field(() => YachtListingMode, { nullable: true })
	@IsOptional()
	@IsEnum(YachtListingMode)
	listingMode?: YachtListingMode;

	@Field(() => YachtStatus, { nullable: true })
	@IsOptional()
	@IsEnum(YachtStatus)
	status?: YachtStatus;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	builder?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	model?: string;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	featured?: boolean;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	minCabins?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	maxCabins?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	minGuests?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	maxGuests?: number;

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
	@IsInt()
	@Min(1800)
	minYear?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(1800)
	maxYear?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	minLengthM?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	maxLengthM?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	minPrice?: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
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
	@ValidateNested()
	@Type(() => YachtInquiryFilter)
	filter?: YachtInquiryFilter;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	page = 1;

	@Field(() => Int, { nullable: true, defaultValue: 20 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(50)
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
