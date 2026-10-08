import { registerEnumType } from '@nestjs/graphql';

export enum DestinationType {
	REGION = 'REGION',
	COUNTRY = 'COUNTRY',
	AREA = 'AREA',
}
export enum DestinationStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}
export enum DestinationSortBy {
	FEATURED = 'FEATURED',
	SORT_ORDER = 'SORT_ORDER',
	NAME_ASC = 'NAME_ASC',
	NAME_DESC = 'NAME_DESC',
	NEWEST = 'NEWEST',
}
registerEnumType(DestinationType, { name: 'DestinationType' });
registerEnumType(DestinationStatus, { name: 'DestinationStatus' });
registerEnumType(DestinationSortBy, { name: 'DestinationSortBy' });
