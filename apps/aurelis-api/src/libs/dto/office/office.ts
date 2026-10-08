import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { DayOfWeek, OfficeStatus } from '../../enums/office.enum';
@ObjectType()
export class OfficeBusinessHours {
	@Field(() => DayOfWeek) day: DayOfWeek;
	@Field(() => String, { nullable: true }) openTime?: string | null;
	@Field(() => String, { nullable: true }) closeTime?: string | null;
	@Field(() => Boolean) closed: boolean;
}
@ObjectType()
export class Office {
	@Field(() => ID) _id: Types.ObjectId;
	@Field() name: string;
	@Field() country: string;
	@Field() city: string;
	@Field() addressLine1: string;
	@Field({ nullable: true }) addressLine2?: string;
	@Field({ nullable: true }) postalCode?: string;
	@Field({ nullable: true }) phone?: string;
	@Field({ nullable: true }) shortDescription?: string;
	@Field({ nullable: true }) description?: string;
	@Field({ nullable: true }) heroImage?: string;
	@Field() slug: string;
	@Field(() => OfficeStatus) status: OfficeStatus;
	@Field({ nullable: true }) email?: string;
	@Field({ nullable: true }) timezone?: string;
	@Field(() => [OfficeBusinessHours]) businessHours: OfficeBusinessHours[];
	@Field(() => [String]) images: string[];
	@Field(() => Boolean) featured: boolean;
	@Field(() => Int, { nullable: true }) sortOrder?: number;
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}
@ObjectType()
export class Offices {
	@Field(() => [Office]) list: Office[];
	@Field(() => Int) total: number;
	@Field(() => Int, { nullable: true }) page?: number;
	@Field(() => Int, { nullable: true }) limit?: number;
	@Field(() => Int, { nullable: true }) totalPages?: number;
}
