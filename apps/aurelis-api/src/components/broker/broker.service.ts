import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { BrokerProfile, BrokerProfiles } from '../../libs/dto/broker/broker';
import { BrokerCatalogInput, BrokerProfileInput } from '../../libs/dto/broker/broker.input';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { OfficeService } from '../office/office.service';

@Injectable()
export class BrokerService {
	constructor(
		@InjectModel('BrokerProfile') private readonly brokerModel: Model<BrokerProfile>,
		private readonly officeService: OfficeService,
		@InjectModel('Member') private readonly memberModel: Model<MemberRecord>,
	) {}

	async catalog(input: BrokerCatalogInput = new BrokerCatalogInput()): Promise<BrokerProfiles> {
		const { page = 1, limit = 20 } = input;
		if (
			!Number.isSafeInteger(page) ||
			page < 1 ||
			!Number.isInteger(limit) ||
			limit < 1 ||
			limit > 50 ||
			!Number.isSafeInteger((page - 1) * limit)
		) {
			throw new BadRequestException('Invalid broker pagination');
		}
		const filter = { isActive: true };
		const [list, total] = await Promise.all([
			this.brokerModel
				.find(filter)
				.sort({ name: 1, _id: 1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.brokerModel.countDocuments(filter).exec(),
		]);
		return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async getById(id: string): Promise<BrokerProfile> {
		if (!isValidObjectId(id)) throw new BadRequestException('Invalid broker ID');
		const profile = await this.brokerModel.findOne({ _id: id, isActive: true }).lean().exec();
		if (!profile) throw new NotFoundException('Broker profile not found');
		return profile;
	}

	async upsert(input: BrokerProfileInput): Promise<BrokerProfile> {
		const { _id, ...supplied } = input;
		const fields = Object.fromEntries(Object.entries(supplied).filter(([, value]) => value !== undefined));
		if (input.memberId !== undefined) {
			if (
				typeof input.memberId !== 'string' ||
				!/^[a-f0-9]{24}$/i.test(input.memberId) ||
				!(await this.memberModel.exists({ _id: input.memberId }))
			)
				throw new BadRequestException('Invalid broker member link');
		}
		if (input.officeId !== undefined) await this.officeService.validateId(input.officeId);
		const query = _id ? { _id } : { email: input.email.toLowerCase() };
		return this.brokerModel
			.findOneAndUpdate(query, { $set: fields }, { new: true, upsert: true, runValidators: true })
			.exec();
	}
}
