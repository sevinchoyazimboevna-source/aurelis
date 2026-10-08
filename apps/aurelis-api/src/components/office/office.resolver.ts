import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Office, Offices } from '../../libs/dto/office/office';
import { CreateOfficeInput, OfficeCatalogInput, UpdateOfficeInput } from '../../libs/dto/office/office.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OfficeService } from './office.service';

@Resolver(() => Office)
export class OfficeResolver {
	constructor(private readonly officeService: OfficeService) {}
	@Query(() => Offices)
	getOffices(@Args('input') input: OfficeCatalogInput): Promise<Offices> {
		return this.officeService.catalog(input);
	}
	@Query(() => Office)
	getOffice(@Args('slug') slug: string): Promise<Office> {
		return this.officeService.getBySlug(slug);
	}
	@Query(() => Offices)
	getFeaturedOffices(@Args('input', { nullable: true }) input?: OfficeCatalogInput): Promise<Offices> {
		return this.officeService.catalog(input ?? new OfficeCatalogInput(), true);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Offices)
	getOfficesForAdmin(@Args('input') input: OfficeCatalogInput): Promise<Offices> {
		return this.officeService.getForAdmin(input);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Office)
	createOffice(@Args('input') input: CreateOfficeInput): Promise<Office> {
		return this.officeService.create(input);
	}
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Office)
	updateOffice(@Args('input') input: UpdateOfficeInput): Promise<Office> {
		return this.officeService.update(input);
	}
}
