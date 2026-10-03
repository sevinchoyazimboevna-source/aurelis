import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';
import { MemberType } from '../../libs/enums/member.enum';

@InputType()
export class StaffLoginInput {
	@Field()
	@IsString()
	@MinLength(1)
	memberNick: string;

	@Field()
	@IsString()
	@MinLength(1)
	memberPassword: string;
}

@ObjectType()
export class StaffSession {
	@Field(() => ID)
	_id: string;

	@Field()
	memberNick: string;

	@Field(() => MemberType)
	memberType: MemberType;

	@Field()
	accessToken: string;
}
