import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';

@ObjectType()
export class BrokerProfile {
	@Field(() => ID)
	_id: ObjectId;

	@Field(() => ID, { nullable: true })
	officeId?: ObjectId;

	@Field()
	name: string;

	@Field({ nullable: true })
	title?: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	phone?: string;

	@Field({ nullable: true })
	image?: string;

	@Field({ nullable: true })
	biography?: string;

	@Field(() => [String])
	languages: string[];

	@Field()
	isActive: boolean;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class BrokerProfiles {
	@Field(() => [BrokerProfile])
	list: BrokerProfile[];

	@Field()
	total: number;
}
