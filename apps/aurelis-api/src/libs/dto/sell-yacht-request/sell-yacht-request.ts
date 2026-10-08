import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { SellYachtRequestStatus } from '../../enums/sell-yacht-request.enum';

@ObjectType()
export class SellYachtRequest {
	@Field(() => ID) _id: Types.ObjectId;
	@Field(() => SellYachtRequestStatus) status: SellYachtRequestStatus;
	@Field(() => ID, { nullable: true }) memberId?: Types.ObjectId;
	@Field() ownerName: string;
	@Field() email: string;
	@Field() phone: string;
	@Field() yachtName: string;
	@Field() builder: string;
	@Field({ nullable: true }) model?: string;
	@Field(() => Int) yearBuilt: number;
	@Field(() => Float) lengthM: number;
	@Field() location: string;
	@Field() country: string;
	@Field(() => Float, { nullable: true }) askingPrice?: number;
	@Field({ nullable: true }) currency?: string;
	@Field({ nullable: true }) description?: string;
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}

@ObjectType()
export class SellYachtRequests {
	@Field(() => [SellYachtRequest]) list: SellYachtRequest[];
	@Field(() => Int) total: number;
	@Field(() => Int, { nullable: true }) page?: number;
	@Field(() => Int, { nullable: true }) limit?: number;
	@Field(() => Int, { nullable: true }) totalPages?: number;
}
