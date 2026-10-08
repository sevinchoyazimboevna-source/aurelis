import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Max,
	Min,
	MinLength,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { CrewRole, CrewSortBy, CrewStatus } from '../../enums/crew.enum';

function TrimString(): PropertyDecorator {
	return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}

function TrimStrings(): PropertyDecorator {
	return Transform(({ value }) =>
		Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.trim() : item)) : value,
	);
}

@InputType({ isAbstract: true })
export class CrewProfileFields {
	@Field(() => ID, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsMongoId()
	memberId?: string;

	@Field(() => CrewRole)
	@IsEnum(CrewRole)
	role: CrewRole;

	@Field(() => CrewStatus, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsEnum(CrewStatus)
	status?: CrewStatus;

	@Field()
	@TrimString()
	@IsString()
	@MinLength(1)
	firstName: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimString()
	@IsString()
	@MinLength(1)
	lastName?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimString()
	@IsString()
	@MinLength(1)
	displayName?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimString()
	@IsString()
	@MinLength(1)
	nationality?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimString()
	@IsString()
	@MinLength(1)
	location?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	bio?: string;

	@Field(() => Int, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsInt()
	@Min(0)
	experienceYears?: number;

	@Field(() => [String], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimStrings()
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	@MinLength(1, { each: true })
	languages?: string[];

	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimString()
	@IsString()
	@MinLength(1)
	profileImage?: string;

	@Field(() => [String], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@TrimStrings()
	@IsArray()
	@IsString({ each: true })
	@MinLength(1, { each: true })
	images?: string[];

	@Field(() => Boolean, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsBoolean()
	featured?: boolean;
}

@InputType()
export class CreateCrewProfileInput extends CrewProfileFields {}

@InputType()
export class UpdateCrewProfileInput extends PartialType(CrewProfileFields, { skipNullProperties: false }) {
	@Field(() => ID)
	@IsMongoId()
	_id: string;
}

@InputType()
export class CrewFilterInput {
	@Field(() => CrewRole, { nullable: true })
	@IsOptional()
	@IsEnum(CrewRole)
	role?: CrewRole;

	@Field(() => CrewStatus, { nullable: true })
	@IsOptional()
	@IsEnum(CrewStatus)
	status?: CrewStatus;

	@Field({ nullable: true })
	@IsOptional()
	@TrimString()
	@IsString()
	@MinLength(1)
	nationality?: string;

	@Field({ nullable: true })
	@IsOptional()
	@TrimString()
	@IsString()
	@MinLength(1)
	location?: string;

	@Field({ nullable: true })
	@IsOptional()
	@TrimString()
	@IsString()
	@MinLength(1)
	language?: string;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	featured?: boolean;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	minExperienceYears?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	maxExperienceYears?: number;
}

@InputType()
export class CrewCatalogInput {
	@Field(() => CrewFilterInput, { nullable: true })
	@IsOptional()
	@ValidateNested()
	@Type(() => CrewFilterInput)
	filter?: CrewFilterInput;

	@Field(() => CrewSortBy, { nullable: true, defaultValue: CrewSortBy.NEWEST })
	@IsOptional()
	@IsEnum(CrewSortBy)
	sortBy = CrewSortBy.NEWEST;

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
