import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsEmail,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
	MinLength,
	ValidateBy,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { DayOfWeek, OfficeSortBy, OfficeStatus } from '../../enums/office.enum';
import { validOfficeTimezone } from '../../validators/office-business-hours';
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
@InputType()
export class OfficeBusinessHoursInput {
	@Field(() => DayOfWeek) @IsEnum(DayOfWeek) day: DayOfWeek;
	@Field(() => String, { nullable: true }) @IsOptional() @IsString() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) openTime?:
		string | null;
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
	closeTime?: string | null;
	@Field(() => Boolean, { defaultValue: false }) @IsBoolean() closed = false;
}
@InputType({ isAbstract: true })
export class OfficeFields {
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	name: string;
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	country: string;
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	city: string;
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(240)
	addressLine1: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(240)
	addressLine2?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(40)
	postalCode?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	phone?: string;
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
	@MaxLength(2048)
	heroImage?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsString()
	@MaxLength(120)
	slug?: string;
	@Field(() => OfficeStatus, { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsEnum(OfficeStatus)
	status?: OfficeStatus;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsEmail()
	email?: string;
	@Field({ nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@Trim()
	@IsString()
	@MaxLength(120)
	@ValidateBy({ name: 'officeTimezone', validator: { validate: validOfficeTimezone } })
	timezone?: string;
	@Field(() => [OfficeBusinessHoursInput], { nullable: true })
	@ValidateIf((_object, value) => value !== undefined)
	@IsArray()
	@ArrayMaxSize(7)
	@ArrayUnique((entry: any) => entry?.day)
	@ValidateNested({ each: true })
	@Type(() => OfficeBusinessHoursInput)
	businessHours?: OfficeBusinessHoursInput[];
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
export class CreateOfficeInput extends OfficeFields {}
@InputType()
export class UpdateOfficeInput extends PartialType(OfficeFields, { skipNullProperties: false }) {
	@Field(() => ID) @IsMongoId() _id: string;
}
@InputType()
export class OfficeFilterInput {
	@Field(() => OfficeStatus, { nullable: true }) @IsOptional() @IsEnum(OfficeStatus) status?: OfficeStatus;
	@Field({ nullable: true }) @IsOptional() @Trim() @IsString() @MinLength(1) country?: string;
	@Field({ nullable: true }) @IsOptional() @Trim() @IsString() @MinLength(1) city?: string;
	@Field(() => Boolean, { nullable: true }) @IsOptional() @IsBoolean() featured?: boolean;
	@Field({ nullable: true }) @IsOptional() @Trim() @IsString() @MaxLength(120) search?: string;
}
@InputType()
export class OfficeCatalogInput {
	@Field(() => OfficeFilterInput, { nullable: true })
	@IsOptional()
	@ValidateNested()
	@Type(() => OfficeFilterInput)
	filter?: OfficeFilterInput;
	@Field(() => OfficeSortBy, { nullable: true, defaultValue: OfficeSortBy.FEATURED })
	@IsOptional()
	@IsEnum(OfficeSortBy)
	sortBy = OfficeSortBy.FEATURED;
	@Field(() => Int, { nullable: true, defaultValue: 1 }) @IsOptional() @IsInt() @Min(1) page = 1;
	@Field(() => Int, { nullable: true, defaultValue: 20 }) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 20;
}
