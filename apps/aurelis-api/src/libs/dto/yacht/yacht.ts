import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import {
	YachtCurrency,
	YachtListingType,
	YachtPricePeriod,
	YachtStatus,
	YachtType,
} from '../../enums/yacht.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

/**
 * AURELIS's yacht-listing GraphQL shape.
 *
 * This type is intentionally not connected to the legacy Property resolver.
 * That resolver still reads property-prefixed database keys; exposing this type
 * there requires the service/schema migration documented in the README.
 */
@ObjectType({ isAbstract: true })
export class Yacht {
	@Field(() => String)
	_id!: ObjectId;

	@Field(() => String)
	yachtName!: string;

	@Field(() => String)
	yachtDescription!: string;

	@Field(() => YachtType)
	yachtType!: YachtType;

	@Field(() => String)
	yachtBuilder!: string;

	@Field(() => String)
	yachtModel!: string;

	@Field(() => Int)
	yachtYear!: number;

	@Field(() => Int, { nullable: true })
	yachtRefitYear?: number;

	@Field(() => Float)
	yachtLength!: number;

	@Field(() => Float)
	yachtBeam!: number;

	@Field(() => Float)
	yachtDraft!: number;

	@Field(() => Int)
	yachtGuests!: number;

	@Field(() => Int)
	yachtCabins!: number;

	@Field(() => Int)
	yachtCrew!: number;

	@Field(() => Float)
	yachtPrice!: number;

	@Field(() => YachtCurrency)
	yachtCurrency!: YachtCurrency;

	@Field(() => YachtPricePeriod, { nullable: true })
	yachtPricePeriod?: YachtPricePeriod;

	@Field(() => String)
	yachtLocation!: string;

	@Field(() => [String])
	yachtImages!: string[];

	@Field(() => String, { nullable: true })
	yachtVideo?: string;

	@Field(() => YachtStatus)
	yachtStatus!: YachtStatus;

	@Field(() => YachtListingType)
	yachtListingType!: YachtListingType;

	@Field(() => Int)
	yachtViews!: number;

	@Field(() => Int)
	yachtLikes!: number;

	@Field(() => Int)
	yachtComments!: number;

	@Field(() => Int)
	yachtRank!: number;

	@Field(() => String)
	memberId!: ObjectId;

	@Field(() => Date, { nullable: true })
	soldAt?: Date;

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	@Field(() => Member)
	memberData!: Member;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

/** Preserves the list-plus-counter pagination response used by the live API. */
@ObjectType({ isAbstract: true })
export class Yachts {
	@Field(() => [Yacht])
	list!: Yacht[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter?: TotalCounter[];
}
