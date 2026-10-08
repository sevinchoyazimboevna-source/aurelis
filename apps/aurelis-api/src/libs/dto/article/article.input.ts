import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsDate,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { ArticleSortBy, ArticleStatus, ArticleType } from '../../enums/article.enum';

const trimValue = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const Trim = () => Transform(({ value }) => trimValue(value));
const TrimArray = () =>
	Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? (value as unknown[]).map(trimValue) : value));
const objectIdIdentity = (value: unknown): unknown => (typeof value === 'string' ? value.toLowerCase() : value);

@InputType({ isAbstract: true })
export class ArticleFields {
	@Field()
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(200)
	title: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsString()
	@MinLength(1)
	@MaxLength(200)
	slug?: string;

	@Field(() => ArticleType)
	@IsEnum(ArticleType)
	type: ArticleType;

	@Field(() => ArticleStatus, { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsEnum(ArticleStatus)
	status?: ArticleStatus;

	@Field({ nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MaxLength(1000)
	excerpt?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(200000)
	content?: string;

	@Field({ nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(2048)
	coverImage?: string;

	@Field(() => [String], { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@TrimArray()
	@IsArray()
	@IsString({ each: true })
	@MinLength(1, { each: true })
	@MaxLength(2048, { each: true })
	images?: string[];

	@Field({ nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@Trim()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	authorName?: string;

	@Field(() => ID, { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsMongoId()
	authorMemberId?: string;

	@Field(() => Boolean, { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsBoolean()
	featured?: boolean;

	@Field(() => Date, { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@Type(() => Date)
	@IsDate()
	publishAt?: Date;

	@Field(() => [ID], { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsArray()
	@IsMongoId({ each: true })
	@ArrayUnique(objectIdIdentity)
	yachtIds?: string[];

	@Field(() => [ID], { nullable: true })
	@ValidateIf((_object, value: unknown) => value !== undefined)
	@IsArray()
	@IsMongoId({ each: true })
	@ArrayUnique(objectIdIdentity)
	destinationIds?: string[];
}

@InputType()
export class CreateArticleInput extends ArticleFields {}

@InputType()
export class UpdateArticleInput extends PartialType(ArticleFields, { skipNullProperties: false }) {
	@Field(() => ID)
	@IsMongoId()
	_id: string;
}

@InputType()
export class ArticleFilterInput {
	@Field(() => ArticleType, { nullable: true }) @IsOptional() @IsEnum(ArticleType) type?: ArticleType;
	@Field(() => ArticleStatus, { nullable: true }) @IsOptional() @IsEnum(ArticleStatus) status?: ArticleStatus;
	@Field(() => Boolean, { nullable: true }) @IsOptional() @IsBoolean() featured?: boolean;
	@Field(() => ID, { nullable: true }) @IsOptional() @IsMongoId() authorMemberId?: string;
	@Field(() => ID, { nullable: true }) @IsOptional() @IsMongoId() yachtId?: string;
	@Field(() => ID, { nullable: true }) @IsOptional() @IsMongoId() destinationId?: string;
	@Field({ nullable: true }) @IsOptional() @Trim() @IsString() @MaxLength(200) search?: string;
}

@InputType()
export class ArticleCatalogInput {
	@Field(() => ArticleFilterInput, { nullable: true })
	@IsOptional()
	@ValidateNested()
	@Type(() => ArticleFilterInput)
	filter?: ArticleFilterInput;

	@Field(() => ArticleSortBy, { nullable: true, defaultValue: ArticleSortBy.PUBLISHED_NEWEST })
	@IsOptional()
	@IsEnum(ArticleSortBy)
	sortBy = ArticleSortBy.PUBLISHED_NEWEST;

	@Field(() => Int, { nullable: true, defaultValue: 1 }) @IsOptional() @IsInt() @Min(1) page = 1;
	@Field(() => Int, { nullable: true, defaultValue: 20 }) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 20;
}
