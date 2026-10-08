import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import {
	CreateSellYachtRequestInput,
	SellYachtRequestCatalogInput,
	UpdateSellYachtRequestStatusInput,
} from '../../libs/dto/sell-yacht-request/sell-yacht-request.input';
import { SellYachtRequest, SellYachtRequests } from '../../libs/dto/sell-yacht-request/sell-yacht-request';
import { SellYachtRequestStatus } from '../../libs/enums/sell-yacht-request.enum';
import type { Member } from '../auth/auth.dto';
import { AuthErrorCode, authError } from '../auth/auth-errors';

@Injectable()
export class SellYachtRequestService {
	constructor(@InjectModel('SellYachtRequest') private readonly requestModel: Model<SellYachtRequest>) {}

	async create(input: CreateSellYachtRequestInput, member?: Member): Promise<SellYachtRequest> {
		const fields = plainToInstance(CreateSellYachtRequestInput, input);
		validateInput(fields);
		if (fields.askingPrice !== undefined && fields.currency === undefined)
			throw new BadRequestException('Asking price requires currency');
		let memberId: Types.ObjectId | undefined;
		if (member) {
			if (typeof member._id !== 'string' || !/^[a-f0-9]{24}$/i.test(member._id))
				throw authError(AuthErrorCode.UNAUTHENTICATED);
			memberId = new Types.ObjectId(member._id);
		}
		// Lead intake only: no inventory, broker, destination or Member writes.
		return this.requestModel.create({
			...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
			status: SellYachtRequestStatus.NEW,
			...(memberId ? { memberId } : {}),
		});
	}

	async list(input: SellYachtRequestCatalogInput): Promise<SellYachtRequests> {
		const fields = plainToInstance(SellYachtRequestCatalogInput, input);
		validateInput(fields);
		const { page, limit } = fields;
		const match: FilterQuery<SellYachtRequest> = {};
		for (const key of ['status', 'country', 'builder', 'email'] as const)
			if (fields[key] !== undefined) match[key] = fields[key];
		const [list, total] = await Promise.all([
			this.requestModel
				.find(match)
				.sort({ createdAt: -1, _id: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.requestModel.countDocuments(match),
		]);
		return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async getById(id: string): Promise<SellYachtRequest> {
		if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) throw new BadRequestException('Invalid sell request ID');
		const result = await this.requestModel.findById(id).lean().exec();
		if (!result) throw new NotFoundException('Sell yacht request not found');
		return result;
	}

	async updateStatus(input: UpdateSellYachtRequestStatusInput): Promise<SellYachtRequest> {
		const fields = plainToInstance(UpdateSellYachtRequestStatusInput, input);
		validateInput(fields);
		const result = await this.requestModel
			.findByIdAndUpdate(fields.requestId, { status: fields.status }, { new: true, runValidators: true })
			.exec();
		if (!result) throw new NotFoundException('Sell yacht request not found');
		return result;
	}
}

function validateInput(input: object): void {
	if (
		validateSync(input, {
			whitelist: true,
			forbidNonWhitelisted: true,
			validationError: { target: false, value: false },
		}).length
	)
		throw new BadRequestException('Invalid sell yacht request input');
}
