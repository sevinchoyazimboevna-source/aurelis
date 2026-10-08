import { Args, ID, Query, Resolver, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BrokerProfile, BrokerProfiles } from '../../libs/dto/broker/broker';
import { BrokerProfileInput } from '../../libs/dto/broker/broker.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BrokerService } from './broker.service';

@Resolver(() => BrokerProfile)
export class BrokerResolver {
	constructor(private readonly brokerService: BrokerService) {}

	@Query(() => BrokerProfiles)
	async getBrokerProfiles(): Promise<BrokerProfiles> {
		const list = await this.brokerService.listActive();
		return { list, total: list.length };
	}

	@Query(() => BrokerProfile)
	async getBrokerProfile(@Args('id', { type: () => ID }) id: string): Promise<BrokerProfile> {
		return this.brokerService.getById(id);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => BrokerProfile)
	async saveBrokerProfile(@Args('input') input: BrokerProfileInput): Promise<BrokerProfile> {
		return this.brokerService.upsert(input);
	}
}
