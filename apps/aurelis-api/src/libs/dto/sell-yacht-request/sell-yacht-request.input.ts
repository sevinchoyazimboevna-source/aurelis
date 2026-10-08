import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsEnum,
	IsInt,
	IsMongoId,
	IsNumber,
	IsPositive,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
	MinLength,
	ValidateBy,
	ValidateIf,
} from 'class-validator';
import { SellYachtRequestStatus } from '../../enums/sell-yacht-request.enum';
import { validSellYachtBuildYear } from '../../validators/sell-yacht-request';

const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
const Email = () =>
	Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

@InputType()
export class CreateSellYachtRequestInput {
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	ownerName: string;

	@Field()
	@Email()
	@IsEmail()
	@MaxLength(254)
	email: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(40)
	@Matches(/\d/)
	phone: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	yachtName: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	builder: string;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	model?: string;

	@Field(() => Int)
	@IsInt()
	@ValidateBy({
		name: 'sellYachtBuildYear',
		validator: { validate: (value: unknown) => validSellYachtBuildYear(value) },
	})
	yearBuilt: number;

	@Field(() => Float)
	@IsNumber()
	@IsPositive()
	lengthM: number;

	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(240)
	location: string;

	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	country: string;

	@Field(() => Float, { nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@IsNumber()
	@IsPositive()
	askingPrice?: number;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
	@Matches(/^[A-Z]{3}$/)
	currency?: string;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MaxLength(4000)
	description?: string;
}

@InputType()
export class SellYachtRequestCatalogInput {
	@Field(() => SellYachtRequestStatus, { nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@IsEnum(SellYachtRequestStatus)
	status?: SellYachtRequestStatus;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	country?: string;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	builder?: string;

	@Field({ nullable: true })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@Email()
	@IsEmail()
	@MaxLength(254)
	email?: string;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@IsInt()
	@Min(1)
	page = 1;

	@Field(() => Int, { nullable: true, defaultValue: 20 })
	@ValidateIf((_object: unknown, value: unknown) => value !== undefined)
	@IsInt()
	@Min(1)
	@Max(50)
	limit = 20;
}

@InputType()
export class UpdateSellYachtRequestStatusInput {
	@Field(() => ID)
	@IsMongoId()
	requestId: string;

	@Field(() => SellYachtRequestStatus)
	@IsEnum(SellYachtRequestStatus)
	status: SellYachtRequestStatus;
}
