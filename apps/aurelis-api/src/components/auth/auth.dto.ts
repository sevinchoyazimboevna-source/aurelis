import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';

@InputType()
export class RegisterInput {
	@Field()
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	@IsEmail()
	email: string;

	@Field()
	@IsString()
	@MinLength(1)
	password: string;

	@Field()
	@IsString()
	@MinLength(1)
	confirmPassword: string;
}

@InputType()
export class LoginInput {
	@Field()
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	@IsEmail()
	email: string;

	@Field()
	@IsString()
	@MinLength(1)
	password: string;
}

@InputType()
export class GoogleLoginInput {
	@Field()
	@IsString()
	@MinLength(1)
	credential: string;
}

@ObjectType()
export class Member {
	@Field(() => ID)
	_id: string;

	@Field()
	email: string;

	@Field(() => String, { nullable: true })
	googleId?: string | null;

	@Field(() => MemberRole)
	role: MemberRole;

	@Field(() => MemberStatus)
	status: MemberStatus;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class AuthResponse {
	@Field()
	accessToken: string;

	@Field(() => Member)
	member: Member;
}
