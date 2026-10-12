import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf, IsEnum } from 'class-validator';
import { AppLanguage } from '../../enums/account.enum';
import { CreateMemberRecordInput } from './account.input';

@InputType()
export class UpdateMemberRecordInput extends PartialType(CreateMemberRecordInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	name?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	@IsEnum(AppLanguage)
	preferredLanguage?: AppLanguage;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	password?: string;
}
