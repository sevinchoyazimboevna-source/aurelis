import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { AppLanguage } from '../../libs/enums/account.enum';

@Injectable()
export class MemberService {
	async updateOwnLanguage(
		memberId: string,
		preferredLanguage: AppLanguage,
	): Promise<{ _id: string; preferredLanguage: AppLanguage }> {
		if (!memberId) {
			throw new BadRequestException('Member id is required');
		}

		if (!Object.values(AppLanguage).includes(preferredLanguage)) {
			throw new BadRequestException('Invalid language preference');
		}

		return {
			_id: memberId,
			preferredLanguage,
		};
	}
}
