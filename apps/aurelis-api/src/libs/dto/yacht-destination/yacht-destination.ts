import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Season } from '../../enums/yacht-destination.enum';

@ObjectType('YachtDestination')
export class YachtDestination {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	yachtId!: string;

	@Expose()
	@Field(() => ID)
	destinationId!: string;

	@Expose()
	@Field(() => Season)
	season!: Season;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
