import { Types } from 'mongoose';
import { ListingType, ListingStatus, RatePeriod } from '../enums/yacht-listing.enum';

/** Persistence shape for the `yachtListings` collection in the Aurelis ER model. */
export interface YachtListingRecord {
	_id: string;
	yachtId: string;
	brokerId?: string;
	listingType: ListingType;
	price?: Types.Decimal128;
	currency: string;
	priceOnRequest: boolean;
	ratePeriod?: RatePeriod;
	status: ListingStatus;
	isFeatured: boolean;
	publishedAt?: Date;
	closedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
