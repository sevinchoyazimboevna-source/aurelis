import { Field, InputType, Int, Float } from '@nestjs/graphql';

import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEnum,
	IsInt,
	IsNumber,
	IsArray,
	Min,
	Max,
	Matches,
} from 'class-validator';
import { YachtType, ContentStatus } from '../../enums/yacht.enum';

@InputType()
export class CreateYachtInput {
	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	name!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	@Field(() => String)
	slug!: string;

	@IsDefined()
	@IsEnum(YachtType)
	@Field(() => YachtType)
	yachtType!: YachtType;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	builder?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	model?: string;

	@IsDefined()
	@IsInt()
	@Min(0)
	@Min(1800)
	@Max(3000)
	@Field(() => Int)
	buildYear!: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	@Min(1800)
	@Max(3000)
	@Field(() => Int, { nullable: true })
	refitYear?: number;

	@IsDefined()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float)
	lengthM!: number;

	@IsOptional()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	beamM?: number;

	@IsOptional()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	draftM?: number;

	@IsOptional()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	cruiseSpeedKnots?: number;

	@IsOptional()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(0)
	@Field(() => Float, { nullable: true })
	maxSpeedKnots?: number;

	@IsDefined()
	@IsInt()
	@Min(0)
	@Field(() => Int)
	cabins!: number;

	@IsDefined()
	@IsInt()
	@Min(0)
	@Field(() => Int)
	guestCapacity!: number;

	@IsDefined()
	@IsInt()
	@Min(0)
	@Field(() => Int)
	crewCapacity!: number;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	description!: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	amenities?: string[];

	@IsDefined()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String])
	images!: string[];

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	videoUrl?: string;

	@IsDefined()
	@IsEnum(ContentStatus)
	@Field(() => ContentStatus)
	status!: ContentStatus;
}
