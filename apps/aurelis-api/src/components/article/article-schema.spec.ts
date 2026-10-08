import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import mongoose from 'mongoose';
import { ArticleCatalogInput, CreateArticleInput, UpdateArticleInput } from '../../libs/dto/article/article.input';
import { ArticleSortBy, ArticleStatus, ArticleType } from '../../libs/enums/article.enum';
import ArticleSchema from '../../libs/schemas/Article.model';
import { normalizeArticleSlug } from './article-slug';

const firstId = '507f1f77bcf86cd7994390aa';
const secondId = '507f1f77bcf86cd7994390bb';
const required = { title: 'Aurelis news', type: ArticleType.NEWS };

describe('Article schema (offline)', () => {
	const ArticleModel = mongoose.model('Step7ArticleSchemaTest', ArticleSchema);
	const valid = { ...required, slug: 'aurelis-news' };

	afterAll(() => mongoose.deleteModel('Step7ArticleSchemaTest'));

	it.each(Object.values(ArticleType))('stores the canonical %s article type', (type) => {
		const article = new ArticleModel({ ...valid, type });
		expect(article.validateSync()).toBeUndefined();
		expect(article.type).toBe(type);
	});

	it('declares one collection, timestamps and backward-safe defaults', () => {
		const article = new ArticleModel(valid);
		expect(article.validateSync()).toBeUndefined();
		expect(article.toObject()).toMatchObject({
			status: ArticleStatus.DRAFT,
			featured: false,
			images: [],
			yachtIds: [],
			destinationIds: [],
		});
		expect(article.authorMemberId).toBeUndefined();
		expect(article.content).toBeUndefined();
		expect(article.publishAt).toBeUndefined();
		expect(article.publishedAt).toBeUndefined();
		expect(ArticleSchema.get('collection')).toBe('articles');
		expect(ArticleSchema.get('timestamps')).toBe(true);
	});

	it('stores simple content, image paths, author metadata and BSON links', () => {
		const fields = {
			...valid,
			title: '  Editorial  ',
			excerpt: '  A preview  ',
			content: '  Aurelis original editorial content  ',
			coverImage: ' /uploads/article.jpg ',
			images: [' https://example.com/gallery.jpg ', '/uploads/detail.jpg'],
			authorName: ' Editorial team ',
			authorMemberId: firstId,
			yachtIds: [firstId, secondId],
			destinationIds: [secondId],
			publishAt: new Date('2030-01-01T12:00:00.000Z'),
			publishedAt: new Date('2026-01-01T12:00:00.000Z'),
		};
		const article = new ArticleModel(fields);
		expect(article.validateSync()).toBeUndefined();
		expect(article.toObject()).toMatchObject({
			title: 'Editorial',
			excerpt: 'A preview',
			content: 'Aurelis original editorial content',
			coverImage: '/uploads/article.jpg',
			images: ['https://example.com/gallery.jpg', '/uploads/detail.jpg'],
			authorName: 'Editorial team',
			publishAt: fields.publishAt,
			publishedAt: fields.publishedAt,
		});
		expect(article.authorMemberId).toBeInstanceOf(mongoose.Types.ObjectId);
		expect(article.yachtIds.map((id) => id.toHexString())).toEqual([firstId, secondId]);
		expect(article.destinationIds.map((id) => id.toHexString())).toEqual([secondId]);
	});

	it.each(
		[
			{ title: '' },
			{ title: '  ' },
			{ title: 'x'.repeat(201) },
			{ slug: 'bad/slug' },
			{ slug: 'has spaces' },
			{ slug: 'UPPERCASE' },
			{ slug: 'x'.repeat(201) },
			{ type: 'BLOG' },
			{ status: 'DELETED' },
			{ excerpt: 'x'.repeat(1001) },
			{ content: '  ' },
			{ content: 'x'.repeat(200001) },
			{ coverImage: '  ' },
			{ images: ['  '] },
			{ images: ['x'.repeat(2049)] },
			{ authorName: '  ' },
			{ authorMemberId: 'invalid' },
			{ publishAt: 'invalid' },
			{ publishedAt: 'invalid' },
			{ yachtIds: ['invalid'] },
			{ destinationIds: ['invalid'] },
			{ yachtIds: [firstId, firstId.toUpperCase()] },
			{ destinationIds: [firstId, firstId.toUpperCase()] },
		].map((patch) => [Object.keys(patch)[0], patch] as const),
	)('rejects invalid persisted %s values at their field boundaries', (_field, patch) => {
		expect(new ArticleModel({ ...valid, ...patch }).validateSync()).toBeDefined();
	});

	it('declares globally unique slugs and justified independent discovery indexes', () => {
		const indexes = ArticleSchema.indexes();
		expect(indexes).toHaveLength(6);
		expect(indexes).toContainEqual([{ slug: 1 }, expect.objectContaining({ unique: true })]);
		expect(indexes.map(([keys]) => keys)).toEqual([
			{ slug: 1 },
			{ status: 1, publishedAt: -1, _id: -1 },
			{ status: 1, featured: -1, publishedAt: -1, _id: -1 },
			{ status: 1, type: 1, publishedAt: -1, _id: -1 },
			{ status: 1, yachtIds: 1, publishedAt: -1, _id: -1 },
			{ status: 1, destinationIds: 1, publishedAt: -1, _id: -1 },
		]);
		expect(ArticleSchema.path('authorMemberId').options).toMatchObject({ ref: 'Member' });
		expect(ArticleSchema.path('yachtIds').options).toMatchObject({ type: [{ ref: 'Yacht' }] });
		expect(ArticleSchema.path('destinationIds').options).toMatchObject({ type: [{ ref: 'Destination' }] });
	});
});

describe('Article inputs', () => {
	it('trims presentation strings and accepts either URL or relative image paths', () => {
		const input = plainToInstance(CreateArticleInput, {
			...required,
			title: ' Aurelis news ',
			excerpt: ' Preview ',
			content: ' Simple text ',
			coverImage: ' /uploads/article.jpg ',
			images: [' https://example.com/article.jpg ', ' /uploads/detail.jpg '],
			authorName: ' Aurelis team ',
			publishAt: '2030-01-01T00:00:00.000Z',
			yachtIds: [firstId, secondId],
			destinationIds: [secondId],
		});
		expect(validateSync(input)).toEqual([]);
		expect(input).toMatchObject({
			title: 'Aurelis news',
			excerpt: 'Preview',
			content: 'Simple text',
			coverImage: '/uploads/article.jpg',
			images: ['https://example.com/article.jpg', '/uploads/detail.jpg'],
			authorName: 'Aurelis team',
			publishAt: new Date('2030-01-01T00:00:00.000Z'),
		});
	});

	it.each(
		[
			{ title: ' ' },
			{ title: 123 },
			{ title: 'x'.repeat(201) },
			{ type: 'BLOG' },
			{ status: 'BAD' },
			{ slug: '' },
			{ slug: 'x'.repeat(201) },
			{ excerpt: 'x'.repeat(1001) },
			{ content: ' ' },
			{ content: 123 },
			{ content: 'x'.repeat(200001) },
			{ coverImage: ' ' },
			{ images: [' '] },
			{ images: [123] },
			{ images: ['x'.repeat(2049)] },
			{ authorName: ' ' },
			{ authorName: 'x'.repeat(121) },
			{ authorMemberId: 'not-an-id' },
			{ featured: 'true' },
			{ publishAt: 'not-a-date' },
			{ yachtIds: ['invalid'] },
			{ destinationIds: ['invalid'] },
			{ yachtIds: [firstId, firstId.toUpperCase()] },
			{ destinationIds: [firstId, firstId.toUpperCase()] },
		].map((patch) => [Object.keys(patch)[0], patch] as const),
	)('rejects invalid %s mutation values', (_field, patch) => {
		expect(validateSync(plainToInstance(CreateArticleInput, { ...required, ...patch }))).not.toEqual([]);
	});

	it.each([
		'title',
		'type',
		'slug',
		'status',
		'excerpt',
		'content',
		'coverImage',
		'images',
		'authorName',
		'authorMemberId',
		'featured',
		'publishAt',
		'yachtIds',
		'destinationIds',
	])('rejects explicit null for %s on both create and partial update', (field) => {
		const create = plainToInstance(CreateArticleInput, { ...required, [field]: null });
		const update = plainToInstance(UpdateArticleInput, { _id: firstId, [field]: null });
		expect(validateSync(create).map((error) => error.property)).toContain(field);
		expect(validateSync(update).map((error) => error.property)).toContain(field);
	});

	it('allows minimal drafts, title-only partial updates and explicit empty-array replacement', () => {
		expect(validateSync(plainToInstance(CreateArticleInput, required))).toEqual([]);
		const update = plainToInstance(UpdateArticleInput, { _id: firstId, title: ' New title ' });
		expect(validateSync(update)).toEqual([]);
		expect(update.title).toBe('New title');
		for (const field of ['slug', 'type', 'status', 'featured', 'yachtIds', 'destinationIds', 'images']) {
			expect(Object.prototype.hasOwnProperty.call(update, field) && Reflect.get(update, field) !== undefined).toBe(
				false,
			);
		}
		expect(
			validateSync(plainToInstance(UpdateArticleInput, { _id: firstId, yachtIds: [], destinationIds: [], images: [] })),
		).toEqual([]);
	});

	it('does not allow callers to set service-controlled publishedAt', async () => {
		const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
		await expect(
			pipe.transform({ ...required, publishedAt: new Date() }, { type: 'body', metatype: CreateArticleInput }),
		).rejects.toThrow('Bad Request');
		await expect(
			pipe.transform({ _id: firstId, publishedAt: new Date() }, { type: 'body', metatype: UpdateArticleInput }),
		).rejects.toThrow('Bad Request');
	});

	it('defaults to page 1, limit 20 and PUBLISHED_NEWEST', () => {
		const input = plainToInstance(ArticleCatalogInput, {});
		expect(validateSync(input)).toEqual([]);
		expect(input).toMatchObject({ page: 1, limit: 20, sortBy: ArticleSortBy.PUBLISHED_NEWEST });
	});

	it.each(Object.values(ArticleSortBy))('accepts deterministic sort %s with maximum page size', (sortBy) => {
		expect(validateSync(plainToInstance(ArticleCatalogInput, { sortBy, page: 2, limit: 50 }))).toEqual([]);
	});

	it.each([
		{ page: 0 },
		{ page: 1.5 },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: 1.5 },
		{ sortBy: 'BAD' },
		{ filter: { type: 'BAD' } },
		{ filter: { status: 'BAD' } },
		{ filter: { featured: 'true' } },
		{ filter: { authorMemberId: 'invalid' } },
		{ filter: { yachtId: 'invalid' } },
		{ filter: { destinationId: 'invalid' } },
		{ filter: { search: 'x'.repeat(201) } },
	])('rejects invalid catalog values: %j', (value) => {
		expect(validateSync(plainToInstance(ArticleCatalogInput, value))).not.toEqual([]);
	});

	it('accepts all filters and trims search without changing user-controlled punctuation', () => {
		const filter = {
			type: ArticleType.GUIDE,
			status: ArticleStatus.ARCHIVED,
			featured: false,
			authorMemberId: firstId,
			yachtId: firstId,
			destinationId: secondId,
			search: '  C++ (yachting)  ',
		};
		const input = plainToInstance(ArticleCatalogInput, { filter });
		expect(validateSync(input)).toEqual([]);
		expect(input.filter).toMatchObject({ ...filter, search: 'C++ (yachting)' });
	});
});

describe('Article canonical slug helper', () => {
	it.each([
		['  Aurelis   News  ', 'aurelis-news'],
		['--Aurelis---News--', 'aurelis-news'],
		['Caf\u00e9 Insights', 'cafe-insights'],
	])('normalizes explicit safe slug %s', (value, expected) => {
		expect(normalizeArticleSlug(value)).toBe(expected);
	});

	it('generates slugs from titles using the same helper', () => {
		expect(normalizeArticleSlug('Mediterranean: News & Insights!', true)).toBe('mediterranean-news-insights');
	});

	it.each(['', '  ', 'bad/slug', 'query?value', 'percent%20encoded', 'a_b', 'x'.repeat(201), '\ud83d\udea4'])(
		'rejects unsafe or empty explicit slug %s',
		(value) => expect(() => normalizeArticleSlug(value)).toThrow('Article slug'),
	);

	it('rejects non-string values instead of coercing them', () => {
		expect(() => normalizeArticleSlug(123 as unknown as string)).toThrow('Invalid article slug');
	});
});
