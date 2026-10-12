import { Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsUUID, IsDefined, ValidateIf } from 'class-validator';
import { ContentStatus } from '../../enums/yacht.enum';
import { Department } from '../../enums/team-member.enum';
import { CreateTeamMemberInput } from './team-member.input';

@InputType()
export class UpdateTeamMemberInput extends PartialType(CreateTeamMemberInput, {
	skipNullProperties: false,
}) {
	@IsDefined()
	@IsUUID()
	@Field(() => ID)
	_id!: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	officeId?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	slug?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	firstName?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	lastName?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	jobTitle?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	department?: Department;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	photo?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	bio?: string;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	languages?: string[];

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	sortOrder?: number;

	@ValidateIf((_object, value) => value !== undefined)
	@IsDefined()
	status?: ContentStatus;
}
