import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Yacht } from '../../libs/dto/yacht/yacht';
import { YachtListingFilterInput } from '../../libs/dto/yacht-listing/yacht-listing.input';
import { CreateYachtInput, UpdateYachtInput } from '../../libs/dto';
import { YachtService } from './yacht.service';

@Resolver(() => Yacht)
export class YachtResolver {
	constructor(private readonly yachtService: YachtService) {}

	@Query(() => [Yacht], { name: 'yachts' })
	async getYachts(
		@Args('filter', { type: () => YachtListingFilterInput, nullable: true })
		filter?: YachtListingFilterInput,
	): Promise<Yacht[]> {
		const result = await this.yachtService.findPublicYachts(
			filter ?? new YachtListingFilterInput(),
		);
		return result.items;
	}

	@Query(() => Yacht, { name: 'yacht', nullable: true })
	async getYacht(@Args('id', { type: () => String }) id: string): Promise<Yacht | null> {
		return this.yachtService.findPublicYacht(id);
	}

	@Mutation(() => Yacht, { name: 'createYacht' })
	async createYacht(@Args('input') input: CreateYachtInput): Promise<Yacht> {
		return this.yachtService.create(input);
	}

	@Mutation(() => Yacht, { name: 'updateYacht' })
	async updateYacht(@Args('input') input: UpdateYachtInput): Promise<Yacht> {
		return this.yachtService.update(input);
	}
}
