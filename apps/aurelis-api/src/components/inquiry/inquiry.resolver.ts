import { RateLimit } from '../../redis/rate-limit.guard';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
	CreateCharterInquiryInput,
	CreateSalesInquiryInput,
	CreateYachtInquiryInput,
	UpdateYachtInquiryInput,
	YachtInquiryAdminFilter,
	YachtInquiryCatalogInput,
} from '../../libs/dto/inquiry/yacht-inquiry.input';
import { YachtInquiry, YachtInquiries } from '../../libs/dto/inquiry/yacht-inquiry';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InquiryService } from './inquiry.service';
import { OptionalInquiryAuthGuard } from './optional-inquiry-auth.guard';
import { CurrentMember } from '../auth/decorators/current-member.decorator';
import { Member } from '../auth/auth.dto';

@Resolver(() => YachtInquiry)
export class InquiryResolver {
	constructor(private readonly inquiryService: InquiryService) {}

	@Mutation(() => YachtInquiry)
	@UseGuards(OptionalInquiryAuthGuard)
	@RateLimit('inquiry')
	async submitYachtInquiry(
		@Args('input') input: CreateYachtInquiryInput,
		@CurrentMember() member?: Member,
	): Promise<YachtInquiry> {
		return this.inquiryService.create(input, member);
	}

	@Mutation(() => YachtInquiry)
	@UseGuards(OptionalInquiryAuthGuard)
	@RateLimit('inquiry')
	async submitSalesInquiry(
		@Args('input') input: CreateSalesInquiryInput,
		@CurrentMember() member?: Member,
	): Promise<YachtInquiry> {
		return this.inquiryService.createSales(input, member);
	}

	@Mutation(() => YachtInquiry)
	@UseGuards(OptionalInquiryAuthGuard)
	@RateLimit('inquiry')
	async submitCharterInquiry(
		@Args('input') input: CreateCharterInquiryInput,
		@CurrentMember() member?: Member,
	): Promise<YachtInquiry> {
		return this.inquiryService.createCharter(input, member);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => YachtInquiries)
	async getYachtInquiries(@Args('input') input: YachtInquiryAdminFilter): Promise<YachtInquiries> {
		return this.inquiryService.list(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => YachtInquiries)
	getYachtInquiriesPage(@Args('input', { nullable: true }) input?: YachtInquiryCatalogInput): Promise<YachtInquiries> {
		return this.inquiryService.catalog(input ?? new YachtInquiryCatalogInput());
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => YachtInquiry)
	getYachtInquiry(@Args('id', { type: () => ID }) id: string): Promise<YachtInquiry> {
		return this.inquiryService.getById(id);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => YachtInquiry)
	async updateYachtInquiry(@Args('input') input: UpdateYachtInquiryInput): Promise<YachtInquiry> {
		return this.inquiryService.update(input);
	}
}
