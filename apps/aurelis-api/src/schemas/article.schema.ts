import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ArticleCategory, ArticleStatus } from '../libs/enums/article.enum';

export type ArticleDocument = HydratedDocument<Article>;

@Schema({
	collection: 'articles',
	timestamps: true,
})
export class Article {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Member',
	})
	authorId!: Types.ObjectId;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	title!: string;

	@Prop({
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
	})
	slug!: string;

	@Prop({
		type: String,
		enum: Object.values(ArticleCategory),
		required: true,
	})
	category!: ArticleCategory;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	excerpt!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	content!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	coverImage!: string;

	@Prop({
		type: [String],
		default: undefined,
	})
	gallery?: string[];

	@Prop({
		type: [{ type: Types.ObjectId, ref: 'Yacht' }],
		default: undefined,
	})
	relatedYachtIds?: Types.ObjectId[];

	@Prop({
		type: String,
		enum: Object.values(ArticleStatus),
		required: true,
		default: ArticleStatus.DRAFT,
	})
	status!: ArticleStatus;

	@Prop({ type: Date })
	publishedAt?: Date;

	createdAt!: Date;
	updatedAt!: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

ArticleSchema.pre('validate', function (this: any) {
	if (typeof this.title === 'string') {
		this.title = this.title.trim();
	}

	if (typeof this.slug === 'string') {
		this.slug = this.slug.trim().toLowerCase();
	}
});

ArticleSchema.index({ slug: 1 }, { unique: true, name: 'article_slug_unique' });
ArticleSchema.index(
	{ status: 1, publishedAt: -1 },
	{ name: 'article_status_published_at_idx' },
);

export default ArticleSchema;
