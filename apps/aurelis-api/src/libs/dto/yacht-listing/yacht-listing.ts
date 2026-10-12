import { Expose, Type } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ListingType, ListingStatus, RatePeriod } from '../../enums/yacht-listing.enum';

@ObjectType('YachtListing')
export class YachtListing {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	yachtId!: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	brokerId?: string;

	@Expose()
	@Field(() => ListingType)
	listingType!: ListingType;

	@Expose()
	@Type(() => String)
	@Field(() => String, { nullable: true })
	price?: string;

	@Expose()
	@Field(() => String)
	currency!: string;

	@Expose()
	@Field(() => Boolean)
	priceOnRequest!: boolean;

	@Expose()
	@Field(() => RatePeriod, { nullable: true })
	ratePeriod?: RatePeriod;

	@Expose()
	@Field(() => ListingStatus)
	status!: ListingStatus;

	@Expose()
	@Field(() => Boolean)
	isFeatured!: boolean;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	publishedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	closedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
