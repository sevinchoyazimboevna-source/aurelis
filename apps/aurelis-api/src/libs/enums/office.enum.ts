import { registerEnumType } from '@nestjs/graphql';
export enum OfficeStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}
export enum OfficeSortBy {
	FEATURED = 'FEATURED',
	SORT_ORDER = 'SORT_ORDER',
	NAME_ASC = 'NAME_ASC',
	NAME_DESC = 'NAME_DESC',
	NEWEST = 'NEWEST',
}
export enum DayOfWeek {
	MONDAY = 'MONDAY',
	TUESDAY = 'TUESDAY',
	WEDNESDAY = 'WEDNESDAY',
	THURSDAY = 'THURSDAY',
	FRIDAY = 'FRIDAY',
	SATURDAY = 'SATURDAY',
	SUNDAY = 'SUNDAY',
}
registerEnumType(OfficeStatus, { name: 'OfficeStatus' });
registerEnumType(OfficeSortBy, { name: 'OfficeSortBy' });
registerEnumType(DayOfWeek, { name: 'DayOfWeek' });
