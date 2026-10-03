import { registerEnumType } from '@nestjs/graphql';

export enum YachtListingMode {
	SALES = 'SALES',
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
	FEATURED = 'featured',
	PRICE = 'price',
	LENGTH = 'lengthM',
	YEAR = 'yearBuilt',
	CREATED = 'createdAt',
}
registerEnumType(YachtSortBy, { name: 'YachtSortBy' });
