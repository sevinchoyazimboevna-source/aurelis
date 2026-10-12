import { Field, InputType, ID } from '@nestjs/graphql';

import { IsDefined, IsUUID } from 'class-validator';

@InputType()
export class CreateWishlistInput {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	memberId!: string;

	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	yachtId!: string;
}
