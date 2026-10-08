import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { OfficeResolver } from '../src/components/office/office.resolver';
import { OfficeService } from '../src/components/office/office.service';
import { BrokerResolver } from '../src/components/broker/broker.resolver';
import { BrokerService } from '../src/components/broker/broker.service';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';

// HTTP GraphQL with real resolvers/services/guards; persistence and identity are mocked.
describe('Office and broker association GraphQL (e2e)', () => {
	let app: INestApplication;
	let records: any[];
	let brokers: any[];
	const id = (n: number) => n.toString(16).padStart(24, '0');
	const eq = (a: any, b: any) => String(a) === String(b);
	const matches = (record: any, match: any): boolean =>
		Object.entries(match).every(([key, value]: [string, any]) => {
			if (key === '$or') return value.some((part) => matches(record, part));
			if (value instanceof RegExp) return value.test(record[key] ?? '');
			if (value && typeof value === 'object' && '$ne' in value) return !eq(record[key], value.$ne);
			return eq(record[key], value);
		});
	const lean = (fetch: () => any) => ({ lean: () => ({ exec: async () => fetch() }) });
	const officeModel = {
		exists: jest.fn(async (match) => records.find((row) => matches(row, match)) ?? null),
		findOne: jest.fn((match) => lean(() => records.find((row) => matches(row, match)) ?? null)),
		create: jest.fn(async (fields) => {
			const record = {
				_id: id(100),
				images: [],
				businessHours: [],
				createdAt: new Date('2026-01-01'),
				updatedAt: new Date('2026-01-01'),
				...fields,
			};
			records.push(record);
			return record;
		}),
		findByIdAndUpdate: jest.fn((value, update) => ({
			exec: async () => {
				const row = records.find((row) => eq(row._id, value));
				if (!row) return null;
				Object.assign(row, update.$set);
				return row;
			},
		})),
		aggregate: jest.fn(async (pipeline) => {
			const eligible = records.filter((row) => matches(row, pipeline[0].$match));
			eligible.sort((a, b) => {
				for (const [key, direction] of Object.entries(pipeline[1].$sort)) {
					if (a[key] < b[key]) return -Number(direction);
					if (a[key] > b[key]) return Number(direction);
				}
				return 0;
			});
			const [skip, limit] = pipeline[2].$facet.list;
			return [{ list: eligible.slice(skip.$skip, skip.$skip + limit.$limit), meta: [{ total: eligible.length }] }];
		}),
	};
	const brokerModel = {
		find: jest.fn((match) => ({ sort: () => lean(() => brokers.filter((row) => matches(row, match))) })),
		findOne: jest.fn((match) => lean(() => brokers.find((row) => matches(row, match)) ?? null)),
		findOneAndUpdate: jest.fn((match, update) => ({
			exec: async () => {
				let row = brokers.find((row) => matches(row, match));
				if (!row) {
					row = { _id: id(90), isActive: true, languages: [], createdAt: new Date(), updatedAt: new Date() };
					brokers.push(row);
				}
				Object.assign(row, update.$set);
				return row;
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
				OfficeResolver,
				OfficeService,
				BrokerResolver,
				BrokerService,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('Member'), useValue: { exists: jest.fn().mockResolvedValue({ _id: id(80) }) } },
				{ provide: getModelToken('Office'), useValue: officeModel },
				{ provide: getModelToken('BrokerProfile'), useValue: brokerModel },
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
			country: 'Country',
			city: 'City',
			addressLine1: 'Street 1',
			status: 'PUBLISHED',
			featured: true,
			sortOrder: 0,
			images: [],
			businessHours: [],
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
		};
		records = [
			{ ...base, _id: id(1), name: 'Beta', slug: 'beta', sortOrder: 2 },
			{ ...base, _id: id(2), name: 'Alpha', slug: 'alpha', sortOrder: 1 },
			{
				...base,
				_id: id(3),
				name: 'Gamma',
				slug: 'gamma',
				featured: false,
				city: 'Other',
				createdAt: new Date('2026-02-01'),
			},
			{ ...base, _id: id(4), name: 'Draft', slug: 'draft', status: 'DRAFT' },
			{ ...base, _id: id(5), name: 'Archived', slug: 'archived', status: 'ARCHIVED' },
		];
		brokers = [
			{
				_id: id(90),
				name: 'Broker',
				email: 'broker@example.com',
				isActive: true,
				languages: [],
				officeId: id(1),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];
	});
	it('exposes Office fields, exact enums and Int wrapper without secrets', async () => {
		const response = await post(
			'{ o:__type(name:"Office") { fields { name } } w:__type(name:"Offices") { fields { name type { ofType { name } } } } s:__type(name:"OfficeStatus") { enumValues { name } } d:__type(name:"DayOfWeek") { enumValues { name } } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.o.fields.map((field) => field.name).sort()).toEqual(
			[
				'_id',
				'name',
				'slug',
				'status',
				'country',
				'city',
				'addressLine1',
				'addressLine2',
				'postalCode',
				'phone',
				'email',
				'timezone',
				'businessHours',
				'shortDescription',
				'description',
				'heroImage',
				'images',
				'featured',
				'sortOrder',
				'createdAt',
				'updatedAt',
			].sort(),
		);
		expect(response.body.data.w.fields.find((field) => field.name === 'total').type.ofType.name).toBe('Int');
		expect(response.body.data.s.enumValues.map((entry) => entry.name)).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
		expect(response.body.data.d.enumValues).toHaveLength(7);
	});
	it('returns published offices with defaults and curated order', async () => {
		const response = await post('{ getOffices(input:{}) { list { slug } total page limit totalPages } }');
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getOffices).toEqual({
			list: [{ slug: 'alpha' }, { slug: 'beta' }, { slug: 'gamma' }],
			total: 3,
			page: 1,
			limit: 20,
			totalPages: 1,
		});
	});
	it.each(['DRAFT', 'ARCHIVED'])('overrides public %s status in list and featured', async (status) => {
		const response = await post(
			`{ a:getOffices(input:{filter:{status:${status}}}) { total } b:getFeaturedOffices(input:{filter:{status:${status},featured:false}}) { list { status } total } }`,
		);
		expect(response.body.data.a.total).toBe(3);
		expect(response.body.data.b.total).toBe(2);
		expect(response.body.data.b.list.every((row) => row.status === 'PUBLISHED')).toBe(true);
	});
	it.each(['draft', 'archived', 'missing'])('hides %s detail', async (slug) => {
		expect((await post(`{ getOffice(slug:"${slug}") { name } }`)).body.errors).toBeDefined();
	});
	it('returns published detail and featured defaults', async () => {
		const response = await post(
			'{ getOffice(slug:"alpha") { slug businessHours { day } images } getFeaturedOffices { total } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getOffice.slug).toBe('alpha');
		expect(response.body.data.getFeaturedOffices.total).toBe(2);
	});
	it.each([
		['country:"country"', 3],
		['city:"Other"', 1],
		['featured:false', 1],
		['search:"Alpha"', 1],
		['search:".*"', 0],
	])('filters %s with literal matching', async (filter, total) => {
		const response = await post(`{ getOffices(input:{filter:{${filter}}}) { total } }`);
		expect(response.body.data.getOffices.total).toBe(total);
	});
	it.each([
		['FEATURED', ['alpha', 'beta', 'gamma']],
		['SORT_ORDER', ['gamma', 'alpha', 'beta']],
		['NAME_ASC', ['alpha', 'beta', 'gamma']],
		['NAME_DESC', ['gamma', 'beta', 'alpha']],
		['NEWEST', ['gamma', 'alpha', 'beta']],
	])('sorts %s deterministically', async (sortBy, expected) => {
		const response = await post(`{ getOffices(input:{sortBy:${sortBy}}) { list { slug } } }`);
		expect(response.body.data.getOffices.list.map((row) => row.slug)).toEqual(expected);
	});
	it('paginates with total count and supports limit 50', async () => {
		const response = await post(
			'{ a:getOffices(input:{page:2,limit:2}) { list { slug } total totalPages } b:getOffices(input:{limit:50}) { limit } }',
		);
		expect(response.body.data.a).toEqual({ list: [{ slug: 'gamma' }], total: 3, totalPages: 2 });
		expect(response.body.data.b.limit).toBe(50);
	});
	it.each(['page:0', 'limit:0', 'limit:51', 'limit:1.5'])('rejects invalid pagination %s', async (input) => {
		expect((await post(`{ getOffices(input:{${input}}) { total } }`)).body.errors).toBeDefined();
		expect(officeModel.aggregate).not.toHaveBeenCalled();
	});
	const create =
		'mutation { createOffice(input:{name:" New Office ",country:"Country",city:"City",addressLine1:"Street"}) { slug status featured } }';
	const update = `mutation { updateOffice(input:{_id:"${id(1)}",name:"Renamed"}) { name slug } }`;
	const adminQuery = '{ getOfficesForAdmin(input:{}) { total } }';
	it.each([undefined, 'USER', 'OWNER', 'CREW', 'INACTIVE_ADMIN'])('rejects Office management for %s', async (role) => {
		for (const query of [create, update, adminQuery]) {
			const response = await post(query, role);
			expect(response.body.errors[0].extensions.code).toBe(
				role ? AuthErrorCode.FORBIDDEN : AuthErrorCode.UNAUTHENTICATED,
			);
		}
		expect(officeModel.create).not.toHaveBeenCalled();
		expect(officeModel.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(officeModel.aggregate).not.toHaveBeenCalled();
	});
	it('allows ADMIN catalog/create/update with slug preservation', async () => {
		expect((await post(adminQuery, 'ADMIN')).body.data.getOfficesForAdmin.total).toBe(5);
		expect((await post(create, 'ADMIN')).body.data.createOffice).toEqual({
			slug: 'new-office',
			status: 'DRAFT',
			featured: false,
		});
		expect((await post(update, 'ADMIN')).body.data.updateOffice).toEqual({ name: 'Renamed', slug: 'beta' });
	});
	it('rejects duplicate slugs and invalid complete schedules', async () => {
		for (const extra of [
			'slug:"alpha"',
			'businessHours:[{day:MONDAY,openTime:"18:00",closeTime:"09:00"}]',
			'businessHours:[{day:MONDAY,closed:true},{day:MONDAY,closed:true}]',
		]) {
			const response = await post(
				`mutation { createOffice(input:{name:"New",country:"Country",city:"City",addressLine1:"Street",${extra}}) { slug } }`,
				'ADMIN',
			);
			expect(response.body.errors).toBeDefined();
		}
		expect(officeModel.create).not.toHaveBeenCalled();
	});
	it('stores structured hours and normalized contact information', async () => {
		const response = await post(
			'mutation { createOffice(input:{name:"New",country:"Country",city:"City",addressLine1:"Street",email:" INFO@EXAMPLE.COM ",timezone:"Asia/Dubai",businessHours:[{day:MONDAY,openTime:"09:00",closeTime:"18:00"},{day:SUNDAY,closed:true}]}) { email timezone businessHours { day openTime closeTime closed } } }',
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.createOffice.email).toBe('info@example.com');
		expect(response.body.data.createOffice.businessHours).toHaveLength(2);
	});
	it('archives without cascading or changing broker visibility/references', async () => {
		expect(
			(await post(`mutation { updateOffice(input:{_id:"${id(1)}",status:ARCHIVED}) { status } }`, 'ADMIN')).body.errors,
		).toBeUndefined();
		const response = await post('{ getOffices(input:{}) { total } getBrokerProfiles { list { officeId } } }');
		expect(response.body.data.getOffices.total).toBe(2);
		expect(response.body.data.getBrokerProfiles.list[0].officeId).toBe(id(1));
		expect(brokerModel.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it('keeps legacy brokers valid and preserves omitted links on saves', async () => {
		delete brokers[0].officeId;
		expect(
			(await post('{ getBrokerProfiles { list { officeId } } }')).body.data.getBrokerProfiles.list[0].officeId,
		).toBeNull();
		brokers[0].officeId = id(1);
		const response = await post(
			'mutation { saveBrokerProfile(input:{name:"Renamed Broker",email:"broker@example.com"}) { officeId } }',
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.saveBrokerProfile.officeId).toBe(id(1));
	});
	it.each(['bad', id(99)])('rejects invalid/nonexistent broker officeId %s', async (officeId) => {
		expect(
			(
				await post(
					`mutation { saveBrokerProfile(input:{name:"Broker",email:"broker@example.com",officeId:"${officeId}"}) { officeId } }`,
					'ADMIN',
				)
			).body.errors,
		).toBeDefined();
		expect(brokerModel.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it('assigns an existing archived Office without changing the existing broker contract', async () => {
		const response = await post(
			`mutation { saveBrokerProfile(input:{name:"Broker",email:"broker@example.com",officeId:"${id(5)}"}) { officeId } }`,
			'ADMIN',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.saveBrokerProfile.officeId).toBe(id(5));
	});
});
