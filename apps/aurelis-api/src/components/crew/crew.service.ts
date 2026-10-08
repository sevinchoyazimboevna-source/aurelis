import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, isValidObjectId } from 'mongoose';
import type { FilterQuery, PipelineStage } from 'mongoose';
import { CrewProfile, Crews } from '../../libs/dto/crew/crew';
import { CrewCatalogInput, CreateCrewProfileInput, UpdateCrewProfileInput } from '../../libs/dto/crew/crew.input';
import { CrewSortBy, CrewStatus } from '../../libs/enums/crew.enum';
import type { MemberRecord } from '../../libs/schemas/Member.model';

@Injectable()
export class CrewService {
	constructor(
		@InjectModel('CrewProfile') private readonly crewModel: Model<CrewProfile>,
		@InjectModel('Member') private readonly memberModel: Model<MemberRecord>,
	) {}

	async catalog(input: CrewCatalogInput, featuredOnly = false): Promise<Crews> {
		return this.collection(input, true, featuredOnly);
	}

	async getForStaff(input: CrewCatalogInput): Promise<Crews> {
		return this.collection(input, false);
	}

	private async collection(input: CrewCatalogInput, publicOnly: boolean, featuredOnly = false): Promise<Crews> {
		const query = plainToInstance(CrewCatalogInput, input);
		validateInput(query);
		const filter = query.filter ?? {};
		const min = filter.minExperienceYears ?? undefined;
		const max = filter.maxExperienceYears ?? undefined;
		if (min !== undefined && max !== undefined && min > max) {
			throw new BadRequestException('Minimum experience cannot exceed maximum experience');
		}
		const match: FilterQuery<CrewProfile> = {};
		if (publicOnly) match.status = CrewStatus.PUBLISHED;
		else if (filter.status) match.status = filter.status;
		if (filter.role) match.role = filter.role;
		if (filter.nationality) match.nationality = new RegExp(`^${escapeRegex(filter.nationality)}$`, 'i');
		if (filter.location) match.location = new RegExp(escapeRegex(filter.location), 'i');
		if (filter.language) match.languages = new RegExp(`^${escapeRegex(filter.language)}$`, 'i');
		if (filter.featured !== undefined && filter.featured !== null) match.featured = filter.featured;
		if (featuredOnly) match.featured = true;
		if (min !== undefined || max !== undefined) {
			match.experienceYears = {
				...(min !== undefined ? { $gte: min } : {}),
				...(max !== undefined ? { $lte: max } : {}),
			};
		}
		const sortBy = query.sortBy ?? CrewSortBy.NEWEST;
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const pipeline: PipelineStage[] = [{ $match: match }];
		const nameSort = sortBy === CrewSortBy.NAME_ASC || sortBy === CrewSortBy.NAME_DESC;
		if (nameSort) {
			// Use the same presentation name as GraphQL without persisting a derived duplicate.
			pipeline.push({
				$set: {
					_crewSortName: {
						$ifNull: [
							'$displayName',
							{ $trim: { input: { $concat: ['$firstName', ' ', { $ifNull: ['$lastName', ''] }] } } },
						],
					},
				},
			});
		}
		pipeline.push(
			{ $sort: makeSort(sortBy) },
			{
				$facet: {
					list: [
						{ $skip: (page - 1) * limit },
						{ $limit: limit },
						...(nameSort ? [{ $project: { _crewSortName: 0 } }] : []),
					],
					meta: [{ $count: 'total' }],
				},
			},
		);
		const result = await this.crewModel.aggregate<{ list: CrewProfile[]; meta: { total: number }[] }>(pipeline);
		const total = result[0]?.meta?.[0]?.total ?? 0;
		return { list: result[0]?.list ?? [], total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async getById(id: string): Promise<CrewProfile> {
		if (!isValidObjectId(id)) throw new BadRequestException('Invalid crew profile ID');
		const profile = await this.crewModel.findOne({ _id: id, status: CrewStatus.PUBLISHED }).lean().exec();
		if (!profile) throw new NotFoundException('Crew profile not found');
		return profile;
	}

	async create(input: CreateCrewProfileInput): Promise<CrewProfile> {
		const fields = plainToInstance(CreateCrewProfileInput, input);
		validateInput(fields);
		if (fields.memberId !== undefined) await this.validateMemberLink(fields.memberId);
		try {
			const supplied = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
			return await this.crewModel.create({
				...supplied,
				status: fields.status ?? CrewStatus.DRAFT,
				featured: fields.featured ?? false,
			});
		} catch (error) {
			rethrowWriteError(error);
		}
	}

	async update(input: UpdateCrewProfileInput): Promise<CrewProfile> {
		const normalized = plainToInstance(UpdateCrewProfileInput, input);
		validateInput(normalized);
		const { _id, ...supplied } = normalized;
		const fields = Object.fromEntries(Object.entries(supplied).filter(([, value]) => value !== undefined));
		if (normalized.memberId !== undefined) await this.validateMemberLink(normalized.memberId, _id);
		try {
			const profile = await this.crewModel
				.findByIdAndUpdate(_id, { $set: fields }, { new: true, runValidators: true })
				.exec();
			if (!profile) throw new NotFoundException('Crew profile not found');
			return profile;
		} catch (error) {
			rethrowWriteError(error);
		}
	}

	private async validateMemberLink(memberId: string, profileId?: string): Promise<void> {
		// Admin-curated profiles have no self-service authorization relationship.
		// Verify existence only; never fetch credentials or mutate an account role.
		if (!(await this.memberModel.exists({ _id: memberId }))) throw new BadRequestException('Linked member not found');
		const match = { memberId, ...(profileId ? { _id: { $ne: profileId } } : {}) };
		if (await this.crewModel.exists(match))
			throw new BadRequestException('A crew profile already exists for this member');
	}
}

function validateInput(input: object): void {
	if (
		validateSync(input, {
			whitelist: true,
			forbidNonWhitelisted: true,
			validationError: { target: false, value: false },
		}).length
	) {
		throw new BadRequestException('Invalid crew input');
	}
}

function rethrowWriteError(error: unknown): never {
	if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
		throw new BadRequestException('A crew profile already exists for this member');
	}
	throw error;
}

function makeSort(sortBy: CrewSortBy): Record<string, 1 | -1> {
	switch (sortBy) {
		case CrewSortBy.EXPERIENCE_ASC:
			return { experienceYears: 1, _id: -1 };
		case CrewSortBy.EXPERIENCE_DESC:
			return { experienceYears: -1, _id: -1 };
		case CrewSortBy.NAME_ASC:
			return { _crewSortName: 1, _id: -1 };
		case CrewSortBy.NAME_DESC:
			return { _crewSortName: -1, _id: -1 };
		default:
			return { createdAt: -1, _id: -1 };
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
