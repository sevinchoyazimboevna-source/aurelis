import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { Destination, Destinations } from '../../libs/dto/destination/destination';
import {
	CreateDestinationInput,
	DestinationCatalogInput,
	UpdateDestinationInput,
} from '../../libs/dto/destination/destination.input';
import { DestinationSortBy, DestinationStatus } from '../../libs/enums/destination.enum';
import { normalizeDestinationSlug } from './destination-slug';

@Injectable()
export class DestinationService {
	constructor(@InjectModel('Destination') private readonly destinationModel: Model<Destination>) {}

	async catalog(input: DestinationCatalogInput, featuredOnly = false): Promise<Destinations> {
		return this.collection(input, true, featuredOnly);
	}
	async getForAdmin(input: DestinationCatalogInput): Promise<Destinations> {
		return this.collection(input, false);
	}
	private async collection(
		input: DestinationCatalogInput,
		publicOnly: boolean,
		featuredOnly = false,
	): Promise<Destinations> {
		const query = plainToInstance(DestinationCatalogInput, input);
		validateInput(query);
		const filter = query.filter ?? {};
		const match: FilterQuery<Destination> = {};
		if (publicOnly) match.status = DestinationStatus.PUBLISHED;
		else if (filter.status) match.status = filter.status;
		if (filter.type) match.type = filter.type;
		if (filter.parentId !== undefined)
			match.parentId = filter.parentId === null ? null : new Types.ObjectId(filter.parentId);
		for (const key of ['country', 'region'] as const) {
			if (filter[key]) match[key] = new RegExp(`^${escapeRegex(filter[key])}$`, 'i');
		}
		if (filter.featured !== undefined && filter.featured !== null) match.featured = filter.featured;
		if (featuredOnly) match.featured = true;
		if (filter.search) {
			const search = new RegExp(escapeRegex(filter.search), 'i');
			match.$or = [{ name: search }, { country: search }, { region: search }];
		}
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const result = await this.destinationModel.aggregate<{ list: Destination[]; meta: { total: number }[] }>([
			{ $match: match },
			{ $sort: makeSort(query.sortBy ?? DestinationSortBy.FEATURED) },
			{ $facet: { list: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } },
		]);
		const total = result[0]?.meta?.[0]?.total ?? 0;
		return { list: result[0]?.list ?? [], total, page, limit, totalPages: Math.ceil(total / limit) };
	}
	async getBySlug(slug: string): Promise<Destination> {
		const destination = await this.destinationModel
			.findOne({ slug: normalizeDestinationSlug(slug), status: DestinationStatus.PUBLISHED })
			.lean()
			.exec();
		if (!destination) throw new NotFoundException('Destination not found');
		return destination;
	}
	async create(input: CreateDestinationInput): Promise<Destination> {
		const fields = plainToInstance(CreateDestinationInput, input);
		validateInput(fields);
		const slug = normalizeDestinationSlug(fields.slug ?? fields.name, fields.slug === undefined);
		await this.validateSlug(slug);
		if (fields.parentId) await this.validateParent(fields.parentId);
		try {
			return await this.destinationModel.create({
				...defined(fields),
				slug,
				parentId: fields.parentId ?? null,
				status: fields.status ?? DestinationStatus.DRAFT,
				featured: fields.featured ?? false,
				sortOrder: fields.sortOrder ?? 0,
			});
		} catch (error) {
			rethrowWriteError(error);
		}
	}
	async update(input: UpdateDestinationInput): Promise<Destination> {
		const normalized = plainToInstance(UpdateDestinationInput, input);
		validateInput(normalized);
		const { _id, ...supplied } = normalized;
		if (!(await this.destinationModel.exists({ _id }))) throw new NotFoundException('Destination not found');
		const fields = defined(supplied);
		if (normalized.slug !== undefined) {
			fields.slug = normalizeDestinationSlug(normalized.slug);
			await this.validateSlug(fields.slug as string, _id);
		}
		if (normalized.parentId) await this.validateParent(normalized.parentId, _id);
		try {
			const destination = await this.destinationModel
				.findByIdAndUpdate(_id, { $set: fields }, { new: true, runValidators: true })
				.exec();
			if (!destination) throw new NotFoundException('Destination not found');
			return destination;
		} catch (error) {
			rethrowWriteError(error);
		}
	}
	private async validateSlug(slug: string, id?: string): Promise<void> {
		if (await this.destinationModel.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) }))
			throw new BadRequestException('Destination slug already exists');
	}
	private async validateParent(parentId: string, id?: string): Promise<void> {
		const visited = new Set(id ? [id.toLowerCase()] : []);
		let cursor: string | null = parentId;
		// Iterative ancestor traversal also rejects pre-existing cycles, without recursive GraphQL loading.
		while (cursor) {
			const canonical = cursor.toLowerCase();
			if (visited.has(canonical)) throw new BadRequestException('Destination parent would create a cycle');
			visited.add(canonical);
			const parent = await this.destinationModel.findById(cursor).select('_id parentId').lean().exec();
			if (!parent) throw new BadRequestException('Destination parent not found');
			cursor = parent.parentId ? String(parent.parentId) : null;
		}
	}
	async validateIds(ids: string[]): Promise<void> {
		if (
			!Array.isArray(ids) ||
			ids.some((id) => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) ||
			new Set(ids.map((id) => id.toLowerCase())).size !== ids.length
		)
			throw new BadRequestException('Invalid or duplicate destination IDs');
		if (ids.length && (await this.destinationModel.countDocuments({ _id: { $in: ids } })) !== ids.length)
			throw new BadRequestException('Destination not found');
	}
}

function defined(input: object): Record<string, unknown> {
	return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function validateInput(input: object): void {
	if (
		validateSync(input, {
			whitelist: true,
			forbidNonWhitelisted: true,
			validationError: { target: false, value: false },
		}).length
	)
		throw new BadRequestException('Invalid destination input');
}
function rethrowWriteError(error: unknown): never {
	if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)
		throw new BadRequestException('Destination slug already exists');
	throw error;
}
function makeSort(sort: DestinationSortBy): Record<string, 1 | -1> {
	switch (sort) {
		case DestinationSortBy.SORT_ORDER:
			return { sortOrder: 1, name: 1, _id: 1 };
		case DestinationSortBy.NAME_ASC:
			return { name: 1, _id: 1 };
		case DestinationSortBy.NAME_DESC:
			return { name: -1, _id: 1 };
		case DestinationSortBy.NEWEST:
			return { createdAt: -1, _id: -1 };
		default:
			return { featured: -1, sortOrder: 1, name: 1, _id: 1 };
	}
}
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
