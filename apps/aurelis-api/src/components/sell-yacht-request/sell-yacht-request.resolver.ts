import { RateLimit } from '../../redis/rate-limit.guard';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Member } from '../auth/auth.dto';
import { CurrentMember } from '../auth/decorators/current-member.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalInquiryAuthGuard } from '../inquiry/optional-inquiry-auth.guard';
import { MemberRole } from '../../libs/enums/member.enum';
import { SellYachtRequest, SellYachtRequests } from '../../libs/dto/sell-yacht-request/sell-yacht-request';
import {
	CreateSellYachtRequestInput,
	SellYachtRequestCatalogInput,
	UpdateSellYachtRequestStatusInput,
} from '../../libs/dto/sell-yacht-request/sell-yacht-request.input';
import { SellYachtRequestService } from './sell-yacht-request.service';

@Resolver(() => SellYachtRequest)
export class SellYachtRequestResolver {
	constructor(private readonly requestService: SellYachtRequestService) {}

	@Mutation(() => SellYachtRequest)
	@UseGuards(OptionalInquiryAuthGuard)
	@RateLimit('sell')
	submitSellYachtRequest(
		@Args('input') input: CreateSellYachtRequestInput,
		@CurrentMember() member?: Member,
	): Promise<SellYachtRequest> {
		return this.requestService.create(input, member);
	}

	@Query(() => SellYachtRequests)
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	getSellYachtRequestsForAdmin(
		@Args('input', { nullable: true }) input?: SellYachtRequestCatalogInput,
	): Promise<SellYachtRequests> {
		return this.requestService.list(input ?? new SellYachtRequestCatalogInput());
	}

	@Query(() => SellYachtRequest)
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	getSellYachtRequest(@Args('id', { type: () => ID }) id: string): Promise<SellYachtRequest> {
		return this.requestService.getById(id);
	}

	@Mutation(() => SellYachtRequest)
	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	updateSellYachtRequestStatus(@Args('input') input: UpdateSellYachtRequestStatusInput): Promise<SellYachtRequest> {
		return this.requestService.updateStatus(input);
	}
}
