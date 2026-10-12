import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { ArticleCategory, ArticleStatus } from '../enums/article.enum';

/** ER collection: articles. String IDs use UUIDs. */
export const ArticleSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		authorId: { type: String, required: true, ref: 'MemberRecord', index: true },
		title: { type: String, required: true },
		slug: { type: String, required: true },
		category: { type: String, required: true, enum: Object.values(ArticleCategory) },
		excerpt: { type: String, required: true },
		content: { type: String, required: true },
		coverImage: { type: String, required: true },
		gallery: { type: [String], default: undefined },
		relatedYachtIds: { type: [String], default: undefined },
		status: {
			type: String,
			required: true,
			enum: Object.values(ArticleStatus),
			default: ArticleStatus.DRAFT,
		},
		publishedAt: { type: Date },
	},
	{ timestamps: true, collection: 'articles' },
);

ArticleSchema.index({ slug: 1 }, { unique: true });

export default ArticleSchema;
