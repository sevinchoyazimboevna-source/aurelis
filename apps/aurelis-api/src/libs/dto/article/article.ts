import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { ArticleStatus, ArticleType } from '../../enums/article.enum';

@ObjectType()
export class Article {
	@Field(() => ID) _id: Types.ObjectId;
	@Field() title: string;
	@Field() slug: string;
	@Field(() => ArticleType) type: ArticleType;
	@Field(() => ArticleStatus) status: ArticleStatus;
	@Field({ nullable: true }) excerpt?: string;
	@Field({ nullable: true }) content?: string;
	@Field({ nullable: true }) coverImage?: string;
	@Field(() => [String]) images: string[];
	@Field({ nullable: true }) authorName?: string;
	@Field(() => ID, { nullable: true }) authorMemberId?: Types.ObjectId;
	@Field(() => Boolean) featured: boolean;
	@Field(() => Date, { nullable: true }) publishAt?: Date;
	@Field(() => Date, { nullable: true }) publishedAt?: Date;
	@Field(() => [ID]) yachtIds: Types.ObjectId[];
	@Field(() => [ID]) destinationIds: Types.ObjectId[];
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}

@ObjectType()
export class Articles {
	@Field(() => [Article]) list: Article[];
	@Field(() => Int) total: number;
	@Field(() => Int, { nullable: true }) page?: number;
	@Field(() => Int, { nullable: true }) limit?: number;
	@Field(() => Int, { nullable: true }) totalPages?: number;
}
