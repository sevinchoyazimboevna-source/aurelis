import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { Season } from '../../enums/yacht-destination.enum';
import { CreateYachtDestinationInput } from './yacht-destination.input';

@InputType()
export class UpdateYachtDestinationInput extends PartialType(
	CreateYachtDestinationInput,
	{ skipNullProperties: false },
) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	yachtId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	destinationId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	season?: Season;
}
