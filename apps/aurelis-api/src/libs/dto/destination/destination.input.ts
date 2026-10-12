import { Field, InputType } from '@nestjs/graphql';

import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEnum,
	IsArray,
	Matches,
} from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';

@InputType()
export class CreateDestinationInput {
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
	description!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	heroImage!: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	gallery?: string[];

	@IsDefined()
	@IsEnum(ContentStatus)
	@Field(() => ContentStatus)
	status!: ContentStatus;
}
