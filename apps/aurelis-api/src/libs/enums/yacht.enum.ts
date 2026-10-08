import { registerEnumType } from '@nestjs/graphql';

export enum YachtListingMode {
	SALE = 'SALE',
	CHARTER = 'CHARTER',
}
registerEnumType(YachtListingMode, { name: 'YachtListingMode' });

export enum YachtStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}
registerEnumType(YachtStatus, { name: 'YachtStatus' });

export enum YachtSortBy {
	MOST_VIEWED = 'MOST_VIEWED',
	MOST_LIKED = 'MOST_LIKED',
	POPULAR = 'POPULAR',
	NEWEST = 'NEWEST',
	PRICE_ASC = 'PRICE_ASC',
	PRICE_DESC = 'PRICE_DESC',
	NAME_ASC = 'NAME_ASC',
	NAME_DESC = 'NAME_DESC',
	FEATURED = 'featured',
	PRICE = 'price',
	LENGTH = 'lengthM',
	YEAR = 'yearBuilt',
	CREATED = 'createdAt',
}
registerEnumType(YachtSortBy, { name: 'YachtSortBy' });
