import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';
import { ContentStatus } from '../../enums/yacht.enum';
import { Department } from '../../enums/team-member.enum';

@ObjectType('TeamMember')
export class TeamMember {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => ID)
	officeId!: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	memberId?: string;

	@Expose()
	@Field(() => String)
	slug!: string;

	@Expose()
	@Field(() => String)
	firstName!: string;

	@Expose()
	@Field(() => String)
	lastName!: string;

	@Expose()
	@Field(() => String)
	jobTitle!: string;

	@Expose()
	@Field(() => Department)
	department!: Department;

	@Expose()
	@Field(() => String)
	photo!: string;

	@Expose()
	@Field(() => String)
	bio!: string;

	@Expose()
	@Field(() => [String])
	languages!: string[];

	@Expose()
	@Field(() => String, { nullable: true })
	phone?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	email?: string;

	@Expose()
	@Field(() => Int)
	sortOrder!: number;

	@Expose()
	@Field(() => ContentStatus)
	status!: ContentStatus;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
