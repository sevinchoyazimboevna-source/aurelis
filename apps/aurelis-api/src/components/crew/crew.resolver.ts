import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CrewProfile, Crews } from '../../libs/dto/crew/crew';
import { CrewCatalogInput, CreateCrewProfileInput, UpdateCrewProfileInput } from '../../libs/dto/crew/crew.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CrewService } from './crew.service';

@Resolver(() => CrewProfile)
export class CrewResolver {
	constructor(private readonly crewService: CrewService) {}

	@ResolveField('displayName', () => String)
	resolveDisplayName(@Parent() profile: CrewProfile): string {
		return profile.displayName ?? [profile.firstName, profile.lastName].filter(Boolean).join(' ');
	}

	@Query(() => Crews)
	getCrews(@Args('input') input: CrewCatalogInput): Promise<Crews> {
		return this.crewService.catalog(input);
	}

	@Query(() => CrewProfile)
	getCrew(@Args('id', { type: () => ID }) id: string): Promise<CrewProfile> {
		return this.crewService.getById(id);
	}

	@Query(() => Crews)
	getFeaturedCrews(@Args('input', { nullable: true }) input?: CrewCatalogInput): Promise<Crews> {
		return this.crewService.catalog(input ?? new CrewCatalogInput(), true);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Crews)
	getCrewsForStaff(@Args('input') input: CrewCatalogInput): Promise<Crews> {
		return this.crewService.getForStaff(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => CrewProfile)
	createCrewProfile(@Args('input') input: CreateCrewProfileInput): Promise<CrewProfile> {
		return this.crewService.create(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => CrewProfile)
	updateCrewProfile(@Args('input') input: UpdateCrewProfileInput): Promise<CrewProfile> {
		return this.crewService.update(input);
	}
}
