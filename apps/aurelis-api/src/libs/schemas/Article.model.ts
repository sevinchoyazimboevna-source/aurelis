import { Schema } from 'mongoose';
import type { Types } from 'mongoose';
import type { Article } from '../dto/article/article';
import { ArticleStatus, ArticleType } from '../enums/article.enum';

const distinctIds = (ids: Types.ObjectId[]): boolean => new Set(ids.map((id) => id.toHexString())).size === ids.length;

const ArticleSchema = new Schema<Article>(
	{
		title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
		slug: { type: String, required: true, minlength: 1, maxlength: 200, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
		type: { type: String, required: true, enum: Object.values(ArticleType) },
		status: { type: String, required: true, enum: Object.values(ArticleStatus), default: ArticleStatus.DRAFT },
		excerpt: { type: String, trim: true, maxlength: 1000 },
		content: { type: String, trim: true, minlength: 1, maxlength: 200000 },
		coverImage: { type: String, trim: true, minlength: 1, maxlength: 2048 },
		images: { type: [{ type: String, required: true, trim: true, minlength: 1, maxlength: 2048 }], default: [] },
		authorName: { type: String, trim: true, minlength: 1, maxlength: 120 },
		authorMemberId: { type: Schema.Types.ObjectId, ref: 'Member' },
		featured: { type: Boolean, default: false },
		publishAt: { type: Date },
		publishedAt: { type: Date },
		yachtIds: {
			type: [{ type: Schema.Types.ObjectId, ref: 'Yacht' }],
			default: [],
			validate: { validator: distinctIds, message: 'Yacht IDs must be distinct' },
		},
		destinationIds: {
			type: [{ type: Schema.Types.ObjectId, ref: 'Destination' }],
			default: [],
			validate: { validator: distinctIds, message: 'Destination IDs must be distinct' },
		},
	},
	{ timestamps: true, collection: 'articles' },
);

ArticleSchema.index({ slug: 1 }, { unique: true });
// Public latest and featured browsing, with type and explicit association discovery.
ArticleSchema.index({ status: 1, publishedAt: -1, _id: -1 });
ArticleSchema.index({ status: 1, featured: -1, publishedAt: -1, _id: -1 });
ArticleSchema.index({ status: 1, type: 1, publishedAt: -1, _id: -1 });
ArticleSchema.index({ status: 1, yachtIds: 1, publishedAt: -1, _id: -1 });
ArticleSchema.index({ status: 1, destinationIds: 1, publishedAt: -1, _id: -1 });

export default ArticleSchema;
