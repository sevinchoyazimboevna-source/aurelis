import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ArticleService } from './article.service';
import { ArticleSortBy, ArticleStatus, ArticleType } from '../../libs/enums/article.enum';

type Fields = Record<string, unknown>;
type WriteQuery = { exec: () => Promise<Fields | null> };
type ReadQuery = { lean: () => WriteQuery };
type Update = { $set: Fields };
type BulkMatch = { _id: { $in: string[] } };
type Stage = { $match?: Fields; $sort?: Fields; $facet?: { list: Fields[]; meta: Fields[] } };
type AggregateResult = { list: Fields[]; meta: { total: number }[] }[];

const id = (value: number) => value.toString(16).padStart(24, '0');
const articleId = id(1);
const memberId = id(2);
const now = new Date('2026-10-06T12:00:00.000Z');
const historicalPublication = new Date('2026-09-01T10:00:00.000Z');
const valid = { title: '  Aurelis Editorial  ', type: ArticleType.NEWS };
const options = { new: true, runValidators: true };
const publicVisibility = () => ({
	status: ArticleStatus.PUBLISHED,
	$or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }],
});

function fixture() {
	let existing: Fields | null = {
		_id: articleId,
		title: 'Original title',
		slug: 'original-slug',
		type: ArticleType.NEWS,
		status: ArticleStatus.DRAFT,
		content: 'Existing editorial content',
		featured: true,
		yachtIds: [id(3)],
		destinationIds: [id(4)],
	};
	const model = {
		aggregate: jest
			.fn<Promise<AggregateResult>, [Stage[]]>()
			.mockResolvedValue([{ list: [{ _id: articleId }], meta: [{ total: 41 }] }]),
		exists: jest.fn<Promise<{ _id: string } | null>, [Fields]>().mockResolvedValue(null),
		create: jest.fn<Promise<Fields>, [Fields]>((fields) => Promise.resolve(fields)),
		findById: jest.fn<ReadQuery, [string]>(() => ({
			lean: () => ({ exec: () => Promise.resolve(existing) }),
		})),
		findOne: jest.fn<ReadQuery, [Fields]>().mockReturnValue({
			lean: () => ({ exec: () => Promise.resolve(null) }),
		}),
		findByIdAndUpdate: jest.fn<WriteQuery, [string, Update, typeof options]>((_id, update) => ({
			exec: () => Promise.resolve(existing ? { ...existing, ...update.$set } : null),
		})),
		findOneAndUpdate: jest.fn<WriteQuery, [Fields, Update, typeof options]>((_match, update) => ({
			exec: () => Promise.resolve(existing ? { ...existing, ...update.$set } : null),
		})),
	};
	const members = { exists: jest.fn<Promise<{ _id: string } | null>, [Fields]>().mockResolvedValue({ _id: memberId }) };
	const yachts = {
		countDocuments: jest.fn<Promise<number>, [BulkMatch]>((match) => Promise.resolve(match._id.$in.length)),
	};
	const destinations = {
		countDocuments: jest.fn<Promise<number>, [BulkMatch]>((match) => Promise.resolve(match._id.$in.length)),
	};
	const service = new ArticleService(model as never, members as never, yachts as never, destinations as never);
	return {
		model,
		members,
		yachts,
		destinations,
		service,
		setExisting: (value: Fields | null) => {
			existing = value;
		},
		patchExisting: (fields: Fields) => {
			existing = { ...existing, ...fields };
		},
	};
}

describe('ArticleService writes (offline)', () => {
	let f: ReturnType<typeof fixture>;
	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
		f = fixture();
	});
	afterEach(() => jest.restoreAllMocks());

	it.each(Object.values(ArticleType))('creates %s with a canonical slug and safe defaults', async (type) => {
		expect(await f.service.create({ ...valid, type })).toMatchObject({
			title: 'Aurelis Editorial',
			slug: 'aurelis-editorial',
			type,
			status: ArticleStatus.DRAFT,
			featured: false,
			yachtIds: [],
			destinationIds: [],
		});
		expect(f.model.create.mock.calls[0][0]).not.toHaveProperty('publishedAt');
		expect(f.members.exists).not.toHaveBeenCalled();
		expect(f.yachts.countDocuments).not.toHaveBeenCalled();
		expect(f.destinations.countDocuments).not.toHaveBeenCalled();
	});
	it.each([
		['  AURELIS  Editorial ', 'aurelis-editorial'],
		['Crème-Brûlée', 'creme-brulee'],
		['a---b', 'a-b'],
	])('normalizes explicit slug %s', async (slug, expected) => {
		expect(await f.service.create({ ...valid, slug })).toMatchObject({ slug: expected });
	});
	it('generates a punctuation-safe slug from the title', async () => {
		expect(await f.service.create({ ...valid, title: 'St. Barts: a guide' })).toMatchObject({
			slug: 'st-barts-a-guide',
		});
	});
	it('trims presentation metadata and image entries without interpreting editorial content', async () => {
		expect(
			await f.service.create({
				...valid,
				excerpt: ' Editorial preview ',
				content: '  A simple article\nwith content.  ',
				authorName: ' Aurelis Editorial Team ',
				coverImage: ' /images/cover.jpg ',
				images: [' /images/detail.jpg '],
			}),
		).toMatchObject({
			excerpt: 'Editorial preview',
			content: 'A simple article\nwith content.',
			authorName: 'Aurelis Editorial Team',
			coverImage: '/images/cover.jpg',
			images: ['/images/detail.jpg'],
		});
	});
	it('accepts an unpublished article without content and a featured draft stays DRAFT', async () => {
		expect(await f.service.create({ ...valid, featured: true })).toMatchObject({
			status: ArticleStatus.DRAFT,
			featured: true,
		});
	});
	it.each(['', ' ', 'a/b', 'a?b', 'a#b', 'a_b', 'a.b', '😀', 'x'.repeat(201)])(
		'rejects unsafe or empty explicit slug %s before persistence',
		async (slug) => {
			await expect(f.service.create({ ...valid, slug })).rejects.toBeInstanceOf(BadRequestException);
			await expect(f.service.update({ _id: articleId, slug })).rejects.toBeInstanceOf(BadRequestException);
			expect(f.model.create).not.toHaveBeenCalled();
			expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
			expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ title: '' },
		{ title: '  ' },
		{ title: 3 },
		{ title: 'x'.repeat(201) },
		{ type: 'BLOG' },
		{ status: 'DELETED' },
		{ featured: 'true' },
		{ publishAt: 'not-a-date' },
		{ publishAt: new Date('invalid') },
		{ authorMemberId: 'invalid' },
		{ yachtIds: ['invalid'] },
		{ destinationIds: ['invalid'] },
		{ images: [' '] },
		{ images: [3] },
		{ images: 'image.jpg' },
		{ coverImage: '' },
		{ coverImage: 3 },
		{ coverImage: 'x'.repeat(2049) },
		{ images: ['x'.repeat(2049)] },
		{ authorName: 3 },
		{ authorName: 'x'.repeat(121) },
		{ excerpt: 3 },
		{ excerpt: 'x'.repeat(1001) },
		{ content: 3 },
		{ content: 'x'.repeat(200001) },
		{ publishedAt: now },
		{ password: 'must-not-store' },
		{ rogue: true },
	])('rejects invalid create/update fields %j without writes', async (patch) => {
		await expect(f.service.create({ ...valid, ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		await expect(f.service.update({ _id: articleId, ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.create).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it.each([
		'title',
		'slug',
		'type',
		'status',
		'featured',
		'content',
		'excerpt',
		'coverImage',
		'images',
		'authorName',
		'authorMemberId',
		'publishAt',
		'yachtIds',
		'destinationIds',
	])('rejects explicit null mutation field %s', async (field) => {
		await expect(f.service.create({ ...valid, [field]: null })).rejects.toBeInstanceOf(BadRequestException);
		await expect(f.service.update({ _id: articleId, [field]: null })).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.create).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it.each([{ title: undefined }, { type: undefined }])('requires creation fields %j', async (patch) => {
		await expect(f.service.create({ ...valid, ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it('rejects malformed update IDs before reading or writing', async () => {
		await expect(f.service.update({ _id: 'invalid', title: 'New title' })).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findById).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('checks global slug conflicts across all statuses on create/update', async () => {
		f.model.exists.mockResolvedValue({ _id: id(99) });
		await expect(f.service.create(valid)).rejects.toThrow('slug already exists');
		await expect(f.service.update({ _id: articleId, slug: 'existing' })).rejects.toThrow('slug already exists');
		expect(f.model.exists).toHaveBeenCalledWith({ slug: 'aurelis-editorial' });
		expect(f.model.exists).toHaveBeenCalledWith({ slug: 'existing', _id: { $ne: articleId } });
		expect(f.model.create).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('maps duplicate-index write races without database details', async () => {
		const failure = Object.assign(new Error('private collection/index details'), { code: 11000 });
		f.model.create.mockRejectedValue(failure);
		f.model.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.reject(failure) });
		await expect(f.service.create(valid)).rejects.toThrow('slug already exists');
		await expect(f.service.update({ _id: articleId, slug: 'new' })).rejects.toThrow('slug already exists');
	});
	it('preserves unexpected write errors for the shared formatter', async () => {
		const failure = new Error('unexpected storage failure');
		f.model.create.mockRejectedValue(failure);
		f.model.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.reject(failure) });
		await expect(f.service.create(valid)).rejects.toBe(failure);
		await expect(f.service.update({ _id: articleId, title: 'Changed' })).rejects.toBe(failure);
	});
	it('changes the title without changing the slug, links, featured or omitted metadata', async () => {
		const result = await f.service.update({ _id: articleId, title: ' New title ', featured: undefined });
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(articleId, { $set: { title: 'New title' } }, options);
		expect(result).toMatchObject({ slug: 'original-slug', yachtIds: [id(3)], destinationIds: [id(4)], featured: true });
		expect(f.model.exists).not.toHaveBeenCalled();
		expect(f.members.exists).not.toHaveBeenCalled();
		expect(f.yachts.countDocuments).not.toHaveBeenCalled();
		expect(f.destinations.countDocuments).not.toHaveBeenCalled();
	});
	it('normalizes explicit slug changes while allowing the current record to retain it', async () => {
		await f.service.update({
			_id: articleId,
			slug: 'NEW Slug',
			featured: false,
			images: [],
			yachtIds: [],
			destinationIds: [],
		});
		expect(f.model.exists).toHaveBeenCalledWith({ slug: 'new-slug', _id: { $ne: articleId } });
		expect(f.model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({
			slug: 'new-slug',
			featured: false,
			images: [],
			yachtIds: [],
			destinationIds: [],
		});
	});
	it('reports missing articles and concurrent removal without successful writes', async () => {
		f.setExisting(null);
		await expect(f.service.update({ _id: articleId, title: 'New' })).rejects.toBeInstanceOf(NotFoundException);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
		f.patchExisting({ _id: articleId, status: ArticleStatus.DRAFT });
		f.model.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
		await expect(f.service.update({ _id: articleId, title: 'New' })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('verifies author existence without Member role/status restrictions or account mutation', async () => {
		await f.service.create({ ...valid, authorName: 'Independent Author', authorMemberId: memberId });
		await f.service.update({ _id: articleId, authorMemberId: memberId });
		expect(f.members.exists).toHaveBeenNthCalledWith(1, { _id: memberId });
		expect(f.members.exists).toHaveBeenNthCalledWith(2, { _id: memberId });
		expect(f.model.create.mock.calls[0][0]).toMatchObject({
			authorMemberId: memberId,
			authorName: 'Independent Author',
		});
	});
	it('rejects nonexistent authors on create/update before persistence', async () => {
		f.members.exists.mockResolvedValue(null);
		await expect(f.service.create({ ...valid, authorMemberId: memberId })).rejects.toBeInstanceOf(BadRequestException);
		await expect(f.service.update({ _id: articleId, authorMemberId: memberId })).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(f.model.create).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});

	describe.each(['yachtIds', 'destinationIds'] as const)('%s relationships', (field) => {
		it.each([[id(3)], [id(3), id(4)]])('accepts existing links %j regardless of publication status', async (...ids) => {
			const model = field === 'yachtIds' ? f.yachts : f.destinations;
			await f.service.create({ ...valid, [field]: ids });
			await f.service.update({ _id: articleId, [field]: ids });
			expect(model.countDocuments).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });
			expect(model.countDocuments).toHaveBeenNthCalledWith(2, { _id: { $in: ids } });
			expect(f.model.create.mock.calls[0][0][field]).toEqual(ids);
		});
		it.each([['invalid'], [id(3), id(3)], ['abcdefabcdefabcdefabcdef', 'ABCDEFABCDEFABCDEFABCDEF'], [null]])(
			'rejects malformed or duplicate supplied links %j',
			async (...ids) => {
				const model = field === 'yachtIds' ? f.yachts : f.destinations;
				await expect(f.service.create({ ...valid, [field]: ids })).rejects.toBeInstanceOf(BadRequestException);
				await expect(f.service.update({ _id: articleId, [field]: ids })).rejects.toBeInstanceOf(BadRequestException);
				expect(model.countDocuments).not.toHaveBeenCalled();
				expect(f.model.create).not.toHaveBeenCalled();
				expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
			},
		);
		it('rejects missing referenced documents on create/update', async () => {
			const model = field === 'yachtIds' ? f.yachts : f.destinations;
			model.countDocuments.mockResolvedValue(1);
			await expect(f.service.create({ ...valid, [field]: [id(3), id(4)] })).rejects.toBeInstanceOf(BadRequestException);
			await expect(f.service.update({ _id: articleId, [field]: [id(3), id(4)] })).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(f.model.create).not.toHaveBeenCalled();
			expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
		});
		it('allows explicit empty arrays to clear links without querying related collections', async () => {
			await f.service.update({ _id: articleId, [field]: [] });
			expect(f.model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ [field]: [] });
			expect(f.yachts.countDocuments).not.toHaveBeenCalled();
			expect(f.destinations.countDocuments).not.toHaveBeenCalled();
		});
	});
});

describe('ArticleService publication metadata and transitions (offline)', () => {
	let f: ReturnType<typeof fixture>;
	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
		f = fixture();
	});
	afterEach(() => jest.restoreAllMocks());

	it.each([undefined, '', '   '])('requires nonblank content to create a published article (%s)', async (content) => {
		await expect(f.service.create({ ...valid, status: ArticleStatus.PUBLISHED, content })).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it('stamps publication once for a new scheduled PUBLISHED article without a scheduler', async () => {
		const publishAt = new Date('2026-11-01T12:00:00.000Z');
		expect(
			await f.service.create({ ...valid, status: ArticleStatus.PUBLISHED, content: ' Editorial ', publishAt }),
		).toMatchObject({
			status: ArticleStatus.PUBLISHED,
			content: 'Editorial',
			publishAt,
			publishedAt: now,
		});
	});
	it.each([ArticleStatus.DRAFT, ArticleStatus.ARCHIVED])('does not stamp initial %s articles', async (status) => {
		await f.service.create({ ...valid, status, content: 'Editorial' });
		expect(f.model.create.mock.calls[0][0]).not.toHaveProperty('publishedAt');
	});
	it('publishes using merged existing content and atomically stamps an absent timestamp', async () => {
		await f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED });
		expect(f.model.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: articleId, publishedAt: null },
			{ $set: { status: ArticleStatus.PUBLISHED, publishedAt: now } },
			options,
		);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('requires merged nonblank content for first publish', async () => {
		f.patchExisting({ content: undefined });
		await expect(f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED })).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('accepts supplied content while publishing an empty draft', async () => {
		f.patchExisting({ content: undefined });
		await f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED, content: ' New content ' });
		expect(f.model.findOneAndUpdate.mock.calls[0][1].$set).toEqual({
			status: ArticleStatus.PUBLISHED,
			content: 'New content',
			publishedAt: now,
		});
	});
	it('rejects clearing content on an effectively published record', async () => {
		f.patchExisting({ status: ArticleStatus.PUBLISHED, publishedAt: historicalPublication });
		await expect(f.service.update({ _id: articleId, content: ' ' })).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('stamps a legacy PUBLISHED article once during an edit when publication metadata is absent', async () => {
		f.patchExisting({ status: ArticleStatus.PUBLISHED });
		await f.service.update({ _id: articleId, excerpt: 'New preview' });
		expect(f.model.findOneAndUpdate.mock.calls[0][1].$set).toEqual({ excerpt: 'New preview', publishedAt: now });
	});
	it('preserves the concurrent first-publisher timestamp on retry', async () => {
		f.model.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
		f.model.findByIdAndUpdate.mockReturnValue({
			exec: () => Promise.resolve({ _id: articleId, publishedAt: historicalPublication }),
		});
		expect(await f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED })).toMatchObject({
			publishedAt: historicalPublication,
		});
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(
			articleId,
			{ $set: { status: ArticleStatus.PUBLISHED } },
			options,
		);
	});
	it('maps slug conflicts during conditional first-publication writes', async () => {
		const failure = Object.assign(new Error('Duplicate slug'), { code: 11000 });
		f.model.findOneAndUpdate.mockReturnValue({ exec: () => Promise.reject(failure) });
		await expect(f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED, slug: 'new' })).rejects.toThrow(
			'slug already exists',
		);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('reports concurrent removal during conditional first publication', async () => {
		f.model.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
		f.model.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
		await expect(f.service.update({ _id: articleId, status: ArticleStatus.PUBLISHED })).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
	it.each([
		[ArticleStatus.DRAFT, ArticleStatus.PUBLISHED],
		[ArticleStatus.PUBLISHED, ArticleStatus.DRAFT],
		[ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED],
		[ArticleStatus.DRAFT, ArticleStatus.ARCHIVED],
		[ArticleStatus.ARCHIVED, ArticleStatus.DRAFT],
		[ArticleStatus.ARCHIVED, ArticleStatus.PUBLISHED],
	])('allows %s -> %s while preserving historical publication/content/links', async (from, status) => {
		f.patchExisting({ status: from, publishedAt: historicalPublication });
		const result = await f.service.update({ _id: articleId, status });
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(articleId, { $set: { status } }, options);
		expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status,
			publishedAt: historicalPublication,
			content: 'Existing editorial content',
			yachtIds: [id(3)],
			destinationIds: [id(4)],
		});
	});
	it('preserves publishedAt on later published edits and schedule changes', async () => {
		f.patchExisting({ status: ArticleStatus.PUBLISHED, publishedAt: historicalPublication });
		const publishAt = new Date('2026-11-01T12:00:00.000Z');
		const result = await f.service.update({ _id: articleId, excerpt: 'Revised preview', publishAt });
		expect(f.model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ excerpt: 'Revised preview', publishAt });
		expect(result).toMatchObject({ publishedAt: historicalPublication });
	});
});

describe('ArticleService public/admin discovery (offline)', () => {
	let f: ReturnType<typeof fixture>;
	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
		f = fixture();
	});
	afterEach(() => jest.restoreAllMocks());
	const matchAt = (model: ReturnType<typeof fixture>['model'], call = 0) =>
		model.aggregate.mock.calls[call][0][0].$match!;

	it.each(Object.values(ArticleStatus))(
		'overrides public status %s without restricting admin status/timing',
		async (status) => {
			await f.service.catalog({ filter: { status } });
			expect(matchAt(f.model)).toEqual(publicVisibility());
			await f.service.getForAdmin({ filter: { status } });
			expect(matchAt(f.model, 1)).toEqual({ status });
		},
	);
	it('admin unrestricted discovery has no public status or timing predicate', async () => {
		await f.service.getForAdmin({});
		expect(matchAt(f.model)).toEqual({});
	});
	it('uses the same visibility condition for list, detail and featured regardless of filters', async () => {
		await f.service.catalog({});
		await expect(f.service.getBySlug(' TEST ')).rejects.toBeInstanceOf(NotFoundException);
		await f.service.catalog({ filter: { featured: false, status: ArticleStatus.ARCHIVED } }, true);
		expect(matchAt(f.model)).toEqual(publicVisibility());
		expect(f.model.findOne).toHaveBeenCalledWith({ ...publicVisibility(), slug: 'test' });
		expect(matchAt(f.model, 1)).toEqual({ ...publicVisibility(), featured: true });
	});
	it('returns a visible canonical slug article without populating linked entities or Member credentials', async () => {
		const article = {
			_id: articleId,
			slug: 'test',
			status: ArticleStatus.PUBLISHED,
			yachtIds: [id(3)],
			destinationIds: [id(4)],
		};
		f.model.findOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(article) }) });
		expect(await f.service.getBySlug('TEST')).toEqual(article);
		expect(f.members.exists).not.toHaveBeenCalled();
		expect(f.yachts.countDocuments).not.toHaveBeenCalled();
		expect(f.destinations.countDocuments).not.toHaveBeenCalled();
	});
	it('rejects unsafe detail slugs before persistence access', async () => {
		await expect(f.service.getBySlug('unsafe/path')).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findOne).not.toHaveBeenCalled();
	});
	it.each(Object.values(ArticleType))('filters %s without separate News/Insight/Guide query storage', async (type) => {
		await f.service.catalog({ filter: { type } });
		expect(matchAt(f.model)).toEqual({ ...publicVisibility(), type });
	});
	it('filters featured false and BSON author/yacht/destination membership at MongoDB level', async () => {
		await f.service.catalog({
			filter: { featured: false, authorMemberId: memberId, yachtId: id(3), destinationId: id(4) },
		});
		expect(matchAt(f.model)).toEqual({
			...publicVisibility(),
			featured: false,
			authorMemberId: new Types.ObjectId(memberId),
			yachtIds: new Types.ObjectId(id(3)),
			destinationIds: new Types.ObjectId(id(4)),
		});
	});
	it('escapes literal search across title/excerpt/author without overwriting timing OR', async () => {
		await f.service.catalog({ filter: { search: ' .*+ ' } });
		const match = matchAt(f.model);
		expect(match.$or).toEqual(publicVisibility().$or);
		const conditions = match.$and as { $or: Fields[] }[];
		expect(conditions).toHaveLength(1);
		expect(conditions[0].$or).toHaveLength(3);
		for (const [index, field] of ['title', 'excerpt', 'authorName'].entries()) {
			const expression = conditions[0].$or[index][field] as RegExp;
			expect(expression.test('Literal .*+ in editorial')).toBe(true);
			expect(expression.test('anything')).toBe(false);
		}
	});
	it('shares count, sort and pagination between public and admin discovery', async () => {
		const input = {
			filter: { type: ArticleType.GUIDE, search: 'Barts' },
			page: 2,
			limit: 10,
			sortBy: ArticleSortBy.TITLE_ASC,
		};
		await f.service.catalog(input);
		await f.service.getForAdmin(input);
		expect(f.model.aggregate.mock.calls[0][0].slice(1)).toEqual(f.model.aggregate.mock.calls[1][0].slice(1));
		expect(matchAt(f.model, 1)).not.toHaveProperty('status');
		expect(matchAt(f.model, 1)).not.toHaveProperty('publishAt');
	});
	it.each([
		[ArticleSortBy.NEWEST, { createdAt: -1, _id: -1 }],
		[ArticleSortBy.OLDEST, { createdAt: 1, _id: 1 }],
		[ArticleSortBy.TITLE_ASC, { title: 1, _id: 1 }],
		[ArticleSortBy.TITLE_DESC, { title: -1, _id: 1 }],
		[ArticleSortBy.PUBLISHED_NEWEST, { publishedAt: -1, _id: -1 }],
		[ArticleSortBy.FEATURED, { featured: -1, publishedAt: -1, _id: -1 }],
	])('uses deterministic MongoDB sorting %s', async (sortBy, sort) => {
		await f.service.catalog({ sortBy } as never);
		expect(f.model.aggregate.mock.calls[0][0][1].$sort).toEqual(sort);
	});
	it('defaults sorting to PUBLISHED_NEWEST', async () => {
		await f.service.catalog({});
		expect(f.model.aggregate.mock.calls[0][0][1].$sort).toEqual({ publishedAt: -1, _id: -1 });
	});
	it.each([{}, { page: 3, limit: 10 }, { page: 2, limit: 50 }, { page: 100, limit: 3 }])(
		'returns canonical wrapper and MongoDB pagination for %j',
		async (input) => {
			const page = input.page ?? 1;
			const limit = input.limit ?? 20;
			expect(await f.service.catalog(input)).toEqual({
				list: [{ _id: articleId }],
				total: 41,
				page,
				limit,
				totalPages: Math.ceil(41 / limit),
			});
			expect(f.model.aggregate.mock.calls[0][0][2].$facet).toEqual({
				list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
				meta: [{ $count: 'total' }],
			});
		},
	);
	it('handles empty aggregate metadata and preserves counts for empty later pages', async () => {
		f.model.aggregate.mockResolvedValueOnce([]);
		expect(await f.service.catalog({})).toEqual({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });
		f.model.aggregate.mockResolvedValueOnce([{ list: [], meta: [{ total: 41 }] }]);
		expect(await f.service.catalog({ page: 4 })).toEqual({ list: [], total: 41, page: 4, limit: 20, totalPages: 3 });
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ page: '1' },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: 1.5 },
		{ limit: Infinity },
		{ sortBy: 'INVALID' },
		{ filter: { type: 'BLOG' } },
		{ filter: { status: 'DELETED' } },
		{ filter: { featured: 'true' } },
		{ filter: { authorMemberId: 'invalid' } },
		{ filter: { yachtId: 'invalid' } },
		{ filter: { destinationId: 'invalid' } },
		{ filter: { search: 3 } },
		{ filter: { password: 'private' } },
	])('rejects invalid public/admin catalog input %j before querying', async (input) => {
		await expect(f.service.catalog(input as never)).rejects.toBeInstanceOf(BadRequestException);
		await expect(f.service.getForAdmin(input as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.aggregate).not.toHaveBeenCalled();
	});
});
