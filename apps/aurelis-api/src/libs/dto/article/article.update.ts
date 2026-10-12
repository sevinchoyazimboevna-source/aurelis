import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { ArticleCategory, ArticleStatus } from '../../enums/article.enum';
import { CreateArticleInput } from './article.input';

@InputType()
export class UpdateArticleInput extends PartialType(CreateArticleInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	authorId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	title?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	slug?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	category?: ArticleCategory;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	excerpt?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	content?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	coverImage?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ArticleStatus;
}
