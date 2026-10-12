import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { CreateNewsletterSubscriptionInput } from './newsletter-subscription.input';

@InputType()
export class UpdateNewsletterSubscriptionInput extends PartialType(
	CreateNewsletterSubscriptionInput,
	{ skipNullProperties: false },
) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	email?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	language?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	consentAt?: Date;
}
