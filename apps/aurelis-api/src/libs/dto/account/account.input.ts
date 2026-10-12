import { Field, InputType } from '@nestjs/graphql';
import {
	IsDefined,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator';

import { AppLanguage } from '../../enums/account.enum';

@InputType()
export class CreateMemberRecordInput {
	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	name!: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	fullName?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	phone?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String, { nullable: true })
	email?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	avatarUrl?: string;

	@IsDefined()
	@IsEnum(AppLanguage)
	@Field(() => AppLanguage)
	preferredLanguage!: AppLanguage;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Length(8, 128)
	@Field(() => String)
	password!: string;
}
