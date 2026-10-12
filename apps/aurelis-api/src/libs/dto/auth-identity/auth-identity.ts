import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { AuthProvider } from '../../enums/account.enum';

@ObjectType('AuthIdentity')
export class AuthIdentity {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	memberId!: string;

	@Expose()
	@Field(() => AuthProvider)
	provider!: AuthProvider;

	@Expose()
	@Field(() => String)
	providerUserId!: string;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
