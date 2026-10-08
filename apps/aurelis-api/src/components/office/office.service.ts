import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { Office, Offices } from '../../libs/dto/office/office';
import { CreateOfficeInput, OfficeCatalogInput, UpdateOfficeInput } from '../../libs/dto/office/office.input';
import { OfficeSortBy, OfficeStatus } from '../../libs/enums/office.enum';
import { normalizeOfficeSlug } from './office-slug';
import { validOfficeBusinessHours } from '../../libs/validators/office-business-hours';

@Injectable()
export class OfficeService {
	constructor(@InjectModel('Office') private readonly officeModel: Model<Office>) {}

	async catalog(input: OfficeCatalogInput, featuredOnly = false): Promise<Offices> {
		return this.collection(input, true, featuredOnly);
	}
	async getForAdmin(input: OfficeCatalogInput): Promise<Offices> {
		return this.collection(input, false);
	}
	private async collection(input: OfficeCatalogInput, publicOnly: boolean, featuredOnly = false): Promise<Offices> {
		const query = plainToInstance(OfficeCatalogInput, input);
		validateInput(query);
		const filter = query.filter ?? {};
		const match: FilterQuery<Office> = {};
		if (publicOnly) match.status = OfficeStatus.PUBLISHED;
		else if (filter.status) match.status = filter.status;
		for (const key of ['country', 'city'] as const) {
			if (filter[key]) match[key] = new RegExp(`^${escapeRegex(filter[key])}$`, 'i');
		}
		if (filter.featured !== undefined && filter.featured !== null) match.featured = filter.featured;
		if (featuredOnly) match.featured = true;
		if (filter.search) {
			const search = new RegExp(escapeRegex(filter.search), 'i');
			match.$or = [{ name: search }, { country: search }, { city: search }];
		}
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const result = await this.officeModel.aggregate<{ list: Office[]; meta: { total: number }[] }>([
			{ $match: match },
			{ $sort: makeSort(query.sortBy ?? OfficeSortBy.FEATURED) },
			{ $facet: { list: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } },
		]);
		const total = result[0]?.meta?.[0]?.total ?? 0;
		return { list: result[0]?.list ?? [], total, page, limit, totalPages: Math.ceil(total / limit) };
	}
	async getBySlug(slug: string): Promise<Office> {
		const office = await this.officeModel
			.findOne({ slug: normalizeOfficeSlug(slug), status: OfficeStatus.PUBLISHED })
			.lean()
			.exec();
		if (!office) throw new NotFoundException('Office not found');
		return office;
	}
	async create(input: CreateOfficeInput): Promise<Office> {
		const fields = plainToInstance(CreateOfficeInput, input);
		validateInput(fields);
		const slug = normalizeOfficeSlug(fields.slug ?? fields.name, fields.slug === undefined);
		await this.validateSlug(slug);
		try {
			return await this.officeModel.create({
				...defined(fields),
				slug,
				status: fields.status ?? OfficeStatus.DRAFT,
				featured: fields.featured ?? false,
				sortOrder: fields.sortOrder ?? 0,
			});
		} catch (error) {
			rethrowWriteError(error);
		}
	}
	async update(input: UpdateOfficeInput): Promise<Office> {
		const normalized = plainToInstance(UpdateOfficeInput, input);
		validateInput(normalized);
		const { _id, ...supplied } = normalized;
		if (!(await this.officeModel.exists({ _id }))) throw new NotFoundException('Office not found');
		const fields = defined(supplied);
		if (normalized.slug !== undefined) {
			fields.slug = normalizeOfficeSlug(normalized.slug);
			await this.validateSlug(fields.slug as string, _id);
		}
		try {
			const office = await this.officeModel
				.findByIdAndUpdate(_id, { $set: fields }, { new: true, runValidators: true })
				.exec();
			if (!office) throw new NotFoundException('Office not found');
			return office;
		} catch (error) {
			rethrowWriteError(error);
		}
	}
	private async validateSlug(slug: string, id?: string): Promise<void> {
		if (await this.officeModel.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) }))
			throw new BadRequestException('Office slug already exists');
	}
	async validateId(id: string): Promise<void> {
		if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) throw new BadRequestException('Invalid office ID');
		if (!(await this.officeModel.exists({ _id: id }))) throw new BadRequestException('Office not found');
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
		throw new BadRequestException('Invalid office input');
	if ('businessHours' in input && input.businessHours !== undefined && !validOfficeBusinessHours(input.businessHours))
		throw new BadRequestException('Invalid office business hours');
}
function rethrowWriteError(error: unknown): never {
	if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)
		throw new BadRequestException('Office slug already exists');
	throw error;
}
function makeSort(sort: OfficeSortBy): Record<string, 1 | -1> {
	switch (sort) {
		case OfficeSortBy.SORT_ORDER:
			return { sortOrder: 1, name: 1, _id: 1 };
		case OfficeSortBy.NAME_ASC:
			return { name: 1, _id: 1 };
		case OfficeSortBy.NAME_DESC:
			return { name: -1, _id: 1 };
		case OfficeSortBy.NEWEST:
			return { createdAt: -1, _id: -1 };
		default:
			return { featured: -1, sortOrder: 1, name: 1, _id: 1 };
	}
}
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
