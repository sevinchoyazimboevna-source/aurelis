import { registerEnumType } from '@nestjs/graphql';

export enum ArticleCategory {
	BROKERAGE = 'BROKERAGE',
	CHARTER = 'CHARTER',
	COMPANY = 'COMPANY',
	LIFESTYLE = 'LIFESTYLE',
	NEW_CONSTRUCTION = 'NEW_CONSTRUCTION',
}
registerEnumType(ArticleCategory, { name: 'ArticleCategory' });

export enum ArticleStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}
registerEnumType(ArticleStatus, { name: 'ArticleStatus' });
