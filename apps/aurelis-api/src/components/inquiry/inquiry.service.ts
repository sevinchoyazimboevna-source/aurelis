import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
	CreateCharterInquiryInput,
	CreateSalesInquiryInput,
	CreateYachtInquiryInput,
	UpdateYachtInquiryInput,
	YachtInquiryAdminFilter,
	YachtInquiryCatalogInput,
} from '../../libs/dto/inquiry/yacht-inquiry.input';
import { YachtInquiry, YachtInquiries } from '../../libs/dto/inquiry/yacht-inquiry';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';
import { YachtListingMode } from '../../libs/enums/yacht.enum';
import { YachtService } from '../yacht/yacht.service';
import type { Member } from '../auth/auth.dto';
import { AuthErrorCode, authError } from '../auth/auth-errors';

@Injectable()
export class InquiryService {
	constructor(
		@InjectModel('YachtInquiry') private readonly inquiryModel: Model<YachtInquiry>,
		private readonly yachtService: YachtService,
	) {}

	async createSales(input: CreateSalesInquiryInput, member?: Member): Promise<YachtInquiry> {
		const normalized = plainToInstance(CreateSalesInquiryInput, input);
		validateInput(normalized);
		return this.create({ ...normalized, type: InquiryType.SALES }, member);
	}

	async createCharter(input: CreateCharterInquiryInput, member?: Member): Promise<YachtInquiry> {
		const normalized = plainToInstance(CreateCharterInquiryInput, input);
		validateInput(normalized);
		return this.create({ ...normalized, type: InquiryType.CHARTER }, member);
	}

	async create(input: CreateYachtInquiryInput, member?: Member): Promise<YachtInquiry> {
		const normalized = plainToInstance(CreateYachtInquiryInput, input);
		validateInput(normalized);
		const memberId = member ? verifiedMemberId(member) : undefined;
		if (normalized.type === InquiryType.CHARTER && (!normalized.startDate || !normalized.endDate))
			throw new BadRequestException('Charter inquiries require start and end dates');
		if (normalized.startDate && normalized.endDate && normalized.endDate <= normalized.startDate)
			throw new BadRequestException('End date must be after start date');
		// Existing YachtService detail is the canonical PUBLISHED-only lookup.
		const yacht = await this.yachtService.getById(normalized.yachtId);
		const requiredMode = normalized.type === InquiryType.CHARTER ? YachtListingMode.CHARTER : YachtListingMode.SALE;
		if (!yacht.listingModes.includes(requiredMode)) {
			throw new BadRequestException(`This yacht is not listed for ${normalized.type.toLowerCase()}`);
		}
		if (
			normalized.type === InquiryType.CHARTER &&
			normalized.guestCount != null &&
			typeof yacht.guests === 'number' &&
			Number.isInteger(yacht.guests) &&
			yacht.guests > 0 &&
			normalized.guestCount > yacht.guests
		)
			throw new BadRequestException('Guest count exceeds yacht capacity');
		return this.inquiryModel.create({
			...defined(normalized),
			status: InquiryStatus.NEW,
			...(memberId ? { memberId } : {}),
		});
	}

	async list(input: YachtInquiryAdminFilter): Promise<YachtInquiries> {
		const normalized = plainToInstance(YachtInquiryAdminFilter, input);
		validateInput(normalized);
		// Preserve legacy max-100 clamping on the existing public API signature.
		return this.collection(normalized, Math.min(100, normalized.limit ?? 20));
	}

	async catalog(input: YachtInquiryCatalogInput): Promise<YachtInquiries> {
		const normalized = plainToInstance(YachtInquiryCatalogInput, input);
		validateInput(normalized);
		return this.collection(normalized, normalized.limit ?? 20);
	}

	private async collection(input: YachtInquiryAdminFilter, limit: number): Promise<YachtInquiries> {
		const page = input.page ?? 1;
		if (input.createdFrom && input.createdTo && input.createdFrom > input.createdTo)
			throw new BadRequestException('Invalid inquiry creation date range');
		const match: FilterQuery<YachtInquiry> = {};
		if (input.status) match.status = input.status;
		if (input.type) match.type = input.type;
		if (input.yachtId) match.yachtId = new Types.ObjectId(input.yachtId);
		if (input.memberId) match.memberId = new Types.ObjectId(input.memberId);
		if (input.email) match.email = input.email;
		if (input.createdFrom || input.createdTo)
			match.createdAt = {
				...(input.createdFrom ? { $gte: input.createdFrom } : {}),
				...(input.createdTo ? { $lte: input.createdTo } : {}),
			};
		const [list, total] = await Promise.all([
			this.inquiryModel
				.find(match)
				.sort({ createdAt: -1, _id: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.inquiryModel.countDocuments(match),
		]);
		return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async getById(id: string): Promise<YachtInquiry> {
		if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) throw new BadRequestException('Invalid inquiry ID');
		const result = await this.inquiryModel.findById(id).lean().exec();
		if (!result) throw new NotFoundException('Inquiry not found');
		return result;
	}

	async update(input: UpdateYachtInquiryInput): Promise<YachtInquiry> {
		const normalized = plainToInstance(UpdateYachtInquiryInput, input);
		validateInput(normalized);
		const result = await this.inquiryModel
			.findByIdAndUpdate(normalized._id, { status: normalized.status }, { new: true, runValidators: true })
			.exec();
		if (!result) throw new NotFoundException('Inquiry not found');
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
		throw new BadRequestException('Invalid inquiry input');
}

function defined(input: object): Record<string, unknown> {
	return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function verifiedMemberId(member: Member): Types.ObjectId {
	if (typeof member._id !== 'string' || !/^[a-f0-9]{24}$/i.test(member._id))
		throw authError(AuthErrorCode.UNAUTHENTICATED);
	return new Types.ObjectId(member._id);
}
