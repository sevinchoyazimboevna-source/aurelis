import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { InquiryStatus, InquiryType } from '../../enums/inquiry.enum';

@ObjectType()
export class YachtInquiry {
	@Field(() => ID)
	_id: ObjectId;

	@Field(() => InquiryType)
	type: InquiryType;

	@Field(() => InquiryStatus)
	status: InquiryStatus;

	@Field(() => ID)
	yachtId: ObjectId;

	@Field(() => ID, { nullable: true })
	memberId?: ObjectId;

	@Field()
	name: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	phone?: string;

	@Field()
	message: string;

	@Field(() => Date, { nullable: true })
	startDate?: Date;

	@Field(() => Date, { nullable: true })
	endDate?: Date;

	@Field(() => Int, { nullable: true })
	guestCount?: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class YachtInquiries {
	@Field(() => [YachtInquiry])
	list: YachtInquiry[];

	@Field()
	total: number;

	@Field(() => Int, { nullable: true }) page?: number;
	@Field(() => Int, { nullable: true }) limit?: number;
	@Field(() => Int, { nullable: true }) totalPages?: number;
}
