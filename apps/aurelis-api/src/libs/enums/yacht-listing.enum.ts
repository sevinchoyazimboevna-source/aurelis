import { registerEnumType } from '@nestjs/graphql';

export enum ListingType {
	SALE = 'SALE',
	CHARTER = 'CHARTER',
}
registerEnumType(ListingType, { name: 'ListingType' });

export enum ListingStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	PAUSED = 'PAUSED',
	SOLD = 'SOLD',
	ARCHIVED = 'ARCHIVED',
}
registerEnumType(ListingStatus, { name: 'ListingStatus' });

export enum RatePeriod {
	DAY = 'DAY',
	WEEK = 'WEEK',
}
registerEnumType(RatePeriod, { name: 'RatePeriod' });

export enum YachtListingSortField {
	PRICE = 'price',
	CREATED_AT = 'createdAt',
	PUBLISHED_AT = 'publishedAt',
	LENGTH_M = 'lengthM',
	BUILD_YEAR = 'buildYear',
	REFIT_YEAR = 'refitYear',
	CABINS = 'cabins',
	GUEST_CAPACITY = 'guestCapacity',
	IS_FEATURED = 'isFeatured',
	IS_NEW_TO_FLEET = 'isNewToFleet',
}
registerEnumType(YachtListingSortField, { name: 'YachtListingSortField' });
