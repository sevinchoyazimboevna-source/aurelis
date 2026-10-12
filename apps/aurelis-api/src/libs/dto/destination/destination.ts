import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ContentStatus } from '../../enums/yacht.enum';

@ObjectType('Destination')
export class Destination {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => String)
	name!: string;

	@Expose()
	@Field(() => String)
	slug!: string;

	@Expose()
	@Field(() => String)
	region!: string;

	@Expose()
	@Field(() => String)
	country!: string;

	@Expose()
	@Field(() => String)
	description!: string;

	@Expose()
	@Field(() => String)
	heroImage!: string;

	@Expose()
	@Field(() => [String], { nullable: true })
	gallery?: string[];

	@Expose()
	@Field(() => ContentStatus)
	status!: ContentStatus;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
