import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { YachtCatalogInput, YachtInput, YachtUpdateInput } from '../../libs/dto/yacht/yacht.input';
import { Yacht, Yachts } from '../../libs/dto/yacht/yacht';
import { YachtListingMode, YachtSortBy, YachtStatus } from '../../libs/enums/yacht.enum';
import { T } from '../../libs/types/common';
import { BrokerService } from '../broker/broker.service';

@Injectable()
export class YachtService {
	constructor(
		@InjectModel('Yacht') private readonly yachtModel: Model<Yacht>,
		private readonly brokerService: BrokerService,
	) {}

	async catalog(input: YachtCatalogInput, featuredOnly = false): Promise<Yachts> {
		const { filter = {} } = input;
		validateFilter(filter, input.sortBy ?? YachtSortBy.FEATURED);
		const match: T = { status: YachtStatus.PUBLISHED };
		if (filter.mode) match.listingModes = filter.mode;
		if (filter.location) match.location = new RegExp(escapeRegex(filter.location), 'i');
		if (filter.country) match.country = new RegExp(`^${escapeRegex(filter.country)}$`, 'i');
		if (filter.text?.trim()) {
			const text = new RegExp(escapeRegex(filter.text.trim()), 'i');
			match.$or = [{ name: text }, { builder: text }, { model: text }, { location: text }, { country: text }];
		}
		if (filter.minYear !== undefined || filter.maxYear !== undefined) {
			match.yearBuilt = {};
			if (filter.minYear !== undefined) match.yearBuilt.$gte = filter.minYear;
			if (filter.maxYear !== undefined) match.yearBuilt.$lte = filter.maxYear;
		}
		if (filter.minLengthM !== undefined || filter.maxLengthM !== undefined) {
			match.lengthM = {};
			if (filter.minLengthM !== undefined) match.lengthM.$gte = filter.minLengthM;
			if (filter.maxLengthM !== undefined) match.lengthM.$lte = filter.maxLengthM;
		}
		if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
			const pricePath = filter.mode === YachtListingMode.CHARTER ? 'charterRate' : 'salePrice';
			match[pricePath] = {};
			if (filter.minPrice !== undefined) match[pricePath].$gte = filter.minPrice;
			if (filter.maxPrice !== undefined) match[pricePath].$lte = filter.maxPrice;
		}
		if (filter.mode && filter.currency) {
			match[filter.mode === YachtListingMode.CHARTER ? 'charterCurrency' : 'saleCurrency'] = filter.currency;
		}
		if (featuredOnly) match.featured = true;
		const sort = makeSort(input.sortBy ?? YachtSortBy.FEATURED, input.descending ?? false, filter.mode);
		const page = Math.max(1, input.page ?? 1);
		const limit = Math.min(100, Math.max(1, input.limit ?? 20));
		const result = await this.yachtModel.aggregate([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (page - 1) * limit },
						{ $limit: limit },
						{ $lookup: { from: 'brokerProfiles', localField: 'brokerId', foreignField: '_id', as: 'broker' } },
						{ $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
					],
					meta: [{ $count: 'total' }],
				},
			},
		]);
		return { list: result[0]?.list ?? [], total: result[0]?.meta?.[0]?.total ?? 0 };
	}

	async getById(id: string): Promise<Yacht> {
		if (!isValidObjectId(id)) throw new BadRequestException('Invalid yacht ID');
		const yacht = await this.yachtModel
			.findOne({ _id: id, status: YachtStatus.PUBLISHED })
			.populate('brokerId')
			.lean()
			.exec();
		if (!yacht) throw new NotFoundException('Yacht not found');
		return { ...yacht, broker: yacht.brokerId } as unknown as Yacht;
	}

	async create(input: YachtInput): Promise<Yacht> {
		validatePricing(input);
		await this.brokerService.getById(input.brokerId);
		return this.yachtModel.create({ ...input, status: input.status ?? YachtStatus.DRAFT });
	}

	async update(input: YachtUpdateInput): Promise<Yacht> {
		validatePricing(input);
		await this.brokerService.getById(input.brokerId);
		const { _id, ...fields } = input;
		const yacht = await this.yachtModel.findByIdAndUpdate(_id, fields, { new: true, runValidators: true }).exec();
		if (!yacht) throw new NotFoundException('Yacht not found');
		return yacht;
	}

	async getForStaff(input: YachtCatalogInput): Promise<Yachts> {
		const page = Math.max(1, input.page ?? 1);
		const limit = Math.min(100, Math.max(1, input.limit ?? 20));
		const [list, total] = await Promise.all([
			this.yachtModel.find().sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('brokerId').lean().exec(),
			this.yachtModel.countDocuments(),
		]);
		return { list: list.map((yacht) => ({ ...yacht, broker: yacht.brokerId })) as unknown as Yacht[], total };
	}
}

function validatePricing(input: YachtInput | YachtUpdateInput): void {
	if ((input.salePrice === undefined) !== (input.saleCurrency === undefined)) {
		throw new BadRequestException('Sale price and currency must be supplied together');
	}
	if ((input.charterRate === undefined) !== (input.charterCurrency === undefined)) {
		throw new BadRequestException('Charter rate and currency must be supplied together');
	}
	if (input.listingModes.includes(YachtListingMode.SALES) && input.salePrice !== undefined && !input.saleCurrency) {
		throw new BadRequestException('A currency is required when a sale price is supplied');
	}
	if (input.listingModes.includes(YachtListingMode.CHARTER) && input.charterRate !== undefined && !input.charterCurrency) {
		throw new BadRequestException('A currency is required when a charter rate is supplied');
	}
	if (!input.listingModes.includes(YachtListingMode.SALES) && input.salePrice !== undefined) {
		throw new BadRequestException('Sale pricing requires the SALES listing mode');
	}
	if (!input.listingModes.includes(YachtListingMode.CHARTER) && input.charterRate !== undefined) {
		throw new BadRequestException('Charter pricing requires the CHARTER listing mode');
	}
}

function validateFilter(filter: YachtCatalogInput['filter'], sortBy: YachtSortBy): void {
	const usesPrice = filter?.minPrice !== undefined || filter?.maxPrice !== undefined || sortBy === YachtSortBy.PRICE;
	if (usesPrice && !filter?.mode) {
		throw new BadRequestException('Choose SALES or CHARTER when filtering by price');
	}
	if (usesPrice && !filter?.currency) {
		throw new BadRequestException('Choose a currency when filtering or sorting by price');
	}
	if (filter?.minPrice !== undefined && filter?.maxPrice !== undefined && filter.minPrice > filter.maxPrice) {
		throw new BadRequestException('Minimum price cannot exceed maximum price');
	}
	if (filter?.minYear !== undefined && filter?.maxYear !== undefined && filter.minYear > filter.maxYear) {
		throw new BadRequestException('Minimum year cannot exceed maximum year');
	}
	if (filter?.minLengthM !== undefined && filter?.maxLengthM !== undefined && filter.minLengthM > filter.maxLengthM) {
		throw new BadRequestException('Minimum length cannot exceed maximum length');
	}
}

function makeSort(sortBy: YachtSortBy, descending: boolean, mode?: YachtListingMode): T {
	if (sortBy === YachtSortBy.FEATURED) return { featured: -1, createdAt: -1 };
	const direction = descending ? -1 : 1;
	if (sortBy === YachtSortBy.PRICE) return { [mode === YachtListingMode.CHARTER ? 'charterRate' : 'salePrice']: direction, createdAt: -1 };
	return { [sortBy]: direction, createdAt: -1 };
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
