import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { ListingType, ListingStatus, RatePeriod } from '../enums/yacht-listing.enum';

/** ER collection: yachtListings. String IDs use UUIDs. */
export const YachtListingSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		yachtId: { type: String, required: true, ref: 'Yacht', index: true },
		brokerId: { type: String, ref: 'TeamMember', index: true },
		listingType: { type: String, required: true, enum: Object.values(ListingType) },
		price: {
			type: Schema.Types.Decimal128,
			validate: (value: { toString(): string } | null) =>
				value === null || /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.toString()),
		},
		currency: { type: String, required: true },
		priceOnRequest: { type: Boolean, required: true, default: false },
		ratePeriod: { type: String, enum: Object.values(RatePeriod) },
		status: {
			type: String,
			required: true,
			enum: Object.values(ListingStatus),
			default: ListingStatus.DRAFT,
		},
		isFeatured: { type: Boolean, required: true, default: false },
		publishedAt: { type: Date },
		closedAt: { type: Date },
	},
	{ timestamps: true, collection: 'yachtListings' },
);
YachtListingSchema.index({ yachtId: 1, listingType: 1, status: 1 });

export default YachtListingSchema;
