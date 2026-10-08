import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { CrewRole, CrewStatus } from '../../enums/crew.enum';

@ObjectType()
export class CrewProfile {
	@Field(() => ID)
	_id: Types.ObjectId;

	@Field(() => ID, { nullable: true })
	memberId?: Types.ObjectId;

	@Field(() => CrewRole)
	role: CrewRole;

	@Field(() => CrewStatus)
	status: CrewStatus;

	@Field()
	firstName: string;

	@Field({ nullable: true })
	lastName?: string;

	// The resolver derives this when no explicit presentation name is stored.
	@Field(() => String)
	displayName?: string;

	@Field({ nullable: true })
	nationality?: string;

	@Field({ nullable: true })
	location?: string;

	@Field({ nullable: true })
	bio?: string;

	@Field(() => Int, { nullable: true })
	experienceYears?: number;

	@Field(() => [String])
	languages: string[];

	@Field({ nullable: true })
	profileImage?: string;

	@Field(() => [String])
	images: string[];

	@Field()
	featured: boolean;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Crews {
	@Field(() => [CrewProfile])
	list: CrewProfile[];

	@Field(() => Int)
	total: number;

	@Field(() => Int, { nullable: true })
	page?: number;

	@Field(() => Int, { nullable: true })
	limit?: number;

	@Field(() => Int, { nullable: true })
	totalPages?: number;
}
