import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';
import { CreateOfficeInput } from './office.input';

@InputType()
export class UpdateOfficeInput extends PartialType(CreateOfficeInput, {
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
	city?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	address?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	latitude?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	longitude?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	phone?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	email?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	timezone?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	coverImage?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ContentStatus;
}
