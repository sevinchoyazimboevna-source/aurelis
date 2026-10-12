import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType('Wishlist')
export class Wishlist {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	memberId!: string;

	@Expose()
	@Field(() => ID)
	yachtId!: string;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
