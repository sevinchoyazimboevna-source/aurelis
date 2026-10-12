import { Field, InputType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEmail,
	IsDate,
	IsUUID,
} from 'class-validator';

@InputType()
export class CreateNewsletterSubscriptionInput {
	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email!: string;

	@IsOptional()
	@IsUUID()
	@Field(() => ID, { nullable: true })
	memberId?: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	language!: string;

	@IsDefined()
	@Type(() => Date)
	@IsDate()
	@Field(() => GraphQLISODateTime)
	consentAt!: Date;
}
