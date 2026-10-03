import { UnauthorizedException } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { StaffLoginInput, StaffSession } from './staff-auth.dto';

interface StaffAccount {
	_id: { toString(): string };
	memberNick: string;
	memberType: MemberType;
	memberStatus: MemberStatus;
	memberPassword?: string;
}

@Resolver()
export class StaffAuthResolver {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<StaffAccount>,
		private readonly authService: AuthService,
	) {}

	@Mutation(() => StaffSession)
	async staffLogin(@Args('input') input: StaffLoginInput): Promise<StaffSession> {
		const staff = await this.memberModel
			.findOne({ memberNick: input.memberNick, memberType: MemberType.ADMIN, memberStatus: MemberStatus.ACTIVE })
			.select('+memberPassword')
			.exec();
		if (!staff?.memberPassword || !(await this.authService.comparePasswords(input.memberPassword, staff.memberPassword))) {
			throw new UnauthorizedException('Invalid staff credentials');
		}
		const accessToken = await this.authService.createToken({
			_id: staff._id.toString(),
			memberNick: staff.memberNick,
			memberType: staff.memberType,
			memberStatus: staff.memberStatus,
		});
		return { _id: staff._id.toString(), memberNick: staff.memberNick, memberType: staff.memberType, accessToken };
	}
}
