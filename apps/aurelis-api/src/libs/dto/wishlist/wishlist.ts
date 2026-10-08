import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';

@ObjectType()
export class WishlistItem {
	@Field(() => ID) _id: Types.ObjectId;
	@Field(() => ID) yachtId: Types.ObjectId;
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}

@ObjectType()
export class WishlistItems {
	@Field(() => [WishlistItem]) list: WishlistItem[];
	@Field(() => Int) total: number;
	@Field(() => Int, { nullable: true }) page?: number;
	@Field(() => Int, { nullable: true }) limit?: number;
	@Field(() => Int, { nullable: true }) totalPages?: number;
}

@ObjectType()
export class WishlistToggleResult {
	@Field(() => Boolean) wishlisted: boolean;
	@Field(() => ID) yachtId: string;
}
