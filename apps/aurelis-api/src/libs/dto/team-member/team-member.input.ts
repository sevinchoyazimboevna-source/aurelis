import { Field, InputType, ID, Int } from '@nestjs/graphql';

import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEmail,
	IsEnum,
	IsInt,
	IsArray,
	Min,
	Matches,
	IsUUID,
} from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';
import { Department } from '../../enums/team-member.enum';

@InputType()
export class CreateTeamMemberInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	officeId!: string;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	memberId?: string;

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
	firstName!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	lastName!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	jobTitle!: string;

	@IsDefined()
	@IsEnum(Department)
	@Field(() => Department)
	department!: Department;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	photo!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	bio!: string;

	@IsDefined()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String])
	languages!: string[];

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

	@IsDefined()
	@IsInt()
	@Min(0)
	@Field(() => Int)
	sortOrder!: number;

	@IsDefined()
	@IsEnum(ContentStatus)
	@Field(() => ContentStatus)
	status!: ContentStatus;
}
