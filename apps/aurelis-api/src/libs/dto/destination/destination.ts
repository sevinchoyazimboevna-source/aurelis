import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { DestinationStatus, DestinationType } from '../../enums/destination.enum';

@ObjectType()
export class Destination {
	@Field(() => ID)
	_id: Types.ObjectId;
	@Field()
	name: string;
	@Field()
	slug: string;
	@Field(() => DestinationType)
	type: DestinationType;
	@Field(() => DestinationStatus)
	status: DestinationStatus;
	@Field(() => ID, { nullable: true })
	parentId?: Types.ObjectId | null;
	@Field({ nullable: true })
	country?: string;
	@Field({ nullable: true })
	region?: string;
	@Field({ nullable: true })
	shortDescription?: string;
	@Field({ nullable: true })
	description?: string;
	@Field({ nullable: true })
	heroImage?: string;
	@Field(() => [String])
	images: string[];
	@Field()
	featured: boolean;
	@Field(() => Int, { nullable: true })
	sortOrder?: number;
	@Field(() => Date)
	createdAt: Date;
	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Destinations {
	@Field(() => [Destination])
	list: Destination[];
	@Field(() => Int)
	total: number;
	@Field(() => Int, { nullable: true })
	page?: number;
	@Field(() => Int, { nullable: true })
	limit?: number;
	@Field(() => Int, { nullable: true })
	totalPages?: number;
}
