import { Field, InputType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsDefined,
	IsOptional,
	IsString,
	IsNotEmpty,
	IsEnum,
	IsDate,
	IsArray,
	Matches,
	IsUUID,
} from 'class-validator';
import { ArticleCategory, ArticleStatus } from '../../enums/article.enum';

@InputType()
export class CreateArticleInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	authorId!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	title!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	@Field(() => String)
	slug!: string;

	@IsDefined()
	@IsEnum(ArticleCategory)
	@Field(() => ArticleCategory)
	category!: ArticleCategory;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	excerpt!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	content!: string;

	@IsDefined()
	@IsString()
	@IsNotEmpty()
	@Field(() => String)
	coverImage!: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	gallery?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	relatedYachtIds?: string[];

	@IsDefined()
	@IsEnum(ArticleStatus)
	@Field(() => ArticleStatus)
	status!: ArticleStatus;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	@Field(() => GraphQLISODateTime, { nullable: true })
	publishedAt?: Date;
}
