import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { YachtCatalogInput, YachtInput, YachtUpdateInput } from '../../libs/dto/yacht/yacht.input';
import { Yacht, Yachts } from '../../libs/dto/yacht/yacht';
import { YachtListingMode, YachtSortBy, YachtStatus } from '../../libs/enums/yacht.enum';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { normalizeYachtPricingInput } from './yacht-pricing';
import { T } from '../../libs/types/common';
import { BrokerService } from '../broker/broker.service';
import { DestinationService } from '../destination/destination.service';
import { buildPublicYachtVisibilityFilter } from './yacht-visibility';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class YachtService {
	constructor(
		@InjectModel('Yacht') private readonly yachtModel: Model<Yacht>,
		private readonly brokerService: BrokerService,
		private readonly destinationService: DestinationService,
		@Optional() private readonly redis?: RedisService,
	) {}

	async catalog(input: YachtCatalogInput, featuredOnly = false): Promise<Yachts> {
		return this.collection(input, true, featuredOnly);
	}

	private async collection(input: YachtCatalogInput, publicOnly: boolean, featuredOnly = false): Promise<Yachts> {
		input = plainToInstance(YachtCatalogInput, input);
		if (validateSync(input).length) throw new BadRequestException('Invalid yacht query input');
		const { filter: suppliedFilter } = input;
		const filter = Object.fromEntries(
			Object.entries(suppliedFilter ?? {}).filter(([, value]) => value !== null && value !== undefined),
		) as NonNullable<YachtCatalogInput['filter']>;
		if (filter.mode && filter.listingMode && filter.mode !== filter.listingMode)
			throw new BadRequestException('Conflicting listing modes');
		const mode = filter.listingMode ?? filter.mode;
		const effectiveFilter = { ...filter, mode };
		validateFilter(effectiveFilter, input.sortBy ?? YachtSortBy.FEATURED);
		const match: T = publicOnly ? buildPublicYachtVisibilityFilter() : {};
		if (!publicOnly && filter.status) match.status = filter.status;
		if (filter.destinationId) match.destinationIds = new Types.ObjectId(filter.destinationId);
		for (const field of ['builder', 'model'] as const) {
			if (filter[field]) match[field] = new RegExp(escapeRegex(filter[field]), 'i');
		}
		if (filter.featured !== undefined && filter.featured !== null) match.featured = filter.featured;
		for (const [field, min, max] of [
			['cabins', filter.minCabins, filter.maxCabins],
			['guests', filter.minGuests, filter.maxGuests],
		] as const) {
			if (min !== undefined || max !== undefined) {
				match[field] = {};
				if (min !== undefined) match[field].$gte = min;
				if (max !== undefined) match[field].$lte = max;
			}
		}
		if (mode) match.listingModes = mode;
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
			const pricePath = mode === YachtListingMode.CHARTER ? 'charterPrice' : 'salePrice';
			match[pricePath] = {};
			if (filter.minPrice !== undefined) match[pricePath].$gte = filter.minPrice;
			if (filter.maxPrice !== undefined) match[pricePath].$lte = filter.maxPrice;
		}
		if (mode && filter.currency) {
			match[mode === YachtListingMode.CHARTER ? 'charterCurrency' : 'saleCurrency'] = filter.currency;
		}
		if (featuredOnly) match.featured = true;
		const sort = makeSort(input.sortBy ?? YachtSortBy.FEATURED, input.descending ?? false, mode);
		const page = input.page ?? 1;
		const limit = input.limit ?? 20;
		const popularity =
			publicOnly &&
			[YachtSortBy.MOST_VIEWED, YachtSortBy.MOST_LIKED, YachtSortBy.POPULAR].includes(
				input.sortBy ?? YachtSortBy.FEATURED,
			);
		const cacheKey = popularity ? await this.redis?.popularityKey({ input, featuredOnly }) : undefined;
		if (cacheKey) {
			const cached = await this.redis?.getJson<{ ids: string[]; total: number }>(cacheKey);
			if (
				cached &&
				Array.isArray(cached.ids) &&
				cached.ids.length <= limit &&
				new Set(cached.ids).size === cached.ids.length &&
				cached.ids.every((id) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) &&
				Number.isSafeInteger(cached.total) &&
				cached.total >= cached.ids.length
			) {
				const fresh = await this.yachtModel.aggregate<Yacht>([
					{ $match: { $and: [match, { _id: { $in: cached.ids.map((id) => new Types.ObjectId(id)) } }] } },
					{ $lookup: { from: 'brokerProfiles', localField: 'brokerId', foreignField: '_id', as: 'broker' } },
					{ $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
				]);
				const byId = new Map(fresh.map((yacht) => [String(yacht._id as unknown), yacht]));
				if (cached.ids.every((id) => byId.has(id)))
					return {
						list: cached.ids.map((id) => ({ ...byId.get(id)!, broker: byId.get(id)!.broker })),
						total: cached.total,
						page,
						limit,
						totalPages: Math.ceil(cached.total / limit),
					};
			}
		}
		const result = await this.yachtModel.aggregate<{ list: Yacht[]; meta: { total: number }[] }>([
			{ $match: match },
			...([YachtSortBy.MOST_VIEWED, YachtSortBy.MOST_LIKED, YachtSortBy.POPULAR].includes(
				input.sortBy ?? YachtSortBy.FEATURED,
			)
				? [{ $addFields: { viewsCount: { $ifNull: ['$viewsCount', 0] }, likesCount: { $ifNull: ['$likesCount', 0] } } }]
				: []),
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
		const total = result[0]?.meta?.[0]?.total ?? 0;
		if (cacheKey)
			await this.redis?.setJson(
				cacheKey,
				{ ids: (result[0]?.list ?? []).map((yacht: Yacht) => String(yacht._id as unknown)), total },
				30,
			);
		return {
			list: (result[0]?.list ?? []).map((yacht: Yacht) => ({ ...yacht, broker: yacht.broker ?? null })) as Yacht[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async recordView(id: string): Promise<number> {
		if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) throw new BadRequestException('Invalid yacht ID');
		const yacht = await this.yachtModel
			.findOneAndUpdate(
				{ _id: id, ...buildPublicYachtVisibilityFilter() },
				{ $inc: { viewsCount: 1 } },
				{ new: true, timestamps: false },
			)
			.lean()
			.exec();
		if (!yacht) throw new NotFoundException('Yacht not found');
		await this.redis?.invalidatePopularity();
		return yacht.viewsCount ?? 0;
	}

	async getById(id: string): Promise<Yacht> {
		if (!isValidObjectId(id)) throw new BadRequestException('Invalid yacht ID');
		const yacht = await this.yachtModel
			.findOne({ _id: id, ...buildPublicYachtVisibilityFilter() })
			.populate({ path: 'brokerId', transform: (document, originalId) => document ?? originalId })
			.lean()
			.exec();
		if (!yacht) throw new NotFoundException('Yacht not found');
		const populated = yacht.brokerId as unknown as Yacht['broker'];
		const broker = populated && 'name' in populated ? populated : undefined;
		return { ...yacht, broker, brokerId: broker?._id ?? yacht.brokerId } as unknown as Yacht;
	}

	async create(input: YachtInput): Promise<Yacht> {
		const fields = normalizeYachtPricingInput(input);
		validateWrite(fields, false);
		validatePricing(fields);
		await this.brokerService.getById(fields.brokerId);
		if (fields.destinationIds !== undefined) await this.destinationService.validateIds(fields.destinationIds);
		const yacht = await this.yachtModel.create({
			...fields,
			featured: fields.featured ?? false,
			status: fields.status ?? YachtStatus.DRAFT,
		});
		await this.redis?.invalidatePopularity();
		return yacht;
	}

	async update(input: YachtUpdateInput): Promise<Yacht> {
		const normalized = normalizeYachtPricingInput(input);
		validateWrite(normalized, true);
		const { _id, ...supplied } = normalized;
		const fields = Object.fromEntries(Object.entries(supplied).filter(([, value]) => value !== undefined));
		const existing = await this.yachtModel.findById(_id).lean().exec();
		if (!existing) throw new NotFoundException('Yacht not found');
		validatePricing({ ...existing, ...fields });
		if (normalized.brokerId !== undefined) await this.brokerService.getById(normalized.brokerId);
		if (normalized.destinationIds !== undefined) await this.destinationService.validateIds(normalized.destinationIds);
		const yacht = await this.yachtModel
			.findByIdAndUpdate(_id, { $set: fields }, { new: true, runValidators: true })
			.exec();
		if (!yacht) throw new NotFoundException('Yacht not found');
		await this.redis?.invalidatePopularity();
		return yacht;
	}

	async getForStaff(input: YachtCatalogInput): Promise<Yachts> {
		return this.collection(input, false);
	}
}

function validateWrite(input: object, update: boolean): void {
	const dto = update ? plainToInstance(YachtUpdateInput, input) : plainToInstance(YachtInput, input);
	if (validateSync(dto).length) throw new BadRequestException('Invalid yacht input');
}

function validatePricing(
	input: Pick<YachtInput, 'salePrice' | 'saleCurrency' | 'charterPrice' | 'charterCurrency' | 'listingModes'>,
): void {
	if ((input.salePrice === undefined) !== (input.saleCurrency === undefined)) {
		throw new BadRequestException('Sale price and currency must be supplied together');
	}
	if ((input.charterPrice === undefined) !== (input.charterCurrency === undefined)) {
		throw new BadRequestException('Charter rate and currency must be supplied together');
	}
	if (input.listingModes.includes(YachtListingMode.SALE) && input.salePrice !== undefined && !input.saleCurrency) {
		throw new BadRequestException('A currency is required when a sale price is supplied');
	}
	if (
		input.listingModes.includes(YachtListingMode.CHARTER) &&
		input.charterPrice !== undefined &&
		!input.charterCurrency
	) {
		throw new BadRequestException('A currency is required when a charter rate is supplied');
	}
	if (!input.listingModes.includes(YachtListingMode.SALE) && input.salePrice !== undefined) {
		throw new BadRequestException('Sale pricing requires the SALE listing mode');
	}
	if (!input.listingModes.includes(YachtListingMode.CHARTER) && input.charterPrice !== undefined) {
		throw new BadRequestException('Charter pricing requires the CHARTER listing mode');
	}
}

function validateFilter(filter: YachtCatalogInput['filter'], sortBy: YachtSortBy): void {
	const usesPrice =
		filter?.minPrice !== undefined ||
		filter?.maxPrice !== undefined ||
		[YachtSortBy.PRICE, YachtSortBy.PRICE_ASC, YachtSortBy.PRICE_DESC].includes(sortBy);
	if (usesPrice && !filter?.mode) {
		throw new BadRequestException('Choose SALE or CHARTER when filtering by price');
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
	for (const [min, max] of [
		[filter?.minCabins, filter?.maxCabins],
		[filter?.minGuests, filter?.maxGuests],
	]) {
		if (min !== undefined && max !== undefined && min > max)
			throw new BadRequestException('Minimum capacity cannot exceed maximum capacity');
	}
}

function makeSort(sortBy: YachtSortBy, descending: boolean, mode?: YachtListingMode): T {
	if (sortBy === YachtSortBy.MOST_VIEWED) return { viewsCount: -1, createdAt: -1, _id: -1 };
	if (sortBy === YachtSortBy.MOST_LIKED) return { likesCount: -1, createdAt: -1, _id: -1 };
	if (sortBy === YachtSortBy.POPULAR) return { likesCount: -1, viewsCount: -1, createdAt: -1, _id: -1 };
	if (sortBy === YachtSortBy.FEATURED) return { featured: -1, createdAt: -1, _id: -1 };
	if (sortBy === YachtSortBy.NEWEST) return { createdAt: -1, _id: -1 };
	const direction = descending ? -1 : 1;
	if ([YachtSortBy.PRICE, YachtSortBy.PRICE_ASC, YachtSortBy.PRICE_DESC].includes(sortBy)) {
		return {
			[mode === YachtListingMode.CHARTER ? 'charterPrice' : 'salePrice']:
				sortBy === YachtSortBy.PRICE_ASC ? 1 : sortBy === YachtSortBy.PRICE_DESC ? -1 : direction,
			createdAt: -1,
			_id: -1,
		};
	}
	if (sortBy === YachtSortBy.NAME_ASC || sortBy === YachtSortBy.NAME_DESC)
		return { name: sortBy === YachtSortBy.NAME_ASC ? 1 : -1, _id: -1 };
	return { [sortBy]: direction, ...(sortBy === YachtSortBy.CREATED ? {} : { createdAt: -1 }), _id: -1 };
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
