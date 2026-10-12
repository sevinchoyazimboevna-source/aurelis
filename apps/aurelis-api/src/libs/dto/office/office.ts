import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, Float, GraphQLISODateTime } from '@nestjs/graphql';
import { ContentStatus } from '../../enums/yacht.enum';

@ObjectType('Office')
export class Office {
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
	city!: string;

	@Expose()
	@Field(() => String)
	address!: string;

	@Expose()
	@Field(() => Float)
	latitude!: number;

	@Expose()
	@Field(() => Float)
	longitude!: number;

	@Expose()
	@Field(() => String)
	phone!: string;

	@Expose()
	@Field(() => String)
	email!: string;

	@Expose()
	@Field(() => String)
	timezone!: string;

	@Expose()
	@Field(() => String)
	coverImage!: string;

	@Expose()
	@Field(() => String, { nullable: true })
	description?: string;

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
