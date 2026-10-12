import { Field, InputType } from '@nestjs/graphql';

import { IsDefined, IsOptional, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { PageKey, PageStatus } from '../../enums/page-content.enum';
import { JsonValue } from '../../types/json.type';
import { JsonScalar } from '../../types/json.scalar';
import { IsJsonValue } from '../../types/json.validator';

@InputType()
export class CreatePageContentInput {
	@IsDefined()
	@IsEnum(PageKey)
	@Field(() => PageKey)
	pageKey!: PageKey;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	locale!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	title!: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	heroImage?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	heroVideoUrl?: string;

	@IsDefined()
	@IsJsonValue()
	@Field(() => JsonScalar)
	sections!: JsonValue;

	@IsDefined()
	@IsEnum(PageStatus)
	@Field(() => PageStatus)
	status!: PageStatus;
}
