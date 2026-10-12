import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { AuthProvider } from '../../enums/account.enum';
import { CreateAuthIdentityInput } from './auth-identity.input';

@InputType()
export class UpdateAuthIdentityInput extends PartialType(CreateAuthIdentityInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	memberId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	provider?: AuthProvider;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	providerUserId?: string;
}
