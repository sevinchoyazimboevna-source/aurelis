import { Field, InputType, ID } from '@nestjs/graphql';

import { IsDefined, IsEnum, IsUUID } from 'class-validator';
import { Season } from '../../enums/yacht-destination.enum';

@InputType()
export class CreateYachtDestinationInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	yachtId!: string;

	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	destinationId!: string;

	@IsDefined()
	@IsEnum(Season)
	@Field(() => Season)
	season!: Season;
}
