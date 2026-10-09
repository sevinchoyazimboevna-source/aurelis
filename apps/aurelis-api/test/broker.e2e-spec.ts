import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { BrokerService } from '../src/components/broker/broker.service';
import { BrokerResolver } from '../src/components/broker/broker.resolver';
import { OfficeService } from '../src/components/office/office.service';
import { AuthService } from '../src/components/auth/auth.service';
import { formatGraphQLError } from '../src/components/auth/auth-errors';

interface BrokerPage {
	list: { _id: string }[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}
interface Body {
	data?: { getBrokerProfiles: BrokerPage; schema: { fields: { name: string; type: { ofType?: { name: string } } }[] } };
	errors?: unknown[];
}
describe('Broker pagination GraphQL compatibility (offline persistence)', () => {
	let app: INestApplication;
	let records: { _id: string; isActive: boolean }[];
	beforeAll(async () => {
		records = Array.from({ length: 55 }, (_, n) => ({ _id: n.toString(16).padStart(24, '0'), isActive: n < 50 }));
		const eligible = () => records.filter((r) => r.isActive);
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				BrokerResolver,
				BrokerService,
				{ provide: OfficeService, useValue: {} },
				{ provide: AuthService, useValue: {} },
				{ provide: getModelToken('Member'), useValue: {} },
				{
					provide: getModelToken('BrokerProfile'),
					useValue: {
						find: () => ({
							sort: () => ({
								skip: (offset: number) => ({
									limit: (limit: number) => ({
										lean: () => ({ exec: () => Promise.resolve(eligible().slice(offset, offset + limit)) }),
									}),
								}),
							}),
						}),
						countDocuments: () => ({ exec: () => Promise.resolve(eligible().length) }),
					},
				},
			],
		}).compile();
		app = module.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(new ValidationPipe());
		await app.init();
	});
	afterAll(async () => {
		await app.close();
	});
	async function post(input?: unknown): Promise<Body> {
		const response = await request(app.getHttpServer())
			.post('/graphql')
			.send(
				input === undefined
					? { query: '{ getBrokerProfiles { list { _id } total page limit totalPages } }' }
					: {
							query:
								'query($input: BrokerCatalogInput) { getBrokerProfiles(input: $input) { list { _id } total page limit totalPages } }',
							variables: { input },
						},
			);
		return response.body as Body;
	}
	it('preserves argument-free list/Float total while bounding the default page', async () => {
		const body = await post();
		expect(body.errors).toBeUndefined();
		expect(body.data?.getBrokerProfiles.list).toHaveLength(20);
		expect(body.data?.getBrokerProfiles).toMatchObject({ total: 50, page: 1, limit: 20, totalPages: 3 });
		const schema = await request(app.getHttpServer())
			.post('/graphql')
			.send({ query: '{ schema: __type(name:"BrokerProfiles") { fields { name type { ofType { name } } } } }' });
		expect((schema.body as Body).data?.schema.fields.find((f) => f.name === 'total')?.type.ofType?.name).toBe('Float');
	});
	it('treats explicitly null optional input as omitted input', async () => {
		const body = await post(null);
		expect(body.errors).toBeUndefined();
		expect(body.data?.getBrokerProfiles.list).toHaveLength(20);
		expect(body.data?.getBrokerProfiles).toMatchObject({ page: 1, limit: 20, total: 50 });
	});

	it('returns last and empty pages with the same full active count', async () => {
		const last = await post({ page: 3, limit: 20 });
		expect(last.data?.getBrokerProfiles.list).toHaveLength(10);
		expect(last.data?.getBrokerProfiles.total).toBe(50);
		const empty = await post({ page: 4, limit: 20 });
		expect(empty.data?.getBrokerProfiles.list).toEqual([]);
		expect(empty.data?.getBrokerProfiles.totalPages).toBe(3);
	});
	it.each([{ page: 0 }, { page: -1 }, { limit: 0 }, { limit: 51 }, { page: null }, { limit: null }])(
		'rejects invalid pagination %j',
		async (input) => {
			expect((await post(input)).errors).toBeDefined();
		},
	);
	it('counts an empty catalog without inventing pages', async () => {
		records = [];
		expect((await post()).data?.getBrokerProfiles).toMatchObject({ list: [], total: 0, totalPages: 0 });
	});
});
