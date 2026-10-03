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

	@Field()
	builder: string;

	@Field({ nullable: true })
	model?: string;

	@Field(() => Int)
	yearBuilt: number;

	@Field(() => Float)
	lengthM: number;

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
	charterRate?: number;

	@Field({ nullable: true })
	charterCurrency?: string;

	@Field({ nullable: true })
	charterRatePeriod?: string;

	@Field()
	featured: boolean;

	@Field(() => YachtStatus)
	status: YachtStatus;

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
}
