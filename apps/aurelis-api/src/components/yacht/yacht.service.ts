import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContentStatus } from '../../libs/enums/yacht.enum';
import {
	ListingStatus,
	YachtListingSortField,
} from '../../libs/enums/yacht-listing.enum';
import { Direction } from '../../libs/enums/comment.enum';
import { YachtListingFilterInput } from '../../libs/dto/yacht-listing/yacht-listing.input';
import { Yacht } from '../../libs/dto/yacht/yacht';
import { CreateYachtInput, UpdateYachtInput } from '../../libs/dto';
import { PaginatedResult } from '../../libs/types/pagination.type';

@Injectable()
export class YachtService {
	constructor(
		@InjectModel('Yacht') private readonly yachtModel: Model<any>,
		@InjectModel('YachtListing') private readonly yachtListingModel: Model<any>,
		@InjectModel('YachtDestination') private readonly yachtDestinationModel: Model<any>,
	) {}

	async findAll(): Promise<Yacht[]> {
		return this.yachtModel.find().exec();
	}

	async findOne(id: string): Promise<Yacht | null> {
		return this.yachtModel.findById(id).exec();
	}

	async findPublicYachts(
		filter: YachtListingFilterInput = new YachtListingFilterInput(),
	): Promise<PaginatedResult<Yacht>> {
		const page = filter.page ?? 1;
		const limit = Math.min(filter.limit ?? 20, 100);
		const listingFilter: Record<string, unknown> = {
			status: ListingStatus.PUBLISHED,
			brokerId: { $exists: true, $ne: null },
		};

		if (filter.listingType) {
			listingFilter.listingType = filter.listingType;
		}
		if (filter.isNewToFleet !== undefined) {
			listingFilter.isNewToFleet = filter.isNewToFleet;
		}
		if (filter.currency) {
			listingFilter.currency = filter.currency.toUpperCase();
		}

		const listingDocs = await this.yachtListingModel.find(listingFilter).lean();
		const listingByYachtId = new Map<string, any>();
		for (const listing of listingDocs) {
			const yachtId = String(listing.yachtId);
			listingByYachtId.set(yachtId, listing);
		}

		let candidateIds = [...listingByYachtId.keys()];
		if (filter.minPrice != null || filter.maxPrice != null) {
			candidateIds = candidateIds.filter((yachtId) => {
				const listing = listingByYachtId.get(yachtId);
				const value = Number(listing?.price?.toString?.() ?? 0);
				if (filter.minPrice != null && value < filter.minPrice) return false;
				if (filter.maxPrice != null && value > filter.maxPrice) return false;
				return true;
			});
		}

		if (filter.destinationId || filter.season) {
			const destinationMatch = await this.yachtDestinationModel
				.find({
					destinationId: filter.destinationId
						? new Types.ObjectId(filter.destinationId)
						: { $exists: true },
					...(filter.season ? { season: filter.season } : {}),
				})
				.distinct('yachtId')
				.then((ids) => ids.map((id) => String(id)));
			candidateIds = candidateIds.filter((id) => destinationMatch.includes(id));
		}

		const yachts = await this.yachtModel
			.find({
				_id: { $in: candidateIds.map((id) => new Types.ObjectId(id)) },
				status: ContentStatus.ACTIVE,
			})
			.lean();

		let filteredYachts = yachts.filter((yacht: any) => {
			if (filter.yachtType && yacht.yachtType !== filter.yachtType) return false;
			if (filter.minGuests != null && (yacht.guestCapacity ?? 0) < filter.minGuests)
				return false;
			if (filter.minCabins != null && (yacht.cabins ?? 0) < filter.minCabins)
				return false;
			if (filter.minBuildYear != null && (yacht.buildYear ?? 0) < filter.minBuildYear)
				return false;
			if (filter.maxBuildYear != null && (yacht.buildYear ?? 0) > filter.maxBuildYear)
				return false;
			if (filter.minLengthM != null && (yacht.lengthM ?? 0) < filter.minLengthM)
				return false;
			if (filter.maxLengthM != null && (yacht.lengthM ?? 0) > filter.maxLengthM)
				return false;
			if (filter.amenities && filter.amenities.length > 0) {
				const amenities = Array.isArray(yacht.amenities) ? yacht.amenities : [];
				if (!filter.amenities.every((amenity) => amenities.includes(amenity)))
					return false;
			}
			if (filter.builders && filter.builders.length > 0) {
				const builder = yacht.builder ?? '';
				if (!filter.builders.some((value) => value === builder)) return false;
			}
			if (filter.minRefitYear != null && (yacht.refitYear ?? 0) < filter.minRefitYear)
				return false;
			if (filter.maxRefitYear != null && (yacht.refitYear ?? 0) > filter.maxRefitYear)
				return false;
			return true;
		});

		const sortBy = filter.sortBy ?? YachtListingSortField.PUBLISHED_AT;
		const direction = filter.sortDirection ?? Direction.DESC;
		const multiplier = direction === Direction.DESC ? -1 : 1;
		const yachtSortFields: Record<string, string> = {
			[YachtListingSortField.LENGTH_M]: 'lengthM',
			[YachtListingSortField.BUILD_YEAR]: 'buildYear',
			[YachtListingSortField.REFIT_YEAR]: 'refitYear',
			[YachtListingSortField.CABINS]: 'cabins',
			[YachtListingSortField.GUEST_CAPACITY]: 'guestCapacity',
		};
		const listingSortFields: Record<string, string> = {
			[YachtListingSortField.PRICE]: 'price',
			[YachtListingSortField.CREATED_AT]: 'createdAt',
			[YachtListingSortField.PUBLISHED_AT]: 'publishedAt',
			[YachtListingSortField.IS_FEATURED]: 'isFeatured',
			[YachtListingSortField.IS_NEW_TO_FLEET]: 'isNewToFleet',
		};
		const chosenField =
			yachtSortFields[sortBy] ?? listingSortFields[sortBy] ?? 'publishedAt';
		filteredYachts = filteredYachts.sort((left: any, right: any) => {
			const leftId = String(left._id);
			const rightId = String(right._id);
			const leftListing = listingByYachtId.get(leftId) ?? {};
			const rightListing = listingByYachtId.get(rightId) ?? {};
			const leftValue = yachtSortFields[sortBy]
				? Number(left[yachtSortFields[sortBy]] ?? 0)
				: Number(
						leftListing[listingSortFields[sortBy] ?? 'publishedAt']?.toString?.() ?? 0,
					);
			const rightValue = yachtSortFields[sortBy]
				? Number(right[yachtSortFields[sortBy]] ?? 0)
				: Number(
						rightListing[listingSortFields[sortBy] ?? 'publishedAt']?.toString?.() ?? 0,
					);
			if (leftValue === rightValue) return 0;
			return leftValue > rightValue ? multiplier : -multiplier;
		});

		const total = filteredYachts.length;
		const safePage = Math.max(1, page);
		const safeLimit = Math.max(1, Math.min(limit, 100));
		const start = (safePage - 1) * safeLimit;
		const end = start + safeLimit;
		const items = filteredYachts.slice(start, end) as unknown as Yacht[];

		return {
			items,
			total,
			page: safePage,
			limit: safeLimit,
		};
	}

	async findPublicYacht(id: string): Promise<Yacht | null> {
		const yacht = await this.yachtModel
			.findOne({ _id: id, status: ContentStatus.ACTIVE })
			.lean();
		if (!yacht) {
			return null;
		}
		const listing = await this.yachtListingModel
			.findOne({
				yachtId: new Types.ObjectId(id),
				status: ListingStatus.PUBLISHED,
			})
			.lean();
		if (!listing) {
			return null;
		}
		return yacht as unknown as Yacht;
	}

	async create(input: CreateYachtInput): Promise<Yacht> {
		return this.yachtModel.create(input);
	}

	async update(input: UpdateYachtInput): Promise<Yacht> {
		const { _id, ...rest } = input;
		const updated = await this.yachtModel
			.findByIdAndUpdate(_id, rest, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException('Yacht not found');
		}

		return updated;
	}
}
