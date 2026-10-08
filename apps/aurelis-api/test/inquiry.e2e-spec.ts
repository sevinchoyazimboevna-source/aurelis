import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { InquiryResolver } from '../src/components/inquiry/inquiry.resolver';
import { InquiryService } from '../src/components/inquiry/inquiry.service';
import { OptionalInquiryAuthGuard } from '../src/components/inquiry/optional-inquiry-auth.guard';
import { inquiryFixture, inquiryTestId, salesFields } from '../src/components/inquiry/inquiry-test-fixture';
import { YachtService } from '../src/components/yacht/yacht.service';
import { AuthService } from '../src/components/auth/auth.service';
import type { AuthRequest } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';
import { MemberRole, MemberStatus } from '../src/libs/enums/member.enum';
import { YachtListingMode } from '../src/libs/enums/yacht.enum';

type Inquiry = {
	_id: string;
	type: string;
	status: string;
	yachtId: string;
	memberId: string | null;
	name: string;
	email: string;
	phone: string | null;
	message: string;
	guestCount: number | null;
	startDate: string | null;
	endDate: string | null;
};
type Collection = { list: Inquiry[]; total: number; page: number; limit: number; totalPages: number };
type Data = {
	submitSalesInquiry: Inquiry;
	submitCharterInquiry: Inquiry;
	submitYachtInquiry: Inquiry;
	getYachtInquiry: Inquiry;
	updateYachtInquiry: Inquiry;
	getYachtInquiries: Collection;
	getYachtInquiriesPage: Collection;
};
type Response<T = Data> = { data: T | null; errors?: { message: string; extensions: { code: string } }[] };

describe('Canonical Inquiry / Charter / Sales GraphQL (offline HTTP e2e)', () => {
	let app: INestApplication;
	let f: ReturnType<typeof inquiryFixture>;
	const fields = '_id type status yachtId memberId name email phone message startDate endDate guestCount';
	const charter = `mutation($input:CreateCharterInquiryInput!) { submitCharterInquiry(input:$input) { ${fields} } }`;
	const generic = `mutation($input:CreateYachtInquiryInput!) { submitYachtInquiry(input:$input) { ${fields} } }`;
	const sales = `mutation($input:CreateSalesInquiryInput!) { submitSalesInquiry(input:$input) { ${fields} } }`;
	const input = () => ({
		yachtId: inquiryTestId(10),
		name: ' Alex Charter ',
		email: ' ALEX@EXAMPLE.COM ',
		message: ' Please provide charter particulars. ',
		startDate: '2027-08-01T00:00:00Z',
		endDate: '2027-08-10T00:00:00Z',
		guestCount: 4,
	});
	const list = (filter = '', page = true) =>
		`{ ${page ? 'getYachtInquiriesPage' : 'getYachtInquiries'}(input:{${filter}}) { total page limit totalPages list { ${fields} } } }`;
	const detail = (id = inquiryTestId(100)) => `{ getYachtInquiry(id:"${id}") { ${fields} } }`;
	const update = (status: string, id = inquiryTestId(100)) =>
		`mutation { updateYachtInquiry(input:{_id:"${id}",status:${status}}) { ${fields} } }`;
	const post = async <T = Data>(
		query: string,
		identity?: string,
		variables: Record<string, unknown> = {},
	): Promise<Response<T>> => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (identity) req.set('Authorization', `Bearer ${identity}`);
		const response = await req.send({ query, variables });
		return response.body as Response<T>;
	};
	beforeEach(async () => {
		f = inquiryFixture();
		const fixture = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				InquiryResolver,
				InquiryService,
				OptionalInquiryAuthGuard,
				AuthGuard,
				RolesGuard,
				{ provide: getModelToken('YachtInquiry'), useValue: f.model },
				{ provide: YachtService, useValue: f.yachtService },
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
								_id: inquiryTestId(1),
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
		app = fixture.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(new ValidationPipe({ transform: true, validationError: { target: false, value: false } }));
		await app.init();
	});
	afterEach(async () => app.close());

	describe('Sales / purchase workflow', () => {
		it('exposes contact-only sales input and reuses YachtInquiry output', async () => {
			type Shape = {
				input: { inputFields: { name: string }[] };
				mutation: { fields: { name: string; type: { ofType: { name: string } } }[] };
			};
			const response = await post<Shape>(
				'{ input:__type(name:"CreateSalesInquiryInput") { inputFields { name } } mutation:__type(name:"Mutation") { fields { name type { ofType { name } } } } }',
			);
			expect(response.errors).toBeUndefined();
			expect(response.data?.input.inputFields.map((field) => field.name).sort()).toEqual(
				['yachtId', 'name', 'email', 'phone', 'message'].sort(),
			);
			expect(
				response.data?.mutation.fields.find((field) => field.name === 'submitSalesInquiry')?.type.ofType.name,
			).toBe('YachtInquiry');
		});
		it.each([11, 14])('permits guest SALE-capable yacht %s through dedicated and generic submissions', async (n) => {
			for (const [query, extra] of [
				[sales, {}],
				[generic, { type: 'SALES' }],
			] as const) {
				const response = await post(query, undefined, {
					input: {
						...salesFields(),
						...extra,
						yachtId: inquiryTestId(n),
						name: ' Alex Buyer ',
						email: ' BUYER@Example.COM ',
						phone: ' +44 (0)20 1234 5678 ',
						message: ' Please send sale particulars. ',
					},
				});
				expect(response.errors).toBeUndefined();
				expect(response.data?.[query === sales ? 'submitSalesInquiry' : 'submitYachtInquiry']).toMatchObject({
					type: 'SALES',
					status: 'NEW',
					memberId: null,
					name: 'Alex Buyer',
					email: 'buyer@example.com',
					phone: '+44 (0)20 1234 5678',
					message: 'Please send sale particulars.',
					startDate: null,
					endDate: null,
					guestCount: null,
				});
			}
			expect(f.records).toHaveLength(2);
		});
		it.each([10, 12, 13, 99])('rejects CHARTER-only/hidden SALE/missing yacht %s through both mutations', async (n) => {
			if (n === 12 || n === 13) f.yachts.get(inquiryTestId(n))!.listingModes = [YachtListingMode.SALE];
			for (const [query, extra] of [
				[sales, {}],
				[generic, { type: 'SALES' }],
			] as const)
				expect(
					(await post(query, undefined, { input: { ...salesFields(), ...extra, yachtId: inquiryTestId(n) } })).errors,
				).toBeDefined();
			expect(f.model.create).not.toHaveBeenCalled();
		});
		it.each(Object.values(MemberRole))(
			'links verified %s context through both sales paths without replacing contacts',
			async (identity) => {
				for (const [query, extra] of [
					[sales, {}],
					[generic, { type: 'SALES' }],
				] as const) {
					const response = await post(query, identity, { input: { ...salesFields(), ...extra } });
					expect(response.errors).toBeUndefined();
				}
				expect(f.records).toHaveLength(2);
				expect(f.records.every((row) => row.memberId?.toHexString() === inquiryTestId(1))).toBe(true);
				expect(f.records.every((row) => row.name === 'Alex Buyer' && row.email === 'buyer@example.com')).toBe(true);
			},
		);
		it.each([
			['INVALID', AuthErrorCode.INVALID_TOKEN],
			['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
			['DELETED', AuthErrorCode.ACCOUNT_DELETED],
		])('rejects supplied %s credentials without downgrading to guest', async (identity, code) => {
			for (const [query, extra] of [
				[sales, {}],
				[generic, { type: 'SALES' }],
			] as const)
				expect(
					(await post(query, identity, { input: { ...salesFields(), ...extra } })).errors?.[0].extensions.code,
				).toBe(code);
			expect(f.records).toHaveLength(0);
		});
		it.each([
			{ yachtId: 'bad' },
			{ name: ' ' },
			{ name: 'A' },
			{ name: 'x'.repeat(121) },
			{ name: null },
			{ email: 'bad' },
			{ email: null },
			{ phone: 123 },
			{ phone: 'x'.repeat(41) },
			{ message: 'short' },
			{ message: ' ' },
			{ message: null },
			{ message: 'x'.repeat(4001) },
		])('rejects invalid sales input %j through both paths', async (patch) => {
			for (const [query, extra] of [
				[sales, {}],
				[generic, { type: 'SALES' }],
			] as const)
				expect(
					(await post(query, undefined, { input: { ...salesFields(), ...extra, ...patch } })).errors,
				).toBeDefined();
			expect(f.records).toHaveLength(0);
		});
		it.each([
			{ memberId: inquiryTestId(2) },
			{ status: 'CLOSED' },
			{ type: 'CHARTER' },
			{ salePrice: 100 },
			{ budget: 100 },
			{ currency: 'USD' },
			{ startDate: '2027-08-01' },
			{ endDate: '2027-08-10' },
			{ guestCount: 4 },
		])('rejects unsupported sales facade field %j', async (patch) => {
			expect((await post(sales, 'USER', { input: { ...salesFields(), ...patch } })).errors).toBeDefined();
			expect(f.model.create).not.toHaveBeenCalled();
		});
		it.each([undefined, null, '', '+998 (90) 123-45-67 ext 2'])(
			'keeps optional broad phone contract %s',
			async (phone) => {
				expect((await post(sales, undefined, { input: { ...salesFields(), phone } })).errors).toBeUndefined();
			},
		);
		it('separates sales and charter on the same dual-mode yacht and preserves generic optional fields', async () => {
			await post(sales, undefined, { input: { ...salesFields(), yachtId: inquiryTestId(11) } });
			await post(charter, 'USER', { input: { ...input(), yachtId: inquiryTestId(11) } });
			const legacy = await post(generic, undefined, {
				input: { ...input(), yachtId: inquiryTestId(11), type: 'SALES' },
			});
			expect(legacy.errors).toBeUndefined();
			expect(legacy.data?.submitYachtInquiry).toMatchObject({ type: 'SALES', guestCount: 4 });
			expect(f.records.map((row) => row.type)).toEqual(['SALES', 'CHARTER', 'SALES']);
		});
		it('permits repeated legitimate buyer submissions without deduplication', async () => {
			for (let n = 0; n < 2; n++)
				expect((await post(sales, undefined, { input: salesFields() })).errors).toBeUndefined();
			expect(f.records).toHaveLength(2);
		});
		it.each([
			[undefined, AuthErrorCode.UNAUTHENTICATED],
			['USER', AuthErrorCode.FORBIDDEN],
			['OWNER', AuthErrorCode.FORBIDDEN],
			['CREW', AuthErrorCode.FORBIDDEN],
		])('prevents %s from listing/searching/reading/updating an existing sales inquiry', async (identity, code) => {
			await post(sales, 'USER', { input: salesFields() });
			for (const query of [
				list('type:SALES'),
				list('type:SALES', false),
				list('email:"buyer@example.com"'),
				detail(),
				update('CONTACTED'),
			])
				expect((await post(query, identity)).errors?.[0].extensions.code).toBe(code);
			expect(f.model.find).not.toHaveBeenCalled();
			expect(f.model.findById).not.toHaveBeenCalled();
			expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
		});
		it('allows ADMIN sales filtering/detail/status changes while preserving discriminator and ownership', async () => {
			await post(sales, 'USER', { input: salesFields() });
			await post(charter, undefined, { input: input() });
			for (const page of [true, false]) {
				const response = await post(list('type:SALES', page), 'ADMIN');
				expect(response.errors).toBeUndefined();
				expect(response.data?.[page ? 'getYachtInquiriesPage' : 'getYachtInquiries']).toMatchObject({
					total: 1,
					page: 1,
					limit: 20,
					totalPages: 1,
					list: [expect.objectContaining({ type: 'SALES' })],
				});
			}
			expect((await post(detail(), 'ADMIN')).data?.getYachtInquiry.type).toBe('SALES');
			for (const status of ['CONTACTED', 'CLOSED', 'NEW'])
				expect((await post(update(status), 'ADMIN')).data?.updateYachtInquiry).toMatchObject({
					status,
					type: 'SALES',
					yachtId: inquiryTestId(14),
					memberId: inquiryTestId(1),
				});
		});
		it('rejects sales-to-charter status-update spoofing and retains history after Yacht deletion', async () => {
			await post(sales, undefined, { input: salesFields() });
			expect(
				(
					await post(
						`mutation { updateYachtInquiry(input:{_id:"${inquiryTestId(100)}",status:CLOSED,type:CHARTER}) { _id } }`,
						'ADMIN',
					)
				).errors,
			).toBeDefined();
			expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
			f.yachts.clear();
			expect((await post(detail(), 'ADMIN')).data?.getYachtInquiry.type).toBe('SALES');
		});
		it('sanitizes sales persistence failures and provides no public customer history API', async () => {
			f.model.create.mockRejectedValueOnce(new Error('private database details'));
			expect((await post(sales, undefined, { input: salesFields() })).errors).toEqual([
				{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
			]);
			expect((await post('{ getMySalesInquiries { total } }', 'USER')).errors).toBeDefined();
		});
	});

	it('keeps the canonical enums/output and Float-total wrapper while adding member/metadata/facade', async () => {
		type Introspection = {
			a: { fields: { name: string; type: { ofType: { name: string } | null } }[] };
			b: { inputFields: { name: string }[] };
			c: { enumValues: { name: string }[] };
			d: { enumValues: { name: string }[] };
		};
		const response = await post<Introspection>(
			'{ a:__type(name:"YachtInquiries") { fields { name type { ofType { name } } } } b:__type(name:"CreateCharterInquiryInput") { inputFields { name } } c:__type(name:"InquiryType") { enumValues { name } } d:__type(name:"InquiryStatus") { enumValues { name } } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data?.a.fields.find((field) => field.name === 'total')?.type.ofType?.name).toBe('Float');
		expect(response.data?.b.inputFields.map((field) => field.name)).not.toEqual(
			expect.arrayContaining(['type', 'status', 'memberId']),
		);
		expect(response.data?.c.enumValues.map((field) => field.name)).toEqual(['SALES', 'CHARTER']);
		expect(response.data?.d.enumValues.map((field) => field.name)).toEqual(['NEW', 'CONTACTED', 'CLOSED']);
	});
	it.each([10, 11])('creates a guest CHARTER/NEW inquiry for publicly visible eligible yacht %s', async (n) => {
		const response = await post(charter, undefined, {
			input: { ...input(), yachtId: inquiryTestId(n), phone: ' +998 (90) 123-45-67 ' },
		});
		expect(response.errors).toBeUndefined();
		expect(response.data?.submitCharterInquiry).toMatchObject({
			type: 'CHARTER',
			status: 'NEW',
			memberId: null,
			name: 'Alex Charter',
			email: 'alex@example.com',
			phone: '+998 (90) 123-45-67',
			guestCount: 4,
		});
		expect(f.records).toHaveLength(1);
	});
	it.each([12, 13, 14, 99])('rejects hidden/non-charter/missing yacht %s in both public mutations', async (n) => {
		for (const [query, extra] of [
			[charter, {}],
			[generic, { type: 'CHARTER' }],
		] as const)
			expect(
				(await post(query, undefined, { input: { ...input(), ...extra, yachtId: inquiryTestId(n) } })).errors,
			).toBeDefined();
		expect(f.records).toHaveLength(0);
	});
	it.each(Object.values(MemberRole))(
		'derives active %s member link while allowing independent inquiry contact',
		async (identity) => {
			for (const [query, extra] of [
				[charter, {}],
				[generic, { type: 'CHARTER' }],
			] as const) {
				const response = await post(query, identity, { input: { ...input(), ...extra } });
				expect(response.errors).toBeUndefined();
			}
			expect(f.records.every((row) => row.memberId?.toHexString() === inquiryTestId(1))).toBe(true);
			expect(f.records.every((row) => row.email === 'alex@example.com')).toBe(true);
		},
	);
	it.each([
		['INVALID', AuthErrorCode.INVALID_TOKEN],
		['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED', AuthErrorCode.ACCOUNT_DELETED],
	])('does not downgrade supplied %s credentials to guest', async (identity, code) => {
		for (const [query, extra] of [
			[charter, {}],
			[generic, { type: 'CHARTER' }],
		] as const)
			expect((await post(query, identity, { input: { ...input(), ...extra } })).errors?.[0].extensions.code).toBe(code);
		expect(f.records).toHaveLength(0);
	});
	it.each([{ memberId: inquiryTestId(2) }, { status: 'CLOSED' }, { type: 'SALES' }, { charterPrice: 100 }])(
		'rejects charter spoofed initial fields %j',
		async (patch) => {
			expect((await post(charter, 'USER', { input: { ...input(), ...patch } })).errors).toBeDefined();
			expect(f.records).toHaveLength(0);
		},
	);
	it.each([
		{ yachtId: 'bad' },
		{ name: ' ' },
		{ name: 'x'.repeat(121) },
		{ email: 'bad' },
		{ phone: 123 },
		{ phone: 'x'.repeat(41) },
		{ message: 'short' },
		{ message: 'x'.repeat(4001) },
		{ startDate: 'bad' },
		{ endDate: 'bad' },
		{ startDate: null },
		{ endDate: null },
		{ endDate: '2027-08-01T00:00:00Z' },
		{ endDate: '2027-07-31T00:00:00Z' },
		{ guestCount: 0 },
		{ guestCount: -1 },
		{ guestCount: 1.5 },
		{ guestCount: 9 },
	])('rejects invalid charter submission %j', async (patch) => {
		expect((await post(charter, undefined, { input: { ...input(), ...patch } })).errors).toBeDefined();
		expect(f.records).toHaveLength(0);
	});
	it.each([1, 8])('allows guest count %s including exact positive capacity', async (guestCount) => {
		expect((await post(charter, undefined, { input: { ...input(), guestCount } })).errors).toBeUndefined();
	});
	it('keeps phone and guestCount optional and preserves past-date policy', async () => {
		const { guestCount, ...contact } = input();
		void guestCount;
		expect(
			(
				await post(charter, undefined, {
					input: { ...contact, startDate: '2020-08-01T00:00:00Z', endDate: '2020-08-10T00:00:00Z' },
				})
			).errors,
		).toBeUndefined();
	});
	it('preserves legacy generic CHARTER input contract, rejecting missing dates without changing SALES', async () => {
		const { startDate, endDate, guestCount, ...contact } = input();
		void startDate;
		void endDate;
		void guestCount;
		expect((await post(generic, undefined, { input: { ...contact, type: 'CHARTER' } })).errors).toBeDefined();
		const sales = await post(generic, undefined, { input: { ...contact, type: 'SALES', yachtId: inquiryTestId(14) } });
		expect(sales.errors).toBeUndefined();
		expect(sales.data?.submitYachtInquiry).toMatchObject({
			type: 'SALES',
			status: 'NEW',
			startDate: null,
			endDate: null,
			guestCount: null,
		});
	});
	it('does not arbitrarily suppress legitimate repeat inquiries', async () => {
		expect((await post(charter, undefined, { input: input() })).errors).toBeUndefined();
		expect((await post(charter, undefined, { input: input() })).errors).toBeUndefined();
		expect(f.records).toHaveLength(2);
	});
	it.each([
		[undefined, AuthErrorCode.UNAUTHENTICATED],
		['USER', AuthErrorCode.FORBIDDEN],
		['OWNER', AuthErrorCode.FORBIDDEN],
		['CREW', AuthErrorCode.FORBIDDEN],
		['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED', AuthErrorCode.ACCOUNT_DELETED],
	])('prevents %s accessing any admin inquiry endpoint', async (identity, code) => {
		for (const query of [list(), list('', false), detail(), update('CONTACTED')])
			expect((await post(query, identity)).errors?.[0].extensions.code).toBe(code);
		expect(f.model.find).not.toHaveBeenCalled();
		expect(f.model.findById).not.toHaveBeenCalled();
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('allows ADMIN list/detail and all simple status transitions, preserving ownership/type/dates', async () => {
		await post(charter, 'USER', { input: input() });
		expect((await post(detail(), 'ADMIN')).data?.getYachtInquiry.memberId).toBe(inquiryTestId(1));
		for (const status of ['CONTACTED', 'CLOSED', 'NEW', 'CLOSED']) {
			const response = await post(update(status), 'ADMIN');
			expect(response.errors).toBeUndefined();
			expect(response.data?.updateYachtInquiry).toMatchObject({
				status,
				type: 'CHARTER',
				memberId: inquiryTestId(1),
				yachtId: inquiryTestId(10),
			});
		}
		expect((await post(list(), 'ADMIN')).data?.getYachtInquiriesPage.total).toBe(1);
	});
	it.each(['type:SALES', `memberId:"${inquiryTestId(2)}"`, `yachtId:"${inquiryTestId(14)}"`])(
		'rejects broad admin ownership/discriminator edit %s',
		async (field) => {
			expect(
				(
					await post(
						`mutation { updateYachtInquiry(input:{_id:"${inquiryTestId(100)}",status:CONTACTED,${field}}) { _id } }`,
						'ADMIN',
					)
				).errors,
			).toBeDefined();
			expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
		},
	);
	it('filters CHARTER/SALES separately while retaining legacy list semantics and Float total', async () => {
		await post(charter, 'USER', { input: input() });
		await post(generic, undefined, { input: { ...input(), type: 'SALES', yachtId: inquiryTestId(14) } });
		for (const type of ['SALES', 'CHARTER']) {
			const result = await post(list(`type:${type}`), 'ADMIN');
			expect(result.errors).toBeUndefined();
			expect(result.data?.getYachtInquiriesPage.total).toBe(1);
			expect(result.data?.getYachtInquiriesPage.list[0].type).toBe(type);
		}
		expect((await post(list('limit:80', false), 'ADMIN')).data?.getYachtInquiries.limit).toBe(80);
		expect((await post(list('limit:200', false), 'ADMIN')).data?.getYachtInquiries.limit).toBe(100);
	});
	it.each([
		`status:NEW`,
		`yachtId:"${inquiryTestId(10)}"`,
		`memberId:"${inquiryTestId(1)}"`,
		'email:" ALEX@EXAMPLE.COM "',
		'createdFrom:"2026-10-06T00:00:00Z",createdTo:"2026-10-06T00:00:00Z"',
	])('applies admin filter %s at persistence boundary', async (filter) => {
		await post(charter, 'USER', { input: input() });
		f.records[0].createdAt = new Date('2026-10-06T00:00:00Z');
		expect((await post(list(filter), 'ADMIN')).data?.getYachtInquiriesPage.total).toBe(1);
	});
	it('returns default/capped metadata and stable pages without in-memory service pagination', async () => {
		await post(charter, undefined, { input: input() });
		await post(charter, undefined, { input: input() });
		f.records.forEach((row) => (row.createdAt = new Date('2026-10-06')));
		expect((await post(list(), 'ADMIN')).data?.getYachtInquiriesPage).toMatchObject({
			total: 2,
			page: 1,
			limit: 20,
			totalPages: 1,
		});
		expect((await post(list('page:2,limit:1'), 'ADMIN')).data?.getYachtInquiriesPage.list[0]._id).toBe(
			inquiryTestId(100),
		);
		expect((await post(list('page:3,limit:1'), 'ADMIN')).data?.getYachtInquiriesPage).toMatchObject({
			total: 2,
			list: [],
		});
		expect((await post(list('limit:50'), 'ADMIN')).data?.getYachtInquiriesPage.limit).toBe(50);
	});
	it.each([
		'page:0',
		'limit:0',
		'limit:51',
		'page:1.5',
		'limit:1.5',
		'yachtId:"bad"',
		'memberId:"bad"',
		'email:"bad"',
		'type:SALE',
		'status:BOOKED',
		'createdFrom:"bad"',
		'createdFrom:"2026-10-07",createdTo:"2026-10-06"',
	])('rejects invalid admin catalog %s', async (filter) => {
		expect((await post(list(filter), 'ADMIN')).errors).toBeDefined();
		expect(f.model.find).not.toHaveBeenCalled();
	});
	it('does not expose getMyInquiries, public email inquiry lists or nested account identity', async () => {
		expect((await post('{ getMyInquiries { total } }', 'USER')).errors).toBeDefined();
		expect((await post(list('email:"alex@example.com"'), 'USER')).errors?.[0].extensions.code).toBe(
			AuthErrorCode.FORBIDDEN,
		);
	});
	it('keeps admin detail readable after Yacht is deleted and sanitizes missing records/internal failures', async () => {
		await post(charter, undefined, { input: input() });
		f.yachts.clear();
		expect((await post(detail(), 'ADMIN')).errors).toBeUndefined();
		expect((await post(detail(inquiryTestId(99)), 'ADMIN')).errors?.[0].message).toBe('Internal server error');
		// Listing failure validates the shared formatter without touching contact data.
		f.model.countDocuments.mockRejectedValueOnce(new Error('private persistence details'));
		expect((await post(list(), 'ADMIN')).errors).toEqual([
			{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
		]);
	});
});
