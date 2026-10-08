import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { DestinationResolver } from '../src/components/destination/destination.resolver';
import { DestinationService } from '../src/components/destination/destination.service';
import { YachtResolver } from '../src/components/yacht/yacht.resolver';
import { YachtService } from '../src/components/yacht/yacht.service';
import { BrokerService } from '../src/components/broker/broker.service';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';

// Real HTTP GraphQL, services and guards; mocked persistence, no live MongoDB or external calls.
describe('Destination and Yacht discovery GraphQL (e2e)', () => {
	let app: INestApplication;
	let records: any[];
	let yachts: any[];
	const id = (n: number) => n.toString(16).padStart(24, '0');
	const scalarEqual = (a: any, b: any) => (a == null || b == null ? a == null && b == null : String(a) === String(b));
	function matches(record: any, match: any): boolean {
		return Object.entries(match).every(([field, value]: [string, any]) => {
			if (field === '$or') return value.some((condition) => matches(record, condition));
			if (value instanceof RegExp) return typeof record[field] === 'string' && value.test(record[field]);
			if (value && typeof value === 'object' && !(value instanceof Types.ObjectId)) {
				if ('$ne' in value) return !scalarEqual(record[field], value.$ne);
				if ('$in' in value) return value.$in.some((item) => scalarEqual(record[field], item));
			}
			return Array.isArray(record[field])
				? record[field].some((item) => scalarEqual(item, value))
				: scalarEqual(record[field], value);
		});
	}
	function aggregate(collection: any[], pipeline: any[]) {
		const eligible = collection.filter((record) => matches(record, pipeline[0].$match));
		const sort = pipeline.find((stage) => stage.$sort).$sort;
		eligible.sort((a, b) => {
			for (const [field, direction] of Object.entries(sort)) {
				if (a[field] < b[field]) return -Number(direction);
				if (a[field] > b[field]) return Number(direction);
			}
			return 0;
		});
		const stages = pipeline.find((stage) => stage.$facet).$facet.list;
		return [
			{ list: eligible.slice(stages[0].$skip, stages[0].$skip + stages[1].$limit), meta: [{ total: eligible.length }] },
		];
	}
	const lean = (fetch: () => any) => ({ lean: () => ({ exec: async () => fetch() }) });
	const destinationModel = {
		aggregate: jest.fn(async (pipeline) => aggregate(records, pipeline)),
		findOne: jest.fn((match) => lean(() => records.find((record) => matches(record, match)) ?? null)),
		findById: jest.fn((value) => ({
			select: () => lean(() => records.find((record) => scalarEqual(record._id, value)) ?? null),
		})),
		exists: jest.fn(async (match) => records.find((record) => matches(record, match)) ?? null),
		countDocuments: jest.fn(async (match) => records.filter((record) => matches(record, match)).length),
		create: jest.fn(async (fields) => {
			const record = {
				_id: id(100 + records.length),
				images: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				...fields,
			};
			records.push(record);
			return record;
		}),
		findByIdAndUpdate: jest.fn((value, update) => ({
			exec: async () => {
				const record = records.find((record) => scalarEqual(record._id, value));
				if (!record) return null;
				Object.assign(record, update.$set);
				return record;
			},
		})),
	};
	const yachtModel = {
		aggregate: jest.fn(async (pipeline) => aggregate(yachts, pipeline)),
		create: jest.fn(async (fields) => {
			const record = { ...fields, _id: id(200), images: [] };
			yachts.push(record);
			return record;
		}),
		findById: jest.fn((value) => lean(() => yachts.find((record) => scalarEqual(record._id, value)) ?? null)),
		findByIdAndUpdate: jest.fn((value, update) => ({
			exec: async () => {
				const record = yachts.find((record) => scalarEqual(record._id, value));
				if (!record) return null;
				Object.assign(record, update.$set);
				return record;
			},
		})),
	};
	const post = (query: string, role?: string) => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (role) req.set('Authorization', `Bearer ${role}`);
		return req.send({ query });
	};
	beforeAll(async () => {
		const fixture = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				DestinationResolver,
				DestinationService,
				YachtResolver,
				YachtService,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('Destination'), useValue: destinationModel },
				{ provide: getModelToken('Yacht'), useValue: yachtModel },
				{ provide: BrokerService, useValue: { getById: async () => ({ _id: id(90), isActive: true }) } },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: async (req) => {
							if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
							const role = req.headers.authorization.replace('Bearer ', '');
							if (role === 'INACTIVE_ADMIN') throw authError(AuthErrorCode.FORBIDDEN);
							req.authMember = { role, status: 'ACTIVE' };
							return req.authMember;
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
		const base = {
			type: 'AREA',
			status: 'PUBLISHED',
			parentId: null,
			country: 'France',
			region: 'Europe',
			featured: false,
			sortOrder: 0,
			images: [],
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
		};
		records = [
			{
				...base,
				_id: id(1),
				name: 'Mediterranean',
				slug: 'mediterranean',
				type: 'REGION',
				featured: true,
				sortOrder: 5,
			},
			{ ...base, _id: id(2), name: 'Riviera', slug: 'riviera', parentId: id(1), featured: true, sortOrder: 1 },
			{
				...base,
				_id: id(3),
				name: 'Bahamas',
				slug: 'bahamas',
				type: 'COUNTRY',
				country: 'Bahamas',
				region: 'Caribbean',
				sortOrder: 2,
			},
			{ ...base, _id: id(4), name: 'Hidden Draft', slug: 'hidden-draft', status: 'DRAFT', featured: true },
			{ ...base, _id: id(5), name: 'Hidden Archive', slug: 'hidden-archive', status: 'ARCHIVED', featured: true },
			{ ...base, _id: id(6), name: 'St.(A)', slug: 'st-a', country: 'St.(A)', region: 'A+B', sortOrder: 3 },
		];
		const yachtBase = {
			name: 'Yacht',
			country: 'France',
			location: 'Nice',
			status: 'PUBLISHED',
			featured: true,
			listingModes: ['SALE', 'CHARTER'],
			brokerId: id(90),
			images: [],
			charterPrice: 100,
			charterCurrency: 'EUR',
		};
		yachts = [
			{ ...yachtBase, _id: id(20), destinationIds: [new Types.ObjectId(id(2))] },
			{ ...yachtBase, _id: id(21), destinationIds: [new Types.ObjectId(id(1)), new Types.ObjectId(id(2))] },
			{ ...yachtBase, _id: id(22) },
			{ ...yachtBase, _id: id(23), destinationIds: [new Types.ObjectId(id(2))], status: 'DRAFT' },
		];
	});
	it('exposes all Destination fields, exact enums, Int wrapper, additive Yacht tags', async () => {
		const response = await post(
			'{ d: __type(name:"Destination") { fields { name } } w: __type(name:"Destinations") { fields { name type { name ofType { name } } } } t: __type(name:"DestinationType") { enumValues { name } } s: __type(name:"DestinationStatus") { enumValues { name } } y: __type(name:"Yacht") { fields { name } } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.d.fields.map((field) => field.name)).toEqual([
			'_id',
			'name',
			'slug',
			'type',
			'status',
			'parentId',
			'country',
			'region',
			'shortDescription',
			'description',
			'heroImage',
			'images',
			'featured',
			'sortOrder',
			'createdAt',
			'updatedAt',
		]);
		expect(response.body.data.w.fields.find((field) => field.name === 'total').type.ofType.name).toBe('Int');
		expect(response.body.data.t.enumValues.map((value) => value.name)).toEqual(['REGION', 'COUNTRY', 'AREA']);
		expect(response.body.data.s.enumValues.map((value) => value.name)).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
		expect(response.body.data.y.fields.map((field) => field.name)).toEqual(
			expect.arrayContaining(['location', 'country', 'destinationIds', 'charterRate']),
		);
	});
	it('returns only published destinations with default pagination and curated order', async () => {
		const response = await post('{ getDestinations(input:{}) { list { slug status } total page limit totalPages } }');
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getDestinations).toEqual({
			list: [
				{ slug: 'riviera', status: 'PUBLISHED' },
				{ slug: 'mediterranean', status: 'PUBLISHED' },
				{ slug: 'bahamas', status: 'PUBLISHED' },
				{ slug: 'st-a', status: 'PUBLISHED' },
			],
			total: 4,
			page: 1,
			limit: 20,
			totalPages: 1,
		});
	});
	it.each(['DRAFT', 'ARCHIVED'])('ignores public %s override', async (status) => {
		const response = await post(`{ getDestinations(input:{filter:{status:${status}}}) { list { status } total } }`);
		expect(response.body.data.getDestinations.total).toBe(4);
		expect(response.body.data.getDestinations.list.every((record) => record.status === 'PUBLISHED')).toBe(true);
	});
	it('returns page two, custom page size and empty beyond last page', async () => {
		const response = await post(
			'{ a:getDestinations(input:{page:2,limit:2}) { list { slug } total page limit totalPages } b:getDestinations(input:{page:9,limit:2}) { list { slug } total totalPages } }',
		);
		expect(response.body.data.a).toEqual({
			list: [{ slug: 'bahamas' }, { slug: 'st-a' }],
			total: 4,
			page: 2,
			limit: 2,
			totalPages: 2,
		});
		expect(response.body.data.b).toEqual({ list: [], total: 4, totalPages: 2 });
	});
	it.each([
		{ sortBy: 'FEATURED', slugs: ['riviera', 'mediterranean', 'bahamas', 'st-a'] },
		{ sortBy: 'SORT_ORDER', slugs: ['riviera', 'bahamas', 'st-a', 'mediterranean'] },
		{ sortBy: 'NAME_ASC', slugs: ['bahamas', 'mediterranean', 'riviera', 'st-a'] },
		{ sortBy: 'NAME_DESC', slugs: ['st-a', 'riviera', 'mediterranean', 'bahamas'] },
		{ sortBy: 'NEWEST', slugs: ['st-a', 'bahamas', 'riviera', 'mediterranean'] },
	])('accepts deterministic %s sorting', async ({ sortBy, slugs }) => {
		const response = await post(`{ getDestinations(input:{sortBy:${sortBy}}) { list { slug } total } }`);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getDestinations.total).toBe(4);
		expect(response.body.data.getDestinations.list.map((record) => record.slug)).toEqual(slugs);
	});
	it.each(['page:0', 'page:-1', 'limit:0', 'limit:51', 'page:1.5', 'limit:1.5', 'filter:{parentId:"bad"}'])(
		'rejects invalid catalog %s',
		async (input) => {
			const response = await post(`{ getDestinations(input:{${input}}) { total } }`);
			expect(response.body.errors).toBeDefined();
			expect(destinationModel.aggregate).not.toHaveBeenCalled();
		},
	);
	it('accepts maximum limit', async () => {
		const response = await post('{ getDestinations(input:{limit:50}) { limit } }');
		expect(response.body.data.getDestinations.limit).toBe(50);
	});
	it('finds published slug with canonical normalization', async () => {
		const response = await post('{ getDestination(slug:"RIVIERA") { slug parentId } }');
		expect(response.body.data.getDestination).toEqual({ slug: 'riviera', parentId: id(1) });
	});
	it.each(['hidden-draft', 'hidden-archive', 'missing'])('does not expose %s details', async (slug) => {
		const response = await post(`{ getDestination(slug:"${slug}") { name } }`);
		expect(response.body.errors).toBeDefined();
		expect(response.body.data).toBeNull();
	});
	it('returns published featured wrapper without input, overriding false', async () => {
		const response = await post(
			'{ a:getFeaturedDestinations { list { slug } total } b:getFeaturedDestinations(input:{filter:{featured:false,status:DRAFT}}) { total } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.a).toEqual({ list: [{ slug: 'riviera' }, { slug: 'mediterranean' }], total: 2 });
		expect(response.body.data.b.total).toBe(2);
	});
	it('filters children, roots, type, country and region independently', async () => {
		const response = await post(
			`{ children:getDestinations(input:{filter:{parentId:"${id(1)}"}}) { list { slug } } roots:getDestinations(input:{filter:{parentId:null}}) { total } country:getDestinations(input:{filter:{type:COUNTRY,country:"bahamas",region:"caribbean"}}) { total } }`,
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.children.list).toEqual([{ slug: 'riviera' }]);
		expect(response.body.data.roots.total).toBe(3);
		expect(response.body.data.country.total).toBe(1);
	});
	it('searches name/country/region literally with escaped regex', async () => {
		const response = await post(
			'{ literal:getDestinations(input:{filter:{search:".*"}}) { total totalPages } region:getDestinations(input:{filter:{search:"Caribbean"}}) { total } punctuation:getDestinations(input:{filter:{country:"St.(A)",region:"A+B"}}) { total } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data).toEqual({
			literal: { total: 0, totalPages: 0 },
			region: { total: 1 },
			punctuation: { total: 1 },
		});
	});
	const protectedOperations = [
		'{ getDestinationsForAdmin(input:{}) { total } }',
		'mutation { createDestination(input:{name:"New",type:AREA}) { slug } }',
		`mutation { updateDestination(input:{_id:"${id(2)}",name:"New"}) { name } }`,
	];
	it.each(protectedOperations)('rejects anonymous protected operation %s', async (query) => {
		const response = await post(query);
		expect(response.body.errors[0].extensions.code).toBe(AuthErrorCode.UNAUTHENTICATED);
		expect(destinationModel.aggregate).not.toHaveBeenCalled();
		expect(destinationModel.create).not.toHaveBeenCalled();
		expect(destinationModel.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it.each(['USER', 'OWNER', 'CREW', 'INACTIVE_ADMIN'])('rejects %s on all management operations', async (role) => {
		for (const query of protectedOperations) {
			const response = await post(query, role);
			expect(response.body.errors[0].extensions.code).toBe(AuthErrorCode.FORBIDDEN);
		}
		expect(destinationModel.aggregate).not.toHaveBeenCalled();
		expect(destinationModel.create).not.toHaveBeenCalled();
		expect(destinationModel.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('allows ADMIN to browse all statuses and filter archived', async () => {
		const response = await post(
			'{ all:getDestinationsForAdmin(input:{}) { total } archived:getDestinationsForAdmin(input:{filter:{status:ARCHIVED}}) { total } }',
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data).toEqual({ all: { total: 6 }, archived: { total: 1 } });
	});
	it('allows ADMIN creation with hierarchy and full presentation fields', async () => {
		const response = await post(
			`mutation { createDestination(input:{name:" New Area ",type:AREA,parentId:"${id(1)}",country:"France",region:"Europe",shortDescription:"Short",description:"Long",heroImage:"/hero.jpg",images:["/one.jpg"],featured:true,sortOrder:2}) { name slug parentId status featured sortOrder shortDescription description heroImage images } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.createDestination).toEqual({
			name: 'New Area',
			slug: 'new-area',
			parentId: id(1),
			status: 'DRAFT',
			featured: true,
			sortOrder: 2,
			shortDescription: 'Short',
			description: 'Long',
			heroImage: '/hero.jpg',
			images: ['/one.jpg'],
		});
	});
	it('preserves slug on rename, changes it explicitly and rejects duplicates', async () => {
		let response = await post(
			`mutation { updateDestination(input:{_id:"${id(2)}",name:"New Name"}) { name slug parentId } }`,
			'ADMIN',
		);
		expect(response.body.data.updateDestination).toEqual({ name: 'New Name', slug: 'riviera', parentId: id(1) });
		response = await post(`mutation { updateDestination(input:{_id:"${id(2)}",slug:"NEW Slug"}) { slug } }`, 'ADMIN');
		expect(response.body.data.updateDestination.slug).toBe('new-slug');
		response = await post(
			'mutation { createDestination(input:{name:"Different",slug:"NEW SLUG",type:AREA}) { slug } }',
			'ADMIN',
		);
		expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
	});
	it.each(['slug:"a/b"', 'name:"  "', 'sortOrder:-1', 'sortOrder:0.5', 'parentId:"bad"'])(
		'rejects invalid destination mutation %s',
		async (patch) => {
			const response = await post(`mutation { updateDestination(input:{_id:"${id(2)}",${patch}}) { slug } }`, 'ADMIN');
			expect(response.body.errors).toBeDefined();
			expect(destinationModel.create).not.toHaveBeenCalled();
			expect(destinationModel.findByIdAndUpdate).not.toHaveBeenCalled();
		},
	);
	it('rejects missing parent and direct hierarchy cycles', async () => {
		for (const query of [
			`mutation { createDestination(input:{name:"New",type:AREA,parentId:"${id(99)}"}) { slug } }`,
			`mutation { updateDestination(input:{_id:"${id(1)}",parentId:"${id(1)}"}) { slug } }`,
			`mutation { updateDestination(input:{_id:"${id(1)}",parentId:"${id(2)}"}) { slug } }`,
		]) {
			const response = await post(query, 'ADMIN');
			expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
		}
		expect(destinationModel.create).not.toHaveBeenCalled();
		expect(destinationModel.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('allows clearing parent explicitly', async () => {
		const response = await post(
			`mutation { updateDestination(input:{_id:"${id(2)}",parentId:null}) { parentId slug } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.updateDestination).toEqual({ parentId: null, slug: 'riviera' });
	});
	it('matches any Yacht tag at Mongo level and does not expand descendants', async () => {
		const response = await post(
			`{ child:getYachts(input:{filter:{destinationId:"${id(2)}",country:"France",location:"Nice",mode:SALE}}) { list { _id destinationIds location country } total } parent:getYachts(input:{filter:{destinationId:"${id(1)}"}}) { list { _id } total } }`,
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.child.total).toBe(2);
		expect(response.body.data.parent).toEqual({ list: [{ _id: id(21) }], total: 1 });
		expect(yachtModel.aggregate.mock.calls[0][0][0].$match.destinationIds).toBeInstanceOf(Types.ObjectId);
	});
	it('returns old Yacht records with empty tags and keeps charter alias', async () => {
		const response = await post(
			'{ getYachts(input:{}) { list { _id destinationIds charterPrice charterRate } total } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getYachts.total).toBe(3);
		expect(response.body.data.getYachts.list.find((record) => record._id === id(22))).toEqual({
			_id: id(22),
			destinationIds: [],
			charterPrice: 100,
			charterRate: 100,
		});
	});
	const yachtInput = `name:"New Yacht",location:"Nice",country:"France",brokerId:"${id(90)}",listingModes:[SALE]`;
	it('accepts multiple destination IDs including archived associations', async () => {
		const response = await post(
			`mutation { createYacht(input:{${yachtInput},destinationIds:["${id(2)}","${id(5)}"]}) { destinationIds location country } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.createYacht).toEqual({
			destinationIds: [id(2), id(5)],
			location: 'Nice',
			country: 'France',
		});
	});
	it.each([{ destinationIds: ['bad'] }, { destinationIds: [id(99)] }, { destinationIds: [id(2), id(2)] }])(
		'rejects invalid/nonexistent/duplicate Yacht associations %j',
		async ({ destinationIds }) => {
			const response = await post(
				`mutation { createYacht(input:{${yachtInput},destinationIds:${JSON.stringify(destinationIds)}}) { destinationIds } }`,
				'ADMIN',
			);
			expect(response.body.errors).toBeDefined();
			expect(yachtModel.create).not.toHaveBeenCalled();
		},
	);
	it('preserves omitted Yacht IDs, validates replacements and clears explicitly', async () => {
		let response = await post(
			`mutation { updateYacht(input:{_id:"${id(20)}",name:"Renamed"}) { destinationIds name } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.updateYacht.destinationIds).toEqual([id(2)]);
		response = await post(
			`mutation { updateYacht(input:{_id:"${id(20)}",destinationIds:["${id(99)}"]}) { destinationIds } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeDefined();
		response = await post(
			`mutation { updateYacht(input:{_id:"${id(20)}",destinationIds:[]}) { destinationIds } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.updateYacht.destinationIds).toEqual([]);
	});
	it('archiving hides Destination but preserves Yacht references and discovery', async () => {
		const response = await post(
			`mutation { updateDestination(input:{_id:"${id(2)}",status:ARCHIVED}) { status } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.updateDestination.status).toBe('ARCHIVED');
		const catalog = await post(
			`{ destinations:getDestinations(input:{}) { total } yachts:getYachts(input:{filter:{destinationId:"${id(2)}"}}) { list { destinationIds } total } }`,
		);
		expect(catalog.body.errors).toBeUndefined();
		expect(catalog.body.data.destinations.total).toBe(3);
		expect(catalog.body.data.yachts.total).toBe(2);
		expect(yachts[0].destinationIds.map(String)).toEqual([id(2)]);
	});
	it('sanitizes unexpected storage errors', async () => {
		destinationModel.aggregate.mockRejectedValueOnce(new Error('private database details'));
		const response = await post('{ getDestinations(input:{}) { total } }');
		expect(response.body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
		expect(JSON.stringify(response.body)).not.toContain('private database details');
	});
});
