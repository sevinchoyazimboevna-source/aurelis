import { Field, InputType, Float } from '@nestjs/graphql';

import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEmail,
	IsEnum,
	IsNumber,
	Min,
	Max,
	Matches,
} from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';

@InputType()
export class CreateOfficeInput {
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
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	region!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	country!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	city!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	address!: string;

	@IsDefined()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(-90)
	@Max(90)
	@Field(() => Float)
	latitude!: number;

	@IsDefined()
	@IsNumber({ allowNaN: false, allowInfinity: false })
	@Min(-180)
	@Max(180)
	@Field(() => Float)
	longitude!: number;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	phone!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	timezone!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	coverImage!: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	description?: string;

	@IsDefined()
	@IsEnum(ContentStatus)
	@Field(() => ContentStatus)
	status!: ContentStatus;
}
