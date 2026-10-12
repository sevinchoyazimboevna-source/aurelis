import { Field, InputType, ID, GraphQLISODateTime, Int, Float } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEnum,
	IsBoolean,
	IsDate,
	IsInt,
	IsNumber,
	IsArray,
	Matches,
	IsUUID,
	Min,
	Max,
	ValidateIf,
	ValidationArguments,
	ValidationOptions,
	registerDecorator,
} from 'class-validator';
import { Direction } from '../../enums/comment.enum';
import { Season } from '../../enums/yacht-destination.enum';
import { YachtType } from '../../enums/yacht.enum';
import {
	ListingType,
	ListingStatus,
	RatePeriod,
	YachtListingSortField,
} from '../../enums/yacht-listing.enum';
import { PaginationInput } from '../common/pagination.input';

function MinMaxRange(
	minProperty: string,
	maxProperty: string,
	validationOptions?: ValidationOptions,
) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			target: object.constructor,
			propertyName,
			constraints: [minProperty, maxProperty],
			options: validationOptions || {},
			validator: {
				validate(value: unknown, args: ValidationArguments) {
					const obj = args.object as Record<string, unknown>;
					const minValue = obj[minProperty];
					const maxValue = obj[maxProperty];
					if (value == null || minValue == null || maxValue == null) {
						return true;
					}
					return (
						Number(value) <= Number(maxValue) && Number(minValue) <= Number(maxValue)
					);
				},
				defaultMessage(args: ValidationArguments) {
					return `${args.property} must be less than or equal to ${args.constraints[1]}.`;
				},
			},
		});
	};
}

@InputType()
export class CreateYachtListingInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	yachtId!: string;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	brokerId?: string;

	@IsDefined()
	@IsEnum(ListingType)
	@Field(() => ListingType)
	listingType!: ListingType;

	@IsOptional()
	@IsString()
	@Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
	@Field(() => String, { nullable: true })
	price?: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Matches(/^[A-Z]{3}$/)
	@Field(() => String)
	currency!: string;

	@IsDefined()
	@IsBoolean()
	@Field(() => Boolean)
	priceOnRequest!: boolean;

	@IsOptional()
	@IsEnum(RatePeriod)
	@Field(() => RatePeriod, { nullable: true })
	ratePeriod?: RatePeriod;

	@IsDefined()
	@IsEnum(ListingStatus)
	@Field(() => ListingStatus)
	status!: ListingStatus;

	@IsDefined()
	@IsBoolean()
	@Field(() => Boolean)
	isFeatured!: boolean;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	@Field(() => GraphQLISODateTime, { nullable: true })
	publishedAt?: Date;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	@Field(() => GraphQLISODateTime, { nullable: true })
	closedAt?: Date;
}

@InputType()
export class YachtListingFilterInput extends PaginationInput {
	@IsOptional()
	@IsEnum(ListingType)
	@Field(() => ListingType, { nullable: true })
	listingType?: ListingType;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	isNewToFleet?: boolean;

	@IsOptional()
	@IsEnum(Season)
	@Field(() => Season, { nullable: true })
	season?: Season;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	destinationId?: string;

	@IsOptional()
	@Type(() => Number)
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@MinMaxRange('minPrice', 'maxPrice')
	@Field(() => Float, { nullable: true })
	minPrice?: number;

	@IsOptional()
	@Type(() => Number)
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	maxPrice?: number;

	@IsOptional()
	@IsString()
	@Matches(/^[A-Z]{3}$/)
	@Field(() => String, { nullable: true })
	currency?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	minGuests?: number;

	@IsOptional()
	@Type(() => Number)
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@MinMaxRange('minLengthM', 'maxLengthM')
	@Field(() => Float, { nullable: true })
	minLengthM?: number;

	@IsOptional()
	@Type(() => Number)
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	maxLengthM?: number;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	amenities?: string[];

	@IsOptional()
	@IsEnum(YachtType)
	@Field(() => YachtType, { nullable: true })
	yachtType?: YachtType;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Field(() => Int, { nullable: true })
	minCabins?: number;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	builders?: string[];

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	@MinMaxRange('minBuildYear', 'maxBuildYear')
	@Field(() => Int, { nullable: true })
	minBuildYear?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	@Field(() => Int, { nullable: true })
	maxBuildYear?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	@MinMaxRange('minRefitYear', 'maxRefitYear')
	@Field(() => Int, { nullable: true })
	minRefitYear?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1800)
	@Field(() => Int, { nullable: true })
	maxRefitYear?: number;

	@IsOptional()
	@IsEnum(YachtListingSortField)
	@Field(() => YachtListingSortField, { nullable: true })
	sortBy?: YachtListingSortField;

	@IsOptional()
	@IsEnum(Direction)
	@Field(() => Direction, { nullable: true })
	sortDirection?: Direction;
}
