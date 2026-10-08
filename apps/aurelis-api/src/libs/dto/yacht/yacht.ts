import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { BrokerProfile } from '../broker/broker';
import { YachtListingMode, YachtStatus } from '../../enums/yacht.enum';

@ObjectType()
export class Yacht {
	@Field(() => ID)
	_id: ObjectId;

	@Field()
	name: string;

	@Field({ nullable: true })
	builder?: string;

	@Field({ nullable: true })
	model?: string;

	@Field(() => Int, { nullable: true })
	yearBuilt?: number;

	@Field(() => Float, { nullable: true })
	lengthM?: number;

	@Field(() => Float, { nullable: true })
	beamM?: number;

	@Field(() => Float, { nullable: true })
	draftM?: number;

	@Field(() => Int, { nullable: true })
	cabins?: number;

	@Field(() => Int, { nullable: true })
	guests?: number;

	@Field(() => Int, { nullable: true })
	crew?: number;

	@Field()
	location: string;

	@Field()
	country: string;

	@Field(() => [ID])
	destinationIds?: ObjectId[];

	@Field({ nullable: true })
	description?: string;

	@Field(() => [String])
	images: string[];

	@Field(() => [YachtListingMode])
	listingModes: YachtListingMode[];

	@Field(() => Float, { nullable: true })
	salePrice?: number;

	@Field({ nullable: true })
	saleCurrency?: string;

	@Field(() => Float, { nullable: true })
	charterPrice?: number;

	@Field(() => Float, { nullable: true, deprecationReason: 'Use charterPrice' })
	charterRate?: number;

	@Field({ nullable: true })
	charterCurrency?: string;

	@Field({ nullable: true })
	charterRatePeriod?: string;

	@Field(() => Int)
	viewsCount?: number;

	@Field(() => Int)
	likesCount?: number;

	@Field()
	featured: boolean;

	@Field(() => YachtStatus)
	status: YachtStatus;

	@Field(() => ID)
	brokerId: ObjectId;

	@Field(() => BrokerProfile, { nullable: true })
	broker?: BrokerProfile;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Yachts {
	@Field(() => [Yacht])
	list: Yacht[];

	@Field()
	total: number;

	@Field(() => Int, { nullable: true })
	page?: number;

	@Field(() => Int, { nullable: true })
	limit?: number;

	@Field(() => Int, { nullable: true })
	totalPages?: number;
}
