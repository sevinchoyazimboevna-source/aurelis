import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Yacht, Yachts } from '../../libs/dto/yacht/yacht';
import { YachtCatalogInput, YachtInput, YachtUpdateInput } from '../../libs/dto/yacht/yacht.input';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BrokerService } from '../broker/broker.service';
import { YachtService } from './yacht.service';

@Resolver(() => Yacht)
export class YachtResolver {
	constructor(private readonly yachtService: YachtService, private readonly brokerService: BrokerService) {}

	@ResolveField('broker')
	async resolveBroker(@Parent() yacht: Yacht): Promise<Yacht['broker']> {
		if (yacht.broker) return yacht.broker;
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

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Yachts)
	async getYachtsForStaff(@Args('input') input: YachtCatalogInput): Promise<Yachts> {
		return this.yachtService.getForStaff(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Yacht)
	async createYacht(@Args('input') input: YachtInput): Promise<Yacht> {
		return this.yachtService.create(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Yacht)
	async updateYacht(@Args('input') input: YachtUpdateInput): Promise<Yacht> {
		return this.yachtService.update(input);
	}
}
