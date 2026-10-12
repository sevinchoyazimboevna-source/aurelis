import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { CreateWishlistInput } from './wishlist.input';

@InputType()
export class UpdateWishlistInput extends PartialType(CreateWishlistInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	memberId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	yachtId?: string;
}
