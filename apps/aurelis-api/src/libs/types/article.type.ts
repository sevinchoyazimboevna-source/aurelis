import { ArticleCategory, ArticleStatus } from '../enums/article.enum';

/** Persistence shape for the `articles` collection in the Aurelis ER model. */
export interface ArticleRecord {
	_id: string;
	authorId: string;
	title: string;
	slug: string;
	category: ArticleCategory;
	excerpt: string;
	content: string;
	coverImage: string;
	gallery?: string[];
	relatedYachtIds?: string[];
	status: ArticleStatus;
	publishedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
