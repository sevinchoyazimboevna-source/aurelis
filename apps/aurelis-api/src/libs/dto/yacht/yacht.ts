import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, Int, Float, GraphQLISODateTime } from '@nestjs/graphql';
import { YachtType, ContentStatus } from '../../enums/yacht.enum';

@ObjectType('Yacht')
export class Yacht {
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
	@Field(() => YachtType)
	yachtType!: YachtType;

	@Expose()
	@Field(() => String, { nullable: true })
	builder?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	model?: string;

	@Expose()
	@Field(() => Int)
	buildYear!: number;

	@Expose()
	@Field(() => Int, { nullable: true })
	refitYear?: number;

	@Expose()
	@Field(() => Float)
	lengthM!: number;

	@Expose()
	@Field(() => Float, { nullable: true })
	beamM?: number;

	@Expose()
	@Field(() => Float, { nullable: true })
	draftM?: number;

	@Expose()
	@Field(() => Float, { nullable: true })
	cruiseSpeedKnots?: number;

	@Expose()
	@Field(() => Float, { nullable: true })
	maxSpeedKnots?: number;

	@Expose()
	@Field(() => Int)
	cabins!: number;

	@Expose()
	@Field(() => Int)
	guestCapacity!: number;

	@Expose()
	@Field(() => Int)
	crewCapacity!: number;

	@Expose()
	@Field(() => String)
	description!: string;

	@Expose()
	@Field(() => [String], { nullable: true })
	amenities?: string[];

	@Expose()
	@Field(() => [String])
	images!: string[];

	@Expose()
	@Field(() => String, { nullable: true })
	videoUrl?: string;

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
