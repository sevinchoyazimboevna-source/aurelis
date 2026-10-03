import { Field, ID, InputType } from '@nestjs/graphql';
import { IsArray, IsBoolean, IsEmail, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class BrokerProfileInput {
	@Field(() => ID, { nullable: true })
	@IsOptional()
	@IsMongoId()
	_id?: string;

	@Field()
	@IsString()
	@MinLength(2)
	name: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	title?: string;

	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	phone?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	image?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	biography?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	languages?: string[];

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
