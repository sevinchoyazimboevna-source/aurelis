import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';
import { CreateDestinationInput } from './destination.input';

@InputType()
export class UpdateDestinationInput extends PartialType(CreateDestinationInput, {
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
	slug?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	region?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	country?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	description?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	heroImage?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ContentStatus;
}
