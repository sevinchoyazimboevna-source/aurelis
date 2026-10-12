import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { InquiryType, InquirySource } from '../../enums/inquiry.enum';

import { CreateInquiryInput } from './inquiry.input';

@InputType()
export class UpdateInquiryInput extends PartialType(CreateInquiryInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	type?: InquiryType;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	source?: InquirySource;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	firstName?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	lastName?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	email?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	message?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	consentAt?: Date;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	privacyPolicyVersion?: string;
}
