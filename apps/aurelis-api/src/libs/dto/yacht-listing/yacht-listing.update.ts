import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { ListingType, ListingStatus } from '../../enums/yacht-listing.enum';
import { CreateYachtListingInput } from './yacht-listing.input';

@InputType()
export class UpdateYachtListingInput extends PartialType(CreateYachtListingInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	yachtId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	listingType?: ListingType;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	currency?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	priceOnRequest?: boolean;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ListingStatus;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	isFeatured?: boolean;
}
