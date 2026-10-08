import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { ArticleResolver } from '../src/components/article/article.resolver';
import { ArticleService } from '../src/components/article/article.service';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';

type Fixture = Record<string, unknown> & { _id: string | Types.ObjectId; title: string; slug: string };
type ArticleOutput = {
	_id: string;
	title: string;
	slug: string;
	type: string;
	status: string;
	content: string | null;
	featured: boolean;
	images: string[];
	authorMemberId: string | null;
	yachtIds: string[];
	destinationIds: string[];
	publishedAt: string | null;
	publishAt: string | null;
};
type Collection = { list: ArticleOutput[]; total: number; page: number; limit: number; totalPages: number };
type QueryData = {
	getArticles: Collection;
	getFeaturedArticles: Collection;
	getArticlesForAdmin: Collection;
	getArticle: ArticleOutput;
	createArticle: ArticleOutput;
	updateArticle: ArticleOutput;
	a: Collection;
	b: Collection;
};
type GqlBody<T = QueryData> = { data: T; errors?: { message: string; extensions: { code: string } }[] };
type Match = Record<string, unknown>;
type Update = { $set: Record<string, unknown> };
type PipelineStage = {
	$match?: Match;
	$sort?: Record<string, number>;
	$facet?: { list: ({ $skip: number } | { $limit: number })[] };
};

// Real GraphQL resolver, service and shared guards; persistence and authentication are mocked.
// This fixture evaluates the emitted query operators, not a live MongoDB server or deployed indexes.
describe('Article GraphQL (e2e)', () => {
	let app: INestApplication;
	let records: Fixture[];
	let nextId: number;
	let clock: jest.SpyInstance;
	const now = new Date('2026-10-06T12:00:00.000Z');
	const id = (n: number): string => n.toString(16).padStart(24, '0');
	const memberId = id(70);
	const yachtId = id(80);
	const otherYachtId = id(81);
	const destinationId = id(90);
	const otherDestinationId = id(91);
	const eq = (a: unknown, b: unknown): boolean => {
		if (b === null) return a === null || a === undefined;
		if (a instanceof Types.ObjectId)
			return typeof b === 'string' ? a.toHexString() === b : a.equals(b as Types.ObjectId);
		if (b instanceof Types.ObjectId) return typeof a === 'string' && b.toHexString() === a;
		return a === b;
	};
	const matches = (record: Fixture, match: Match): boolean =>
		Object.entries(match).every(([key, value]) => {
			if (key === '$or') return (value as Match[]).some((part) => matches(record, part));
			if (key === '$and') return (value as Match[]).every((part) => matches(record, part));
			const actual = record[key];
			if (value instanceof RegExp) return value.test(typeof actual === 'string' ? actual : '');
			if (
				typeof value === 'object' &&
				value !== null &&
				!(value instanceof Types.ObjectId) &&
				!(value instanceof Date)
			) {
				return Object.entries(value).every(([operator, expected]) => {
					if (operator === '$exists') return (actual !== undefined) === expected;
					if (operator === '$ne') return !eq(actual, expected);
					if (operator === '$lte') {
						return actual instanceof Date && expected instanceof Date && actual.getTime() <= expected.getTime();
					}
					throw new Error(`Unsupported fixture match operator: ${operator}`);
				});
			}
			if (Array.isArray(actual)) return actual.some((entry: unknown) => eq(entry, value));
			return eq(actual, value);
		});
	const lean = (fetch: () => Fixture | null) => ({ lean: () => ({ exec: () => Promise.resolve(fetch()) }) });
	const write = (fetch: () => Fixture | undefined, update: Update) => ({
		exec: () => {
			const record = fetch();
			if (!record) return Promise.resolve(null);
			Object.assign(record, update.$set);
			return Promise.resolve(record);
		},
	});
	const articleModel = {
		exists: jest.fn((match: Match) => Promise.resolve(records.find((row) => matches(row, match)) ?? null)),
		findOne: jest.fn((match: Match) => lean(() => records.find((row) => matches(row, match)) ?? null)),
		findById: jest.fn((value: unknown) => lean(() => records.find((row) => eq(row._id, value)) ?? null)),
		create: jest.fn((fields: Record<string, unknown>) => {
			const record = {
				_id: id(nextId++),
				title: '',
				slug: '',
				images: [],
				yachtIds: [],
				destinationIds: [],
				createdAt: now,
				updatedAt: now,
				...fields,
			};
			records.push(record);
			return Promise.resolve(record);
		}),
		findByIdAndUpdate: jest.fn((value: unknown, update: Update) =>
			write(() => records.find((row) => eq(row._id, value)), update),
		),
		findOneAndUpdate: jest.fn((match: Match, update: Update) =>
			write(() => records.find((row) => matches(row, match)), update),
		),
		aggregate: jest.fn((pipeline: PipelineStage[]) => {
			const eligible = records.filter((row) => matches(row, pipeline[0].$match ?? {}));
			eligible.sort((a, b) => {
				for (const [key, direction] of Object.entries(pipeline[1].$sort ?? {})) {
					const left = a[key] instanceof Date ? a[key].getTime() : a[key];
					const right = b[key] instanceof Date ? b[key].getTime() : b[key];
					if (left === right) continue;
					if (left === null || left === undefined) return -direction;
					if (right === null || right === undefined) return direction;
					if (left < right) return -direction;
					if (left > right) return direction;
				}
				return 0;
			});
			const stages = pipeline[2].$facet?.list ?? [];
			const skip = (stages[0] as { $skip: number }).$skip;
			const limit = (stages[1] as { $limit: number }).$limit;
			return Promise.resolve([
				{ list: eligible.slice(skip, skip + limit), meta: eligible.length ? [{ total: eligible.length }] : [] },
			]);
		}),
	};
	const memberModel = {
		exists: jest.fn((match: Match) => Promise.resolve(eq(match._id, memberId) ? { _id: memberId } : null)),
	};
	const yachtModel = {
		countDocuments: jest.fn((match: { _id: { $in: string[] } }) =>
			Promise.resolve(
				[yachtId, otherYachtId].filter((value) => match._id.$in.some((linked) => eq(linked, value))).length,
			),
		),
	};
	const destinationModel = {
		countDocuments: jest.fn((match: { _id: { $in: string[] } }) =>
			Promise.resolve(
				[destinationId, otherDestinationId].filter((value) => match._id.$in.some((linked) => eq(linked, value))).length,
			),
		),
	};
	const post = async <T = QueryData>(query: string, identity?: string): Promise<GqlBody<T>> => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (identity) req.set('Authorization', `Bearer ${identity}`);
		const response = await req.send({ query });
		const body: unknown = response.body;
		return body as GqlBody<T>;
	};
	beforeAll(async () => {
		const fixture = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				ArticleResolver,
				ArticleService,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('Article'), useValue: articleModel },
				{ provide: getModelToken('Member'), useValue: memberModel },
				{ provide: getModelToken('Yacht'), useValue: yachtModel },
				{ provide: getModelToken('Destination'), useValue: destinationModel },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: (req: {
							headers: Record<string, string | undefined>;
							authMember?: { role: string; status: string };
						}) => {
							if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
							const identity = req.headers.authorization.replace('Bearer ', '');
							if (identity === 'BLOCKED_ADMIN') throw authError(AuthErrorCode.ACCOUNT_BLOCKED);
							if (identity === 'DELETED_ADMIN') throw authError(AuthErrorCode.ACCOUNT_DELETED);
							req.authMember = { role: identity, status: 'ACTIVE' };
							return Promise.resolve(req.authMember);
						},
					},
				},
			],
		}).compile();
		app = fixture.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(new ValidationPipe({ validationError: { target: false, value: false } }));
		await app.init();
	});
	afterAll(async () => {
		await app.close();
	});
	beforeEach(() => {
		jest.clearAllMocks();
		nextId = 100;
		clock = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
		const base = {
			type: 'NEWS',
			status: 'PUBLISHED',
			featured: true,
			content: 'Editorial content',
			images: [],
			yachtIds: [],
			destinationIds: [],
			publishedAt: new Date('2026-10-01T12:00:00.000Z'),
			createdAt: new Date('2026-10-01T12:00:00.000Z'),
			updatedAt: new Date('2026-10-01T12:00:00.000Z'),
		};
		records = [
			{ ...base, _id: id(1), title: 'No schedule', slug: 'no-schedule' },
			{ ...base, _id: id(2), title: 'Past', slug: 'past', publishAt: new Date(now.getTime() - 1) },
			{ ...base, _id: id(3), title: 'Now', slug: 'now', publishAt: now },
			{ ...base, _id: id(4), title: 'Future', slug: 'future', publishAt: new Date(now.getTime() + 1) },
			{ ...base, _id: id(5), title: 'Draft', slug: 'draft', status: 'DRAFT' },
			{ ...base, _id: id(6), title: 'Archived', slug: 'archived', status: 'ARCHIVED' },
			{ ...base, _id: id(7), title: 'Null schedule', slug: 'null-schedule', publishAt: null },
			{ ...base, _id: id(8), title: 'Not featured', slug: 'not-featured', featured: false },
		];
	});
	afterEach(() => clock.mockRestore());

	it('exposes the exact Article fields and enums with an Int-total wrapper and no nested auth entities', async () => {
		type Introspection = {
			a: { fields: { name: string }[] };
			w: { fields: { name: string; type: { ofType: { name: string } | null } }[] };
			t: { enumValues: { name: string }[] };
			s: { enumValues: { name: string }[] };
		};
		const response = await post<Introspection>(
			'{ a:__type(name:"Article") { fields { name } } w:__type(name:"Articles") { fields { name type { ofType { name } } } } t:__type(name:"ArticleType") { enumValues { name } } s:__type(name:"ArticleStatus") { enumValues { name } } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.a.fields.map((field) => field.name).sort()).toEqual(
			[
				'_id',
				'title',
				'slug',
				'type',
				'status',
				'excerpt',
				'content',
				'coverImage',
				'images',
				'authorName',
				'authorMemberId',
				'featured',
				'publishAt',
				'publishedAt',
				'yachtIds',
				'destinationIds',
				'createdAt',
				'updatedAt',
			].sort(),
		);
		expect(response.data.w.fields.find((field) => field.name === 'total')?.type.ofType?.name).toBe('Int');
		expect(response.data.t.enumValues.map((entry) => entry.name)).toEqual(['NEWS', 'INSIGHT', 'GUIDE']);
		expect(response.data.s.enumValues.map((entry) => entry.name)).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
	});
	it.each([
		['no-schedule', true],
		['null-schedule', true],
		['past', true],
		['now', true],
		['future', false],
		['draft', false],
		['archived', false],
	])('enforces visibility for %s independently in all three public operations', async (slug, visible) => {
		const collection = await post('{ getArticles(input:{}) { list { slug } } getFeaturedArticles { list { slug } } }');
		expect(collection.errors).toBeUndefined();
		for (const result of [collection.data.getArticles, collection.data.getFeaturedArticles]) {
			expect(result.list.some((row) => row.slug === slug)).toBe(visible);
		}
		const detail = await post(`{ getArticle(slug:"${slug}") { slug } }`);
		if (visible) {
			expect(detail.errors).toBeUndefined();
			expect(detail.data.getArticle.slug).toBe(slug);
		} else {
			expect(detail.errors).toEqual([
				{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
			]);
		}
	});
	it.each(['DRAFT', 'ARCHIVED'])('prevents public %s status and featured bypasses', async (status) => {
		const response = await post(
			`{ getArticles(input:{filter:{status:${status}}}) { total list { status } } getFeaturedArticles(input:{filter:{status:${status},featured:false}}) { total list { status featured } } }`,
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.getArticles.total).toBe(5);
		expect(response.data.getArticles.list.every((row) => row.status === 'PUBLISHED')).toBe(true);
		expect(response.data.getFeaturedArticles.total).toBe(4);
		expect(response.data.getFeaturedArticles.list.every((row) => row.status === 'PUBLISHED' && row.featured)).toBe(
			true,
		);
	});
	it('makes a scheduled published article visible exactly when its requested time arrives', async () => {
		expect((await post('{ getArticles(input:{filter:{search:"Future"}}) { total } }')).data.getArticles.total).toBe(0);
		clock.mockReturnValue(now.getTime() + 1);
		const response = await post(
			'{ getArticles(input:{filter:{search:"Future"}}) { total } getArticle(slug:"future") { slug } getFeaturedArticles(input:{filter:{search:"Future"}}) { total } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.getArticles.total).toBe(1);
		expect(response.data.getArticle.slug).toBe('future');
		expect(response.data.getFeaturedArticles.total).toBe(1);
		expect(articleModel.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(articleModel.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it('returns default metadata and empty results with totalPages zero', async () => {
		const response = await post(
			'{ a:getArticles(input:{}) { total page limit totalPages } b:getArticles(input:{filter:{search:"no match"}}) { list { slug } total page limit totalPages } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.a).toEqual({ total: 5, page: 1, limit: 20, totalPages: 1 });
		expect(response.data.b).toEqual({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });
	});
	it('paginates results while retaining total and accepts the maximum limit', async () => {
		const response = await post(
			'{ a:getArticles(input:{page:2,limit:2}) { list { slug } total page limit totalPages } b:getArticles(input:{limit:50}) { limit } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.a).toEqual({
			list: [{ slug: 'now' }, { slug: 'past' }],
			total: 5,
			page: 2,
			limit: 2,
			totalPages: 3,
		});
		expect(response.data.b.limit).toBe(50);
	});
	it.each(['page:0', 'page:-1', 'limit:0', 'limit:51', 'limit:1.5'])(
		'rejects invalid pagination %s before persistence',
		async (input) => {
			const response = await post(`{ getArticles(input:{${input}}) { total } }`);
			expect(response.errors).toBeDefined();
			expect(articleModel.aggregate).not.toHaveBeenCalled();
		},
	);
	it.each([
		['type:INSIGHT', 1],
		['featured:false', 1],
		[`authorMemberId:"${memberId}"`, 1],
		[`yachtId:"${yachtId}"`, 1],
		[`destinationId:"${destinationId}"`, 1],
		['search:"literal.*"', 1],
		['search:".*"', 1],
		['search:"Preview"', 1],
		['search:"Writer"', 1],
	])('filters %s using the established query path', async (filter, total) => {
		Object.assign(records[0], {
			title: 'Literal.* editorial',
			type: 'INSIGHT',
			excerpt: 'Preview text',
			authorName: 'Writer',
			authorMemberId: new Types.ObjectId(memberId),
			yachtIds: [new Types.ObjectId(yachtId)],
			destinationIds: [new Types.ObjectId(destinationId)],
		});
		const response = await post(`{ getArticles(input:{filter:{${filter}}}) { total } }`);
		expect(response.errors).toBeUndefined();
		expect(response.data.getArticles.total).toBe(total);
	});
	it('does not treat search regex syntax as a wildcard or let search bypass scheduled visibility', async () => {
		const response = await post(
			'{ a:getArticles(input:{filter:{search:".*"}}) { total } b:getArticles(input:{filter:{search:"Future"}}) { total } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.a.total).toBe(0);
		expect(response.data.b.total).toBe(0);
	});
	it.each([
		['NEWEST', ['charlie', 'beta', 'alpha']],
		['OLDEST', ['alpha', 'beta', 'charlie']],
		['TITLE_ASC', ['alpha', 'beta', 'charlie']],
		['TITLE_DESC', ['charlie', 'beta', 'alpha']],
		['PUBLISHED_NEWEST', ['charlie', 'beta', 'alpha']],
		['FEATURED', ['beta', 'alpha', 'charlie']],
	])('sorts %s with a stable secondary order', async (sortBy, expected) => {
		const base = {
			status: 'PUBLISHED',
			type: 'NEWS',
			content: 'Content',
			images: [],
			yachtIds: [],
			destinationIds: [],
		};
		records = [
			{ ...base, _id: id(1), title: 'Alpha', slug: 'alpha', featured: true, createdAt: now, publishedAt: now },
			{ ...base, _id: id(2), title: 'Beta', slug: 'beta', featured: true, createdAt: now, publishedAt: now },
			{ ...base, _id: id(3), title: 'Charlie', slug: 'charlie', featured: false, createdAt: now, publishedAt: now },
		];
		const response = await post(`{ getArticles(input:{sortBy:${sortBy}}) { list { slug } } }`);
		expect(response.errors).toBeUndefined();
		expect(response.data.getArticles.list.map((row) => row.slug)).toEqual(expected);
		const reversed = [...records].reverse();
		records = reversed;
		expect(
			(await post(`{ getArticles(input:{sortBy:${sortBy}}) { list { slug } } }`)).data.getArticles.list.map(
				(row) => row.slug,
			),
		).toEqual(expected);
	});
	const create =
		'mutation { createArticle(input:{title:" New Article ",type:NEWS}) { _id slug status featured publishedAt yachtIds destinationIds } }';
	const update = `mutation { updateArticle(input:{_id:"${id(1)}",title:"Renamed"}) { title slug } }`;
	const adminQuery = '{ getArticlesForAdmin(input:{}) { total list { slug } } }';
	it.each([
		[undefined, AuthErrorCode.UNAUTHENTICATED],
		['USER', AuthErrorCode.FORBIDDEN],
		['OWNER', AuthErrorCode.FORBIDDEN],
		['CREW', AuthErrorCode.FORBIDDEN],
		['BLOCKED_ADMIN', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED_ADMIN', AuthErrorCode.ACCOUNT_DELETED],
	])('rejects management for %s using the shared guards', async (identity, code) => {
		for (const query of [adminQuery, create, update]) {
			const response = await post(query, identity);
			expect(response.errors?.[0].extensions.code).toBe(code);
		}
		expect(articleModel.create).not.toHaveBeenCalled();
		expect(articleModel.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(articleModel.findOneAndUpdate).not.toHaveBeenCalled();
		expect(articleModel.aggregate).not.toHaveBeenCalled();
	});
	it('allows active ADMIN to manage future, draft and archived records', async () => {
		const response = await post(adminQuery, 'ADMIN');
		expect(response.errors).toBeUndefined();
		expect(response.data.getArticlesForAdmin.total).toBe(8);
		expect(response.data.getArticlesForAdmin.list.map((row) => row.slug)).toEqual(
			expect.arrayContaining(['future', 'draft', 'archived']),
		);
		const filtered = await post(
			'{ getArticlesForAdmin(input:{filter:{status:DRAFT}}) { total list { status } } }',
			'ADMIN',
		);
		expect(filtered.errors).toBeUndefined();
		expect(filtered.data.getArticlesForAdmin.total).toBe(1);
		expect(filtered.data.getArticlesForAdmin.list[0].status).toBe('DRAFT');
	});
	it('allows ADMIN create and partial title update while preserving the public slug', async () => {
		const created = await post(create, 'ADMIN');
		expect(created.errors).toBeUndefined();
		expect(created.data.createArticle).toEqual({
			_id: id(100),
			slug: 'new-article',
			status: 'DRAFT',
			featured: false,
			publishedAt: null,
			yachtIds: [],
			destinationIds: [],
		});
		const updated = await post(update, 'ADMIN');
		expect(updated.errors).toBeUndefined();
		expect(updated.data.updateArticle).toEqual({ title: 'Renamed', slug: 'no-schedule' });
	});
	it.each(['NEWS', 'INSIGHT', 'GUIDE'])(
		'creates %s with normalized explicit slug and editorial metadata',
		async (type) => {
			const response = await post(
				`mutation { createArticle(input:{title:"Article",type:${type},slug:" Editorial-Slug ",excerpt:" Preview ",content:" Article body ",coverImage:"/images/article.jpg",images:["/images/a.jpg"],authorName:" Writer "}) { slug type content images } }`,
				'ADMIN',
			);
			expect(response.errors).toBeUndefined();
			expect(response.data.createArticle).toEqual({
				slug: 'editorial-slug',
				type,
				content: 'Article body',
				images: ['/images/a.jpg'],
			});
		},
	);
	it.each([
		'title:" "',
		'slug:"../unsafe"',
		'slug:"no-schedule"',
		'type:INVALID',
		'status:INVALID',
		'publishAt:"not-a-date"',
		'authorMemberId:"bad"',
		`authorMemberId:"${id(99)}"`,
		'yachtIds:["bad"]',
		`yachtIds:["${id(99)}"]`,
		`yachtIds:["${yachtId}","${yachtId}"]`,
		`yachtIds:["${id(0xabcdef)}","${id(0xabcdef).toUpperCase()}"]`,
		'destinationIds:["bad"]',
		`destinationIds:["${id(99)}"]`,
		`destinationIds:["${destinationId}","${destinationId}"]`,
		'content:null',
		'featured:null',
		'yachtIds:null',
	])('rejects invalid article create %s before writes', async (field) => {
		const response = await post(
			`mutation { createArticle(input:{${field.startsWith('title:') ? '' : 'title:"Article",'}${field.startsWith('type:') ? '' : 'type:NEWS,'}${field}}) { slug } }`,
			'ADMIN',
		);
		expect(response.errors).toBeDefined();
		expect(articleModel.create).not.toHaveBeenCalled();
	});
	it('requires nonblank merged content before first publication', async () => {
		const created = await post(
			'mutation { createArticle(input:{title:"Contentless draft",type:NEWS}) { _id } }',
			'ADMIN',
		);
		expect(created.errors).toBeUndefined();
		const value = created.data.createArticle._id;
		const rejected = await post(
			`mutation { updateArticle(input:{_id:"${value}",status:PUBLISHED}) { status } }`,
			'ADMIN',
		);
		expect(rejected.errors).toBeDefined();
		expect(articleModel.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(articleModel.findOneAndUpdate).not.toHaveBeenCalled();
		const rejectedCreate = await post(
			'mutation { createArticle(input:{title:"Published",type:NEWS,status:PUBLISHED,content:" "}) { status } }',
			'ADMIN',
		);
		expect(rejectedCreate.errors).toBeDefined();
	});
	it('stamps first publication once and preserves it through edits, draft and republication', async () => {
		const created = await post(create, 'ADMIN');
		const value = created.data.createArticle._id;
		const publish = await post(
			`mutation { updateArticle(input:{_id:"${value}",status:PUBLISHED,content:"Content"}) { status publishedAt } }`,
			'ADMIN',
		);
		expect(publish.errors).toBeUndefined();
		expect(publish.data.updateArticle.publishedAt).toBe(now.toISOString());
		clock.mockReturnValue(now.getTime() + 60_000);
		for (const fields of [
			'title:"Edited"',
			'status:DRAFT',
			'status:PUBLISHED',
			'status:ARCHIVED',
			'status:PUBLISHED',
		]) {
			const response = await post(
				`mutation { updateArticle(input:{_id:"${value}",${fields}}) { publishedAt content } }`,
				'ADMIN',
			);
			expect(response.errors).toBeUndefined();
			expect(response.data.updateArticle.publishedAt).toBe(now.toISOString());
			expect(response.data.updateArticle.content).toBe('Content');
		}
	});
	it('creates scheduled PUBLISHED content with publication metadata while keeping it hidden', async () => {
		const future = new Date(now.getTime() + 60_000).toISOString();
		const response = await post(
			`mutation { createArticle(input:{title:"Scheduled",type:GUIDE,status:PUBLISHED,content:"Content",publishAt:"${future}",featured:true}) { slug publishAt publishedAt } }`,
			'ADMIN',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.createArticle.publishedAt).toBe(now.toISOString());
		expect(response.data.createArticle.publishAt).toBe(future);
		expect((await post('{ getArticle(slug:"scheduled") { slug } }')).errors).toBeDefined();
	});
	it('stores any existing author, Yacht and Destination links as IDs without fetching credentials or linked content', async () => {
		const response = await post(
			`mutation { createArticle(input:{title:"Linked",type:INSIGHT,status:PUBLISHED,content:"Content",authorMemberId:"${memberId}",yachtIds:["${yachtId}","${otherYachtId}"],destinationIds:["${destinationId}","${otherDestinationId}"]}) { slug authorMemberId yachtIds destinationIds } }`,
			'ADMIN',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.createArticle).toEqual({
			slug: 'linked',
			authorMemberId: memberId,
			yachtIds: [yachtId, otherYachtId],
			destinationIds: [destinationId, otherDestinationId],
		});
		expect(memberModel.exists).toHaveBeenCalledWith({ _id: memberId });
		expect(yachtModel.countDocuments).toHaveBeenCalledWith({ _id: { $in: [yachtId, otherYachtId] } });
		expect(destinationModel.countDocuments).toHaveBeenCalledWith({ _id: { $in: [destinationId, otherDestinationId] } });
		const detail = await post('{ getArticle(slug:"linked") { authorMemberId yachtIds destinationIds } }');
		expect(detail.errors).toBeUndefined();
		expect(detail.data.getArticle.yachtIds).toEqual([yachtId, otherYachtId]);
		expect(detail.data.getArticle.destinationIds).toEqual([destinationId, otherDestinationId]);
	});
	it('preserves omitted links and false while explicit arrays can be cleared', async () => {
		Object.assign(records[0], { yachtIds: [yachtId], destinationIds: [destinationId], authorMemberId: memberId });
		const first = await post(
			`mutation { updateArticle(input:{_id:"${id(1)}",featured:false}) { featured yachtIds destinationIds authorMemberId } }`,
			'ADMIN',
		);
		expect(first.errors).toBeUndefined();
		expect(first.data.updateArticle).toEqual({
			featured: false,
			yachtIds: [yachtId],
			destinationIds: [destinationId],
			authorMemberId: memberId,
		});
		const renamed = await post(
			`mutation { updateArticle(input:{_id:"${id(1)}",title:"Another title"}) { featured yachtIds destinationIds } }`,
			'ADMIN',
		);
		expect(renamed.errors).toBeUndefined();
		expect(renamed.data.updateArticle.featured).toBe(false);
		const cleared = await post(
			`mutation { updateArticle(input:{_id:"${id(1)}",yachtIds:[],destinationIds:[]}) { yachtIds destinationIds } }`,
			'ADMIN',
		);
		expect(cleared.errors).toBeUndefined();
		expect(cleared.data.updateArticle).toEqual({ yachtIds: [], destinationIds: [] });
	});
	it('archives with no cascade and preserves content, links and historical publication metadata', async () => {
		Object.assign(records[0], { yachtIds: [yachtId], destinationIds: [destinationId] });
		const before = records[0].publishedAt;
		const response = await post(
			`mutation { updateArticle(input:{_id:"${id(1)}",status:ARCHIVED}) { status content yachtIds destinationIds publishedAt } }`,
			'ADMIN',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data.updateArticle.status).toBe('ARCHIVED');
		expect(response.data.updateArticle.content).toBe('Editorial content');
		expect(response.data.updateArticle.yachtIds).toEqual([yachtId]);
		expect(records[0].publishedAt).toBe(before);
		expect((await post('{ getArticle(slug:"no-schedule") { slug } }')).errors).toBeDefined();
		expect(yachtModel.countDocuments).not.toHaveBeenCalled();
		expect(destinationModel.countDocuments).not.toHaveBeenCalled();
	});
	it('does not accept publishedAt as a writable GraphQL field', async () => {
		const response = await post(
			'mutation { createArticle(input:{title:"Article",type:NEWS,publishedAt:"2026-01-01"}) { slug } }',
			'ADMIN',
		);
		expect(response.errors?.[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
		expect(articleModel.create).not.toHaveBeenCalled();
	});
	it('sanitizes internal persistence failures without revealing secrets, paths or stack traces', async () => {
		articleModel.aggregate.mockRejectedValueOnce(new Error('mongodb://secret@host private stack C:\\private\\path'));
		const response = await post('{ getArticles(input:{}) { total } }');
		expect(response.errors).toEqual([
			{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
		]);
	});
});
