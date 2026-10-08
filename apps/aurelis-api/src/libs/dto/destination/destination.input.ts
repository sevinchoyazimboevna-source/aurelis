import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { DestinationSortBy, DestinationStatus, DestinationType } from '../../enums/destination.enum';

const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

@InputType({ isAbstract: true })
export class DestinationFields {
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	name: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	@MaxLength(120)
	slug?: string;
	@Field(() => DestinationType)
	@IsEnum(DestinationType)
	type: DestinationType;
	@Field(() => DestinationStatus, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsEnum(DestinationStatus)
	status?: DestinationStatus;
	@Field(() => ID, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined && value !== null)
	@IsMongoId()
	parentId?: string | null;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	country?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	region?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	shortDescription?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	description?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	heroImage?: string;
	@Field(() => [String], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Transform(({ value }) =>
		Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.trim() : item)) : value,
	)
	@IsArray()
	@IsString({ each: true })
	@MinLength(1, { each: true })
	images?: string[];
	@Field(() => Boolean, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsBoolean()
	featured?: boolean;
	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsInt()
	@Min(0)
	sortOrder?: number;
}
@InputType()
export class CreateDestinationInput extends DestinationFields {}
@InputType()
export class UpdateDestinationInput extends PartialType(DestinationFields, { skipNullProperties: false }) {
	@Field(() => ID)
	@IsMongoId()
	_id: string;
}
@InputType()
export class DestinationFilterInput {
	@Field(() => DestinationType, { nullable: true })
	@IsOptional()
	@IsEnum(DestinationType)
	type?: DestinationType;
	@Field(() => DestinationStatus, { nullable: true })
	@IsOptional()
	@IsEnum(DestinationStatus)
	status?: DestinationStatus;
	@Field(() => ID, { nullable: true })
	@IsOptional()
	@IsMongoId()
	parentId?: string | null;
	@Field({ nullable: true })
	@IsOptional()
	@Trim()
	@IsString()
	@MinLength(1)
	country?: string;
	@Field({ nullable: true })
	@IsOptional()
	@Trim()
	@IsString()
	@MinLength(1)
	region?: string;
	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	featured?: boolean;
	@Field({ nullable: true })
	@IsOptional()
	@Trim()
	@IsString()
	@MaxLength(120)
	search?: string;
}
@InputType()
export class DestinationCatalogInput {
	@Field(() => DestinationFilterInput, { nullable: true })
	@IsOptional()
	@ValidateNested()
	@Type(() => DestinationFilterInput)
	filter?: DestinationFilterInput;
	@Field(() => DestinationSortBy, { nullable: true, defaultValue: DestinationSortBy.FEATURED })
	@IsOptional()
	@IsEnum(DestinationSortBy)
	sortBy = DestinationSortBy.FEATURED;
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
}
