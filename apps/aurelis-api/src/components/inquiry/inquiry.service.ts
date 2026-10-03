import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateYachtInquiryInput, UpdateYachtInquiryInput, YachtInquiryAdminFilter } from '../../libs/dto/inquiry/yacht-inquiry.input';
import { YachtInquiry, YachtInquiries } from '../../libs/dto/inquiry/yacht-inquiry';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';
import { YachtListingMode } from '../../libs/enums/yacht.enum';
import { YachtService } from '../yacht/yacht.service';

@Injectable()
export class InquiryService {
	constructor(
		@InjectModel('YachtInquiry') private readonly inquiryModel: Model<YachtInquiry>,
		private readonly yachtService: YachtService,
	) {}

	async create(input: CreateYachtInquiryInput): Promise<YachtInquiry> {
		const yacht = await this.yachtService.getById(input.yachtId);
		const requiredMode = input.type === InquiryType.CHARTER ? YachtListingMode.CHARTER : YachtListingMode.SALES;
		if (!yacht.listingModes.includes(requiredMode)) {
			throw new BadRequestException(`This yacht is not listed for ${input.type.toLowerCase()}`);
		}
		if (input.type === InquiryType.CHARTER && (!input.startDate || !input.endDate)) {
			throw new BadRequestException('Charter inquiries require start and end dates');
		}
		if (input.startDate && input.endDate && input.endDate <= input.startDate) {
			throw new BadRequestException('End date must be after start date');
		}
		return this.inquiryModel.create(input);
	}

	async list(input: YachtInquiryAdminFilter): Promise<YachtInquiries> {
		const page = Math.max(1, input.page ?? 1);
		const limit = Math.min(100, Math.max(1, input.limit ?? 20));
		const match = input.status ? { status: input.status } : {};
		const [list, total] = await Promise.all([
			this.inquiryModel.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
			this.inquiryModel.countDocuments(match),
		]);
		return { list, total };
	}

	async update(input: UpdateYachtInquiryInput): Promise<YachtInquiry> {
		const result = await this.inquiryModel.findByIdAndUpdate(input._id, { status: input.status }, { new: true, runValidators: true }).exec();
		if (!result) throw new NotFoundException('Inquiry not found');
		return result;
	}
}
