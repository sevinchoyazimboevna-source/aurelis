import { registerEnumType } from '@nestjs/graphql';

export enum CrewRole {
	CAPTAIN = 'CAPTAIN',
	CHEF = 'CHEF',
}
registerEnumType(CrewRole, { name: 'CrewRole' });

export enum CrewStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}
registerEnumType(CrewStatus, { name: 'CrewStatus' });

export enum CrewSortBy {
	NEWEST = 'NEWEST',
	EXPERIENCE_ASC = 'EXPERIENCE_ASC',
	EXPERIENCE_DESC = 'EXPERIENCE_DESC',
	NAME_ASC = 'NAME_ASC',
	NAME_DESC = 'NAME_DESC',
}
registerEnumType(CrewSortBy, { name: 'CrewSortBy' });
