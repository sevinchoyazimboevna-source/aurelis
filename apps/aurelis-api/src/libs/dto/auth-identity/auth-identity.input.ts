import { Field, InputType, ID } from '@nestjs/graphql';

import { IsDefined, IsEnum, IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { AuthProvider } from '../../enums/account.enum';

@InputType()
export class CreateAuthIdentityInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	memberId!: string;

	@IsDefined()
	@IsEnum(AuthProvider)
	@Field(() => AuthProvider)
	provider!: AuthProvider;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	providerUserId!: string;
}
