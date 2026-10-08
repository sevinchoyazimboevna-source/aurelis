import { registerEnumType } from '@nestjs/graphql';

export enum ArticleType {
	NEWS = 'NEWS',
	INSIGHT = 'INSIGHT',
	GUIDE = 'GUIDE',
}

export enum ArticleStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}

export enum ArticleSortBy {
	NEWEST = 'NEWEST',
	OLDEST = 'OLDEST',
	TITLE_ASC = 'TITLE_ASC',
	TITLE_DESC = 'TITLE_DESC',
	PUBLISHED_NEWEST = 'PUBLISHED_NEWEST',
	FEATURED = 'FEATURED',
}

registerEnumType(ArticleType, { name: 'ArticleType' });
registerEnumType(ArticleStatus, { name: 'ArticleStatus' });
registerEnumType(ArticleSortBy, { name: 'ArticleSortBy' });
