import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ListingStatus, ListingType, RatePeriod } from '../libs/enums/yacht-listing.enum';

export type YachtListingDocument = HydratedDocument<YachtListing>;

@Schema({
	collection: 'yachtListings',
	timestamps: true,
})
export class YachtListing {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Yacht',
	})
	yachtId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'TeamMember',
	})
	brokerId?: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(ListingType),
		required: true,
	})
	listingType!: ListingType;

	@Prop({
		type: Types.Decimal128,
		required: false,
	})
	price?: Types.Decimal128;

	@Prop({
		type: String,
		required: true,
		trim: true,
		uppercase: true,
		match: /^[A-Z]{3}$/,
	})
	currency!: string;

	@Prop({
		type: Boolean,
		required: true,
		default: false,
	})
	priceOnRequest!: boolean;

	@Prop({
		type: String,
		enum: Object.values(RatePeriod),
	})
	ratePeriod?: RatePeriod;

	@Prop({
		type: String,
		enum: Object.values(ListingStatus),
		required: true,
		default: ListingStatus.DRAFT,
	})
	status!: ListingStatus;

	@Prop({
		type: Boolean,
		required: true,
		default: false,
	})
	isNewToFleet!: boolean;

	@Prop({
		type: Boolean,
		required: true,
		default: false,
	})
	isFeatured!: boolean;

	@Prop({ type: Date })
	publishedAt?: Date;

	@Prop({ type: Date })
	closedAt?: Date;

	createdAt!: Date;
	updatedAt!: Date;
}

export const YachtListingSchema = SchemaFactory.createForClass(YachtListing);

YachtListingSchema.pre('validate', function (this: any) {
	if (this.priceOnRequest === true) {
		this.price = undefined;
	}

	if (
		this.listingType === ListingType.CHARTER &&
		!this.priceOnRequest &&
		this.ratePeriod == null
	) {
		this.invalidate('ratePeriod', 'Rate period is required for charter listings.');
	}

	if (this.status === ListingStatus.SOLD && this.listingType !== ListingType.SALE) {
		this.invalidate('status', 'SOLD applies only to SALE listings.');
	}

	if (
		this.status !== ListingStatus.DRAFT &&
		this.status !== ListingStatus.PUBLISHED &&
		this.status !== ListingStatus.PAUSED
	) {
		return;
	}

	if (this.priceOnRequest !== true && (this.price == null || this.price === undefined)) {
		this.invalidate('price', 'Price is required unless priceOnRequest is true.');
	}

	if (
		this.status === ListingStatus.PUBLISHED &&
		(this.brokerId == null || this.brokerId === undefined)
	) {
		this.invalidate('brokerId', 'brokerId is required when a listing is published.');
	}
});

YachtListingSchema.index(
	{ yachtId: 1, listingType: 1, status: 1 },
	{
		unique: true,
		partialFilterExpression: {
			status: {
				$in: [ListingStatus.DRAFT, ListingStatus.PUBLISHED, ListingStatus.PAUSED],
			},
		},
		name: 'yacht_listing_active_unique',
	},
);

YachtListingSchema.index({ yachtId: 1, listingType: 1 });

export default YachtListingSchema;
