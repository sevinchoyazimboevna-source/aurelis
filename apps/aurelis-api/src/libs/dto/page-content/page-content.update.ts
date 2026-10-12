import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { PageKey, PageStatus } from '../../enums/page-content.enum';
import { JsonValue } from '../../types/json.type';
import { CreatePageContentInput } from './page-content.input';

@InputType()
export class UpdatePageContentInput extends PartialType(CreatePageContentInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	pageKey?: PageKey;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	locale?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	title?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	sections?: JsonValue;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: PageStatus;
}
