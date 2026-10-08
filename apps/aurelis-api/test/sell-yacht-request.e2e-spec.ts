import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { SellYachtRequestResolver } from '../src/components/sell-yacht-request/sell-yacht-request.resolver';
import { SellYachtRequestService } from '../src/components/sell-yacht-request/sell-yacht-request.service';
import {
	invalidSellRequestPatches,
	sellRequestFields,
	sellRequestFixture,
	sellRequestTestId,
} from '../src/components/sell-yacht-request/sell-yacht-request-test-fixture';
import { OptionalInquiryAuthGuard } from '../src/components/inquiry/optional-inquiry-auth.guard';
import { AuthService } from '../src/components/auth/auth.service';
import type { AuthRequest } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';
import { MemberRole, MemberStatus } from '../src/libs/enums/member.enum';
import { SellYachtRequestStatus } from '../src/libs/enums/sell-yacht-request.enum';

type Row = {
	_id: string;
	status: string;
	memberId: string | null;
	ownerName: string;
	email: string;
	phone: string;
	yachtName: string;
	builder: string;
	model: string | null;
	yearBuilt: number;
	lengthM: number;
	location: string;
	country: string;
	askingPrice: number | null;
	currency: string | null;
	description: string | null;
};
type Collection = { list: Row[]; total: number; page: number; limit: number; totalPages: number };
type Data = {
	submitSellYachtRequest: Row;
	getSellYachtRequest: Row;
	updateSellYachtRequestStatus: Row;
	getSellYachtRequestsForAdmin: Collection;
};
type Response<T = Data> = { data: T | null; errors?: { message: string; extensions: { code: string } }[] };

describe('Sell yacht request GraphQL (offline HTTP e2e)', () => {
	let app: INestApplication;
	let f: ReturnType<typeof sellRequestFixture>;
	const sideEffects = {
		yacht: { create: jest.fn() },
		broker: { create: jest.fn() },
		destination: { create: jest.fn() },
		member: { updateOne: jest.fn() },
	};
	const fields =
		'_id status memberId ownerName email phone yachtName builder model yearBuilt lengthM location country askingPrice currency description';
	const submit = `mutation($input:CreateSellYachtRequestInput!) { submitSellYachtRequest(input:$input) { ${fields} } }`;
	const list = (filter = '') =>
		`{ getSellYachtRequestsForAdmin(input:{${filter}}) { total page limit totalPages list { ${fields} } } }`;
	const detail = (id = sellRequestTestId(100)) => `{ getSellYachtRequest(id:"${id}") { ${fields} } }`;
	const update = (status: string, id = sellRequestTestId(100)) =>
		`mutation { updateSellYachtRequestStatus(input:{requestId:"${id}",status:${status}}) { ${fields} } }`;
	const post = async <T = Data>(
		query: string,
		identity?: string,
		variables: Record<string, unknown> = {},
	): Promise<Response<T>> => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (identity) req.set('Authorization', `Bearer ${identity}`);
		return (await req.send({ query, variables })).body as Response<T>;
	};
	beforeEach(async () => {
		jest.clearAllMocks();
		f = sellRequestFixture();
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				SellYachtRequestResolver,
				SellYachtRequestService,
				OptionalInquiryAuthGuard,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('SellYachtRequest'), useValue: f.model },
				{ provide: getModelToken('Yacht'), useValue: sideEffects.yacht },
				{ provide: getModelToken('BrokerProfile'), useValue: sideEffects.broker },
				{ provide: getModelToken('Destination'), useValue: sideEffects.destination },
				{ provide: getModelToken('Member'), useValue: sideEffects.member },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: (req: AuthRequest) => {
							const identity = req.headers.authorization?.replace('Bearer ', '');
							if (!identity) throw authError(AuthErrorCode.UNAUTHENTICATED);
							if (identity === 'BLOCKED') throw authError(AuthErrorCode.ACCOUNT_BLOCKED);
							if (identity === 'DELETED') throw authError(AuthErrorCode.ACCOUNT_DELETED);
							const role = Object.values(MemberRole).find((value) => value.toString() === identity);
							if (!role) throw authError(AuthErrorCode.INVALID_TOKEN);
							req.authMember = {
								_id: sellRequestTestId(1),
								email: 'account@example.com',
								role,
								status: MemberStatus.ACTIVE,
								createdAt: new Date(),
								updatedAt: new Date(),
							};
							return Promise.resolve(req.authMember);
						},
					},
				},
			],
		}).compile();
		app = module.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(new ValidationPipe({ transform: true, validationError: { target: false, value: false } }));
		await app.init();
	});
	afterEach(async () => app.close());
	it('creates a normalized guest lead, forces NEW and never writes inventory/brokers/destinations/members', async () => {
		const response = await post(submit, undefined, {
			input: {
				...sellRequestFields(),
				ownerName: ' Alex Owner ',
				email: ' OWNER@Example.COM ',
				phone: ' +44 (0)20 1234 5678 ',
				model: ' Model ',
				description: ' Refit details. ',
				askingPrice: 1000000.25,
				currency: ' usd ',
			},
		});
		expect(response.errors).toBeUndefined();
		expect(response.data?.submitSellYachtRequest).toMatchObject({
			...sellRequestFields(),
			status: 'NEW',
			memberId: null,
			model: 'Model',
			description: 'Refit details.',
			askingPrice: 1000000.25,
			currency: 'USD',
		});
		expect(f.model.create).toHaveBeenCalledTimes(1);
		for (const model of [sideEffects.yacht, sideEffects.broker, sideEffects.destination])
			expect(model.create).not.toHaveBeenCalled();
		expect(sideEffects.member.updateOne).not.toHaveBeenCalled();
	});
	it.each(Object.values(MemberRole))(
		'accepts verified %s without role promotion/contact substitution',
		async (identity) => {
			const response = await post(submit, identity, { input: sellRequestFields() });
			expect(response.errors).toBeUndefined();
			expect(response.data?.submitSellYachtRequest).toMatchObject({
				memberId: sellRequestTestId(1),
				ownerName: 'Alex Owner',
				email: 'owner@example.com',
			});
			expect(sideEffects.member.updateOne).not.toHaveBeenCalled();
		},
	);
	it.each([
		['INVALID', AuthErrorCode.INVALID_TOKEN],
		['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED', AuthErrorCode.ACCOUNT_DELETED],
	])('does not downgrade supplied %s credentials to guest', async (identity, code) => {
		expect((await post(submit, identity, { input: sellRequestFields() })).errors?.[0].extensions.code).toBe(code);
		expect(f.records).toHaveLength(0);
	});
	it.each(invalidSellRequestPatches.map((patch, n) => [n, patch] as const))(
		'rejects invalid owner/yacht/price case %s',
		async (_n, patch) => {
			expect((await post(submit, undefined, { input: { ...sellRequestFields(), ...patch } })).errors).toBeDefined();
			expect(f.records).toHaveLength(0);
		},
	);
	it.each(['status', 'memberId', 'yachtId', 'brokerId', 'destinationIds', 'salePrice', 'images', 'listingModes'])(
		'rejects unsupported/spoofed public %s',
		async (field) => {
			expect(
				(await post(submit, 'USER', { input: { ...sellRequestFields(), [field]: 'spoof' } })).errors,
			).toBeDefined();
			expect(f.model.create).not.toHaveBeenCalled();
		},
	);
	it('accepts no price/model/description and repeats, with currency-alone allowed', async () => {
		for (let n = 0; n < 2; n++)
			expect((await post(submit, undefined, { input: sellRequestFields() })).errors).toBeUndefined();
		const response = await post(submit, undefined, { input: { ...sellRequestFields(), currency: ' eur ' } });
		expect(response.data?.submitSellYachtRequest).toMatchObject({
			askingPrice: null,
			currency: 'EUR',
			model: null,
			description: null,
		});
		expect(f.records).toHaveLength(3);
	});
	it.each([
		[undefined, AuthErrorCode.UNAUTHENTICATED],
		['USER', AuthErrorCode.FORBIDDEN],
		['OWNER', AuthErrorCode.FORBIDDEN],
		['CREW', AuthErrorCode.FORBIDDEN],
		['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED', AuthErrorCode.ACCOUNT_DELETED],
	])('prevents %s from browsing/searching/reading/updating existing private leads', async (identity, code) => {
		await post(submit, 'USER', { input: sellRequestFields() });
		for (const query of [list(), list('email:"owner@example.com"'), detail(), update('CONTACTED')])
			expect((await post(query, identity)).errors?.[0].extensions.code).toBe(code);
		expect(f.model.find).not.toHaveBeenCalled();
		expect(f.model.findById).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it.each(Object.values(SellYachtRequestStatus))(
		'allows ADMIN detail/status %s and retains the complete lead',
		async (status) => {
			await post(submit, 'USER', { input: sellRequestFields() });
			expect((await post(detail(), 'ADMIN')).data?.getSellYachtRequest.ownerName).toBe('Alex Owner');
			const response = await post(update(status), 'ADMIN');
			expect(response.errors).toBeUndefined();
			expect(response.data?.updateSellYachtRequestStatus).toMatchObject({
				...sellRequestFields(),
				status,
				memberId: sellRequestTestId(1),
			});
			expect(f.records).toHaveLength(1);
		},
	);
	it.each(['memberId', 'ownerName', 'askingPrice', 'yachtName'])('rejects broad admin edit %s', async (field) => {
		expect(
			(
				await post(
					`mutation { updateSellYachtRequestStatus(input:{requestId:"${sellRequestTestId(100)}",status:CLOSED,${field}:"spoof"}) { _id } }`,
					'ADMIN',
				)
			).errors,
		).toBeDefined();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it.each(['status:NEW', 'country:" Italy "', 'builder:" Builder "', 'email:" OWNER@Example.COM "'])(
		'filters %s through persistence',
		async (filter) => {
			await post(submit, undefined, { input: sellRequestFields() });
			await post(submit, undefined, {
				input: { ...sellRequestFields(), country: 'France', builder: 'Other', email: 'other@example.com' },
			});
			if (filter === 'status:NEW') f.records[1].status = SellYachtRequestStatus.CLOSED;
			const response = await post(list(filter), 'ADMIN');
			expect(response.errors).toBeUndefined();
			expect(response.data?.getSellYachtRequestsForAdmin.total).toBe(1);
			expect(f.model.find.mock.calls[0][0]).toEqual(f.model.countDocuments.mock.calls[0][0]);
		},
	);
	it('provides 1/20 defaults, cap 50, stable pages and empty out-of-range pages', async () => {
		await post(submit, undefined, { input: sellRequestFields() });
		await post(submit, undefined, { input: sellRequestFields() });
		f.records.forEach((row) => (row.createdAt = new Date('2026-10-06')));
		expect(
			(await post('{ getSellYachtRequestsForAdmin { total page limit totalPages } }', 'ADMIN')).data
				?.getSellYachtRequestsForAdmin,
		).toMatchObject({ total: 2, page: 1, limit: 20, totalPages: 1 });
		expect((await post(list('page:2,limit:1'), 'ADMIN')).data?.getSellYachtRequestsForAdmin.list[0]._id).toBe(
			sellRequestTestId(100),
		);
		expect((await post(list('page:3,limit:1'), 'ADMIN')).data?.getSellYachtRequestsForAdmin).toMatchObject({
			list: [],
			total: 2,
		});
		expect((await post(list('limit:50'), 'ADMIN')).data?.getSellYachtRequestsForAdmin.limit).toBe(50);
	});
	it.each([
		'page:0',
		'page:-1',
		'page:1.5',
		'page:null',
		'limit:0',
		'limit:51',
		'limit:1.5',
		'limit:null',
		'status:DRAFT',
		'status:null',
		'country:" "',
		'builder:" "',
		'email:"bad"',
	])('rejects invalid catalog %s', async (filter) => {
		expect((await post(list(filter), 'ADMIN')).errors).toBeDefined();
		expect(f.model.find).not.toHaveBeenCalled();
	});
	it('validates ID/not-found/status and masks persistence failures without raw internals', async () => {
		expect((await post(detail('bad'), 'ADMIN')).errors).toBeDefined();
		expect((await post(detail(sellRequestTestId(99)), 'ADMIN')).errors).toEqual([
			{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
		]);
		expect((await post(update('CLOSED', sellRequestTestId(99)), 'ADMIN')).errors).toBeDefined();
		expect((await post(update('PUBLISHED'), 'ADMIN')).errors).toBeDefined();
		f.model.create.mockRejectedValueOnce(new Error('private persistence details'));
		expect((await post(submit, undefined, { input: sellRequestFields() })).errors).toEqual([
			{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
		]);
	});
	it('has no public list/history/delete or full edit API and uses Int total', async () => {
		for (const query of [
			'{ getSellYachtRequests { total } }',
			'{ getMySellYachtRequests { total } }',
			`mutation { deleteSellYachtRequest(id:"${sellRequestTestId(100)}") }`,
		])
			expect((await post(query, 'ADMIN')).errors).toBeDefined();
		type Shape = {
			wrapper: { fields: { name: string; type: { ofType: { name: string } } }[] };
			input: { inputFields: { name: string }[] };
			status: { enumValues: { name: string }[] };
		};
		const response = await post<Shape>(
			'{ wrapper:__type(name:"SellYachtRequests") { fields { name type { ofType { name } } } } input:__type(name:"CreateSellYachtRequestInput") { inputFields { name } } status:__type(name:"SellYachtRequestStatus") { enumValues { name } } }',
		);
		expect(response.data?.wrapper.fields.find((field) => field.name === 'total')?.type.ofType.name).toBe('Int');
		expect(response.data?.input.inputFields.map((field) => field.name)).not.toEqual(
			expect.arrayContaining(['status', 'memberId']),
		);
		expect(response.data?.status.enumValues.map((value) => value.name)).toEqual([
			'NEW',
			'CONTACTED',
			'REVIEWING',
			'CLOSED',
		]);
	});
});
