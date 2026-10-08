import type { Yacht } from '../src/libs/dto/yacht/yacht';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { YachtResolver } from '../src/components/yacht/yacht.resolver';
import { DestinationService } from '../src/components/destination/destination.service';
import { YachtService } from '../src/components/yacht/yacht.service';
import { BrokerService } from '../src/components/broker/broker.service';
import { BrokerResolver } from '../src/components/broker/broker.resolver';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';

describe('Yacht GraphQL compatibility (mocked persistence, real resolver/service/guards)', () => {
	let app: INestApplication;
	const id = '507f1f77bcf86cd799439011';
	const brokerId = '507f1f77bcf86cd799439012';
	const broker = { _id: brokerId, name: 'Broker', email: 'broker@example.com', isActive: true, languages: [] };
	const published = {
		_id: id,
		name: 'Aurelis',
		location: 'Nice',
		country: 'France',
		listingModes: ['SALE', 'CHARTER'],
		charterPrice: 100,
		charterCurrency: 'EUR',
		featured: true,
		status: 'PUBLISHED',
		brokerId,
		broker,
	};
	const records = [
		published,
		{ ...published, _id: '507f1f77bcf86cd799439013', status: 'DRAFT' },
		{ ...published, _id: '507f1f77bcf86cd799439014', status: 'ARCHIVED' },
	];
	let viewsCount = 0;
	const model = {
		findOneAndUpdate: jest.fn((match: { _id: string; status: string }) => ({
			lean: () => ({
				exec: () =>
					Promise.resolve(
						records.some((record) => record._id === match._id && record.status === match.status)
							? { viewsCount: ++viewsCount }
							: null,
					),
			}),
		})),
		aggregate: jest.fn(async (pipeline) => {
			const match = pipeline[0].$match;
			const eligible = records.filter((record) =>
				Object.entries(match).every(([field, value]) =>
					Array.isArray(record[field]) ? record[field].includes(value) : record[field] === value,
				),
			);
			const listStages = pipeline[2].$facet.list;
			return [
				{
					list: eligible.slice(listStages[0].$skip, listStages[0].$skip + listStages[1].$limit),
					meta: [{ total: eligible.length }],
				},
			];
		}),
		findOne: jest.fn((match) => ({
			populate: () => ({
				lean: () => ({
					exec: async () => {
						const yacht = records.find((record) => record._id === match._id && record.status === match.status);
						return yacht ? { ...yacht, brokerId: broker } : null;
					},
				}),
			}),
		})),
		create: jest.fn(async (fields) => ({ ...fields, _id: id })),
		findById: jest.fn(() => ({ lean: () => ({ exec: async () => published }) })),
		findByIdAndUpdate: jest.fn((_id, update) => ({ exec: async () => ({ ...published, ...update.$set }) })),
	};
	const brokers = {
		getById: jest.fn(async () => broker),
		listActive: jest.fn(async () => [broker]),
		upsert: jest.fn(async () => broker),
	};
	const post = (query: string, role?: string) => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (role) req.set('Authorization', `Bearer ${role}`);
		return req.send({ query });
	};
	beforeAll(async () => {
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				YachtResolver,
				YachtService,
				BrokerResolver,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('Yacht'), useValue: model },
				{ provide: BrokerService, useValue: brokers },
				{ provide: DestinationService, useValue: { validateIds: jest.fn() } },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: async (req) => {
							if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
							req.authMember = { _id: id, role: req.headers.authorization.replace('Bearer ', ''), status: 'ACTIVE' };
							return req.authMember;
						},
					},
				},
			],
		}).compile();
		app = module.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ validationError: { target: false, value: false } }));
		await app.init();
	});
	it('exposes legacy engagement defaults on list/detail and records explicit public views', async () => {
		const result = await post(
			`{ getYachts(input: {}) { total list { viewsCount likesCount charterRate charterPrice } } getYacht(id: "${id}") { viewsCount likesCount } }`,
		);
		const body = result.body as {
			errors?: unknown[];
			data: { getYacht: { viewsCount: number; likesCount: number }; getYachts: { list: Yacht[] } };
		};
		expect(body.errors).toBeUndefined();
		expect(body.data.getYacht).toEqual({ viewsCount: 0, likesCount: 0 });
		expect(body.data.getYachts.list[0]).toMatchObject({
			viewsCount: 0,
			likesCount: 0,
			charterRate: 100,
			charterPrice: 100,
		});
		for (const count of [1, 2]) {
			const view = await post(`mutation { recordYachtView(yachtId: "${id}") }`);
			const viewBody = view.body as { errors?: unknown[]; data: { recordYachtView: number } };
			expect(viewBody.errors).toBeUndefined();
			expect(viewBody.data.recordYachtView).toBe(count);
		}
		for (const target of ['invalid', records[1]._id, records[2]._id, '507f1f77bcf86cd799439099']) {
			const view = await post(`mutation { recordYachtView(yachtId: "${target}") }`);
			expect((view.body as { errors?: unknown[] }).errors).toBeDefined();
		}
		expect(viewsCount).toBe(2);
	});
	afterAll(async () => {
		await app.close();
	});
	beforeEach(() => jest.clearAllMocks());
	it('preserves all three collection return types and the actual total scalar', async () => {
		const response = await post(
			'{ query: __type(name: "Query") { fields { name type { kind name ofType { kind name } } } } wrapper: __type(name: "Yachts") { fields { name type { kind name ofType { kind name } } } } }',
		);
		expect(response.body.errors).toBeUndefined();
		for (const name of ['getYachts', 'getFeaturedYachts', 'getYachtsForStaff']) {
			expect(response.body.data.query.fields.find((field) => field.name === name).type).toMatchObject({
				kind: 'NON_NULL',
				ofType: { name: 'Yachts' },
			});
		}
		expect(response.body.data.query.fields.some((field) => field.name === 'getYachtsPaginated')).toBe(false);
		expect(response.body.data.wrapper.fields.find((field) => field.name === 'total').type.ofType.name).toBe('Float');
		expect(response.body.data.wrapper.fields.map((field) => field.name)).toEqual([
			'list',
			'total',
			'page',
			'limit',
			'totalPages',
		]);
	});
	it.each(['DRAFT', 'ARCHIVED', 'PUBLISHED'])(
		'forces public publication even with status %s and exposes equal price aliases',
		async (status) => {
			const response = await post(
				`{ getYachts(input: { filter: { status: ${status}, listingMode: CHARTER } }) { list { _id status charterPrice charterRate brokerId broker { _id } } total page limit totalPages } }`,
			);
			expect(response.body.errors).toBeUndefined();
			expect(response.body.data.getYachts).toEqual({
				list: [
					{ _id: id, status: 'PUBLISHED', charterPrice: 100, charterRate: 100, brokerId, broker: { _id: brokerId } },
				],
				total: 1,
				page: 1,
				limit: 20,
				totalPages: 1,
			});
			expect(brokers.getById).not.toHaveBeenCalled();
		},
	);
	it('keeps featured wrapper and excludes unpublished featured records', async () => {
		const response = await post('{ getFeaturedYachts { list { _id status } total } }');
		expect(response.body.data.getFeaturedYachts).toEqual({ list: [{ _id: id, status: 'PUBLISHED' }], total: 1 });
	});
	it('returns an empty page without losing the eligible total', async () => {
		const response = await post('{ getYachts(input: { page: 2, limit: 1 }) { list { _id } total totalPages } }');
		expect(response.body.data.getYachts).toEqual({ list: [], total: 1, totalPages: 1 });
	});
	it.each(['DRAFT', 'ARCHIVED'])('hides %s details', async (status) => {
		const record = records.find((record) => record.status === status)!;
		const response = await post(`{ getYacht(id: "${record._id}") { _id } }`);
		expect(response.body.errors).toBeDefined();
		expect(response.body.data).toBeNull();
	});
	it('serves published details with canonical broker ID and charter aliases', async () => {
		const response = await post(`{ getYacht(id: "${id}") { _id brokerId charterRate charterPrice } }`);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getYacht).toEqual({ _id: id, brokerId, charterRate: 100, charterPrice: 100 });
	});
	it.each(['USER', 'OWNER', 'CREW', undefined])('protects staff reads and writes from %s', async (role) => {
		for (const query of [
			'{ getYachtsForStaff(input: {}) { total } }',
			`mutation { createYacht(input: { name: "Yacht", location: "Nice", country: "France", listingModes: [SALE], brokerId: "${brokerId}" }) { _id } }`,
			`mutation { updateYacht(input: { _id: "${id}", name: "Updated" }) { _id } }`,
		]) {
			const response = await post(query, role);
			expect(response.body.errors[0].extensions.code).toBe(role ? 'AUTH_FORBIDDEN' : 'AUTH_UNAUTHENTICATED');
		}
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('allows ADMIN staff access to all statuses and filtered drafts', async () => {
		const all = await post('{ getYachtsForStaff(input: {}) { list { status } total } }', 'ADMIN');
		expect(all.body.errors).toBeUndefined();
		expect(all.body.data.getYachtsForStaff.total).toBe(3);
		const drafts = await post(
			'{ getYachtsForStaff(input: { filter: { status: DRAFT } }) { list { status } total } }',
			'ADMIN',
		);
		expect(drafts.body.data.getYachtsForStaff).toEqual({ list: [{ status: 'DRAFT' }], total: 1 });
	});
	it.each(['charterRate: 0', 'charterPrice: 0', 'charterPrice: 0, charterRate: 0'])(
		'normalizes GraphQL create input %s',
		async (price) => {
			const response = await post(
				`mutation { createYacht(input: { name: "Yacht", location: "Nice", country: "France", listingModes: [CHARTER], brokerId: "${brokerId}", charterCurrency: "EUR", ${price} }) { charterRate charterPrice status featured } }`,
				'ADMIN',
			);
			expect(response.body.errors).toBeUndefined();
			expect(response.body.data.createYacht).toEqual({
				charterRate: 0,
				charterPrice: 0,
				status: 'DRAFT',
				featured: false,
			});
			expect(model.create.mock.calls[0][0]).not.toHaveProperty('charterRate');
		},
	);
	it('supports a partial GraphQL update without resetting price or featured', async () => {
		const response = await post(
			`mutation { updateYacht(input: { _id: "${id}", name: "Updated" }) { name charterPrice charterRate featured } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.updateYacht).toEqual({
			name: 'Updated',
			charterPrice: 100,
			charterRate: 100,
			featured: true,
		});
		expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({ $set: { name: 'Updated' } });
	});
	it.each(['page: 0', 'limit: 51', 'filter: { minGuests: -1 }', 'filter: { minPrice: 100 }'])(
		'rejects invalid query %s with normal validation errors',
		async (input) => {
			const response = await post(`{ getYachts(input: { ${input} }) { total } }`);
			expect(response.body.errors).toBeDefined();
			expect(response.body.errors[0].extensions.code).not.toMatch(/^AUTH_/);
			expect(model.aggregate).not.toHaveBeenCalled();
		},
	);
	it.each(['charterRate: 0', 'charterPrice: 0', 'charterRate: 0, charterPrice: 0'])(
		'normalizes partial GraphQL update %s',
		async (price) => {
			const response = await post(
				`mutation { updateYacht(input: { _id: "${id}", ${price} }) { charterPrice charterRate } }`,
				'ADMIN',
			);
			expect(response.body.errors).toBeUndefined();
			expect(response.body.data.updateYacht).toEqual({ charterPrice: 0, charterRate: 0 });
			expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({ $set: { charterPrice: 0 } });
		},
	);
	it('sanitizes unexpected persistence errors', async () => {
		model.aggregate.mockRejectedValueOnce(new Error('mongodb://secret-password@internal-host filesystem/path'));
		const response = await post('{ getYachts(input: {}) { total } }');
		expect(response.body.errors[0].message).toBe('Internal server error');
		expect(JSON.stringify(response.body)).not.toMatch(/secret-password|internal-host|filesystem|stacktrace/);
	});
	it('rejects conflicting GraphQL charter aliases', async () => {
		const response = await post(
			`mutation { updateYacht(input: { _id: "${id}", charterRate: 1, charterPrice: 2 }) { _id } }`,
			'ADMIN',
		);
		expect(response.body.errors[0].message).toContain('must match');
		expect(model.findById).not.toHaveBeenCalled();
	});
	it('preserves broker queries and ADMIN broker writes', async () => {
		const response = await post(
			`{ getBrokerProfiles { list { _id } total } getBrokerProfile(id: "${brokerId}") { _id } }`,
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getBrokerProfiles.total).toBe(1);
		const write = await post(
			'mutation { saveBrokerProfile(input: { name: "Broker", email: "broker@example.com" }) { _id } }',
			'ADMIN',
		);
		expect(write.body.errors).toBeUndefined();
		expect(write.body.data.saveBrokerProfile._id).toBe(brokerId);
	});
});
