import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CreateYachtInquiryInput, UpdateYachtInquiryInput, YachtInquiryAdminFilter } from '../../libs/dto/inquiry/yacht-inquiry.input';
import { YachtInquiry, YachtInquiries } from '../../libs/dto/inquiry/yacht-inquiry';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InquiryService } from './inquiry.service';

@Resolver(() => YachtInquiry)
export class InquiryResolver {
	constructor(private readonly inquiryService: InquiryService) {}

	@Mutation(() => YachtInquiry)
	async submitYachtInquiry(@Args('input') input: CreateYachtInquiryInput): Promise<YachtInquiry> {
		return this.inquiryService.create(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => YachtInquiries)
	async getYachtInquiries(@Args('input') input: YachtInquiryAdminFilter): Promise<YachtInquiries> {
		return this.inquiryService.list(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => YachtInquiry)
	async updateYachtInquiry(@Args('input') input: UpdateYachtInquiryInput): Promise<YachtInquiry> {
		return this.inquiryService.update(input);
	}
}
