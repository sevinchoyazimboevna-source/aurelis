import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ArticleCategory, ArticleStatus } from '../../enums/article.enum';

@ObjectType('Article')
export class Article {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	authorId!: string;

	@Expose()
	@Field(() => String)
	title!: string;

	@Expose()
	@Field(() => String)
	slug!: string;

	@Expose()
	@Field(() => ArticleCategory)
	category!: ArticleCategory;

	@Expose()
	@Field(() => String)
	excerpt!: string;

	@Expose()
	@Field(() => String)
	content!: string;

	@Expose()
	@Field(() => String)
	coverImage!: string;

	@Expose()
	@Field(() => [String], { nullable: true })
	gallery?: string[];

	@Expose()
	@Field(() => [String], { nullable: true })
	relatedYachtIds?: string[];

	@Expose()
	@Field(() => ArticleStatus)
	status!: ArticleStatus;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	publishedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
