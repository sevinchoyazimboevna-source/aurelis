import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Destination, Destinations } from '../../libs/dto/destination/destination';
import {
	CreateDestinationInput,
	DestinationCatalogInput,
	UpdateDestinationInput,
} from '../../libs/dto/destination/destination.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DestinationService } from './destination.service';

@Resolver(() => Destination)
export class DestinationResolver {
	constructor(private readonly destinationService: DestinationService) {}
	@Query(() => Destinations)
	getDestinations(@Args('input') input: DestinationCatalogInput): Promise<Destinations> {
		return this.destinationService.catalog(input);
	}
	@Query(() => Destination)
	getDestination(@Args('slug') slug: string): Promise<Destination> {
		return this.destinationService.getBySlug(slug);
	}
	@Query(() => Destinations)
	getFeaturedDestinations(@Args('input', { nullable: true }) input?: DestinationCatalogInput): Promise<Destinations> {
		return this.destinationService.catalog(input ?? new DestinationCatalogInput(), true);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Destinations)
	getDestinationsForAdmin(@Args('input') input: DestinationCatalogInput): Promise<Destinations> {
		return this.destinationService.getForAdmin(input);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Destination)
	createDestination(@Args('input') input: CreateDestinationInput): Promise<Destination> {
		return this.destinationService.create(input);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Destination)
	updateDestination(@Args('input') input: UpdateDestinationInput): Promise<Destination> {
		return this.destinationService.update(input);
	}
}
