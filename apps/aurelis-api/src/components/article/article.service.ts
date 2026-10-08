import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { Article, Articles } from '../../libs/dto/article/article';
import { ArticleCatalogInput, CreateArticleInput, UpdateArticleInput } from '../../libs/dto/article/article.input';
import { ArticleSortBy, ArticleStatus } from '../../libs/enums/article.enum';
import type { MemberRecord } from '../../libs/schemas/Member.model';
import type { Yacht } from '../../libs/dto/yacht/yacht';
import type { Destination } from '../../libs/dto/destination/destination';
import { normalizeArticleSlug } from './article-slug';

// Query-driven availability: no scheduler or status mutation is needed at publishAt.
export function buildPublicArticleVisibilityFilter(now = new Date(Date.now())): FilterQuery<Article> {
	return {
		status: ArticleStatus.PUBLISHED,
		$or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }],
	};
}

@Injectable()
export class ArticleService {
	constructor(
		@InjectModel('Article') private readonly articleModel: Model<Article>,
		@InjectModel('Member') private readonly memberModel: Model<MemberRecord>,
		@InjectModel('Yacht') private readonly yachtModel: Model<Yacht>,
		@InjectModel('Destination') private readonly destinationModel: Model<Destination>,
	) {}

	async catalog(input: ArticleCatalogInput, featuredOnly = false): Promise<Articles> {
		return this.collection(input, true, featuredOnly);
	}

	async getForAdmin(input: ArticleCatalogInput): Promise<Articles> {
		return this.collection(input, false);
	}

	private async collection(input: ArticleCatalogInput, publicOnly: boolean, featuredOnly = false): Promise<Articles> {
		const query = plainToInstance(ArticleCatalogInput, input);
		validateInput(query);
		const filter = query.filter ?? {};
		const match: FilterQuery<Article> = publicOnly ? buildPublicArticleVisibilityFilter() : {};
		if (!publicOnly && filter.status) match.status = filter.status;
		if (filter.type) match.type = filter.type;
		if (filter.featured !== undefined && filter.featured !== null) match.featured = filter.featured;
		if (featuredOnly) match.featured = true;
		if (filter.authorMemberId) match.authorMemberId = new Types.ObjectId(filter.authorMemberId);
		if (filter.yachtId) match.yachtIds = new Types.ObjectId(filter.yachtId);
		if (filter.destinationId) match.destinationIds = new Types.ObjectId(filter.destinationId);
		if (filter.search) {
			const search = new RegExp(escapeRegex(filter.search), 'i');
			// Keep search independent from the publication timing OR condition.
			match.$and = [{ $or: [{ title: search }, { excerpt: search }, { authorName: search }] }];
		}
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const result = await this.articleModel.aggregate<{ list: Article[]; meta: { total: number }[] }>([
			{ $match: match },
			{ $sort: makeSort(query.sortBy ?? ArticleSortBy.PUBLISHED_NEWEST) },
			{ $facet: { list: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } },
		]);
		const total = result[0]?.meta?.[0]?.total ?? 0;
		return { list: result[0]?.list ?? [], total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async getBySlug(slug: string): Promise<Article> {
		const article = await this.articleModel
			.findOne({ slug: normalizeArticleSlug(slug), ...buildPublicArticleVisibilityFilter() })
			.lean()
			.exec();
		if (!article) throw new NotFoundException('Article not found');
		return article;
	}

	async create(input: CreateArticleInput): Promise<Article> {
		const normalized = plainToInstance(CreateArticleInput, input);
		validateInput(normalized);
		const status = normalized.status ?? ArticleStatus.DRAFT;
		validatePublishableContent(status, normalized.content);
		const slug = normalizeArticleSlug(normalized.slug ?? normalized.title, normalized.slug === undefined);
		await this.validateSlug(slug);
		await this.validateLinks(normalized);
		try {
			return await this.articleModel.create({
				...defined(normalized),
				slug,
				status,
				featured: normalized.featured ?? false,
				images: normalized.images ?? [],
				yachtIds: normalized.yachtIds ?? [],
				destinationIds: normalized.destinationIds ?? [],
				...(status === ArticleStatus.PUBLISHED ? { publishedAt: new Date(Date.now()) } : {}),
			});
		} catch (error) {
			rethrowWriteError(error);
		}
	}

	async update(input: UpdateArticleInput): Promise<Article> {
		const normalized = plainToInstance(UpdateArticleInput, input);
		validateInput(normalized);
		const { _id, ...supplied } = normalized;
		const existing = await this.articleModel.findById(_id).lean().exec();
		if (!existing) throw new NotFoundException('Article not found');
		const fields = defined(supplied);
		const status = normalized.status ?? existing.status;
		validatePublishableContent(status, normalized.content ?? existing.content);
		if (normalized.slug !== undefined) {
			fields.slug = normalizeArticleSlug(normalized.slug);
			await this.validateSlug(fields.slug as string, _id);
		}
		await this.validateLinks(normalized);
		try {
			const options = { new: true, runValidators: true };
			if (status === ArticleStatus.PUBLISHED && !existing.publishedAt) {
				// MongoDB null matches missing timestamps as well. A conditional write
				// prevents competing first publications from replacing the first stamp.
				const firstPublication = await this.articleModel
					.findOneAndUpdate(
						{ _id, publishedAt: null },
						{ $set: { ...fields, publishedAt: new Date(Date.now()) } },
						options,
					)
					.exec();
				if (firstPublication) return firstPublication;
			}
			const article = await this.articleModel.findByIdAndUpdate(_id, { $set: fields }, options).exec();
			if (!article) throw new NotFoundException('Article not found');
			return article;
		} catch (error) {
			rethrowWriteError(error);
		}
	}

	private async validateSlug(slug: string, id?: string): Promise<void> {
		if (await this.articleModel.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) }))
			throw new BadRequestException('Article slug already exists');
	}

	private async validateLinks(
		input: Pick<CreateArticleInput, 'authorMemberId' | 'yachtIds' | 'destinationIds'>,
	): Promise<void> {
		if (input.authorMemberId !== undefined && !(await this.memberModel.exists({ _id: input.authorMemberId })))
			throw new BadRequestException('Article author member not found');
		if (input.yachtIds !== undefined && input.yachtIds.length) {
			const count = await this.yachtModel.countDocuments({ _id: { $in: input.yachtIds } });
			if (count !== input.yachtIds.length) throw new BadRequestException('Article yacht not found');
		}
		if (input.destinationIds !== undefined && input.destinationIds.length) {
			const count = await this.destinationModel.countDocuments({ _id: { $in: input.destinationIds } });
			if (count !== input.destinationIds.length) throw new BadRequestException('Article destination not found');
		}
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
		throw new BadRequestException('Invalid article input');
}

function validatePublishableContent(status: ArticleStatus, content?: string): void {
	if (status === ArticleStatus.PUBLISHED && (typeof content !== 'string' || !content.trim()))
		throw new BadRequestException('Published articles require content');
}

function rethrowWriteError(error: unknown): never {
	if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)
		throw new BadRequestException('Article slug already exists');
	throw error;
}

function makeSort(sort: ArticleSortBy): Record<string, 1 | -1> {
	switch (sort) {
		case ArticleSortBy.NEWEST:
			return { createdAt: -1, _id: -1 };
		case ArticleSortBy.OLDEST:
			return { createdAt: 1, _id: 1 };
		case ArticleSortBy.TITLE_ASC:
			return { title: 1, _id: 1 };
		case ArticleSortBy.TITLE_DESC:
			return { title: -1, _id: 1 };
		case ArticleSortBy.FEATURED:
			return { featured: -1, publishedAt: -1, _id: -1 };
		default:
			return { publishedAt: -1, _id: -1 };
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
