import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { YachtType, ContentStatus } from '../../enums/yacht.enum';
import { CreateYachtInput } from './yacht.input';

@InputType()
export class UpdateYachtInput extends PartialType(CreateYachtInput, {
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
	yachtType?: YachtType;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	buildYear?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	lengthM?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	cabins?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	guestCapacity?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	crewCapacity?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	description?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	images?: string[];

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ContentStatus;
}
