import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WishlistItem, WishlistItems, WishlistToggleResult } from '../../libs/dto/wishlist/wishlist';
import { WishlistCatalogInput } from '../../libs/dto/wishlist/wishlist.input';
import { Member } from '../auth/auth.dto';
import { CurrentMember } from '../auth/decorators/current-member.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WishlistService } from './wishlist.service';

@UseGuards(AuthGuard)
@Resolver(() => WishlistItem)
export class WishlistResolver {
	constructor(private readonly wishlistService: WishlistService) {}

	@Query(() => WishlistItems)
	getMyWishlist(
		@CurrentMember() member: Member,
		@Args('input', { nullable: true }) input?: WishlistCatalogInput,
	): Promise<WishlistItems> {
		return this.wishlistService.getMine(member, input ?? new WishlistCatalogInput());
	}

	@Mutation(() => WishlistItem)
	addYachtToWishlist(
		@CurrentMember() member: Member,
		@Args('yachtId', { type: () => ID }) yachtId: string,
	): Promise<WishlistItem> {
		return this.wishlistService.add(member, yachtId);
	}

	@Mutation(() => Boolean)
	removeYachtFromWishlist(
		@CurrentMember() member: Member,
		@Args('yachtId', { type: () => ID }) yachtId: string,
	): Promise<boolean> {
		return this.wishlistService.remove(member, yachtId);
	}

	@Mutation(() => WishlistToggleResult)
	toggleYachtWishlist(
		@CurrentMember() member: Member,
		@Args('yachtId', { type: () => ID }) yachtId: string,
	): Promise<WishlistToggleResult> {
		return this.wishlistService.toggle(member, yachtId);
	}

	@Query(() => Boolean)
	isYachtWishlisted(
		@CurrentMember() member: Member,
		@Args('yachtId', { type: () => ID }) yachtId: string,
	): Promise<boolean> {
		return this.wishlistService.isWishlisted(member, yachtId);
	}
}
