import { RateLimit } from '../../redis/rate-limit.guard';
import { Args, Float, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Yacht, Yachts } from '../../libs/dto/yacht/yacht';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { YachtCatalogInput, YachtInput, YachtUpdateInput } from '../../libs/dto/yacht/yacht.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BrokerService } from '../broker/broker.service';
import { YachtService } from './yacht.service';

@Resolver(() => Yacht)
export class YachtResolver {
	constructor(
		private readonly yachtService: YachtService,
		private readonly brokerService: BrokerService,
	) {}

	@Mutation(() => Int)
	@RateLimit('view')
	async recordYachtView(@Args('yachtId', { type: () => ID }) yachtId: string): Promise<number> {
		return this.yachtService.recordView(yachtId);
	}

	@ResolveField('viewsCount', () => Int)
	resolveViewsCount(@Parent() yacht: Yacht): number {
		return yacht.viewsCount ?? 0;
	}

	@ResolveField('likesCount', () => Int)
	resolveLikesCount(@Parent() yacht: Yacht): number {
		return yacht.likesCount ?? 0;
	}

	@ResolveField('charterRate', () => Float, { nullable: true })
	resolveCharterRate(@Parent() yacht: Yacht): number | undefined {
		return yacht.charterPrice;
	}

	@ResolveField('destinationIds', () => [ID])
	resolveDestinationIds(@Parent() yacht: Yacht): NonNullable<Yacht['destinationIds']> {
		return yacht.destinationIds ?? [];
	}

	@ResolveField('broker', () => BrokerProfile, { nullable: true })
	async resolveBroker(@Parent() yacht: Yacht): Promise<Yacht['broker']> {
		if (Object.prototype.hasOwnProperty.call(yacht, 'broker')) return yacht.broker;
		return this.brokerService.getById(String(yacht.brokerId));
	}

	@Query(() => Yachts)
	async getYachts(@Args('input') input: YachtCatalogInput): Promise<Yachts> {
		return this.yachtService.catalog(input);
	}

	@Query(() => Yachts)
	async getFeaturedYachts(@Args('input', { nullable: true }) input?: YachtCatalogInput): Promise<Yachts> {
		return this.yachtService.catalog(input ?? new YachtCatalogInput(), true);
	}

	@Query(() => Yacht)
	async getYacht(@Args('id', { type: () => ID }) id: string): Promise<Yacht> {
		return this.yachtService.getById(id);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Yachts)
	async getYachtsForStaff(@Args('input') input: YachtCatalogInput): Promise<Yachts> {
		return this.yachtService.getForStaff(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Yacht)
	async createYacht(@Args('input') input: YachtInput): Promise<Yacht> {
		return this.yachtService.create(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Yacht)
	async updateYacht(@Args('input') input: YachtUpdateInput): Promise<Yacht> {
		return this.yachtService.update(input);
	}
}
