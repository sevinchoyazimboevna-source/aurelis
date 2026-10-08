import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { WishlistResolver } from '../src/components/wishlist/wishlist.resolver';
import { WishlistService } from '../src/components/wishlist/wishlist.service';
import { testId, testMember, wishlistFixture } from '../src/components/wishlist/wishlist-test-fixture';
import { AuthService } from '../src/components/auth/auth.service';
import type { AuthRequest } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';
import { MemberRole } from '../src/libs/enums/member.enum';
import { YachtStatus } from '../src/libs/enums/yacht.enum';

type Item = { _id: string; yachtId: string; createdAt: string; updatedAt: string };
type Collection = { list: Item[]; total: number; page: number; limit: number; totalPages: number };
type Data = {
	getMyWishlist: Collection;
	addYachtToWishlist: Item;
	removeYachtFromWishlist: boolean;
	toggleYachtWishlist: { yachtId: string; wishlisted: boolean };
	isYachtWishlisted: boolean;
};
type Response<T = Data> = { data: T | null; errors?: { message: string; extensions: { code: string } }[] };

describe('Wishlist GraphQL (offline HTTP e2e)', () => {
	let app: INestApplication;
	let f: ReturnType<typeof wishlistFixture>;
	const fields = '_id yachtId createdAt updatedAt';
	const add = (id = testId(10)) => `mutation { addYachtToWishlist(yachtId:"${id}") { ${fields} } }`;
	const remove = (id = testId(10)) => `mutation { removeYachtFromWishlist(yachtId:"${id}") }`;
	const toggle = (id = testId(10)) => `mutation { toggleYachtWishlist(yachtId:"${id}") { yachtId wishlisted } }`;
	const isSaved = (id = testId(10)) => `{ isYachtWishlisted(yachtId:"${id}") }`;
	const list = (input = '') =>
		`{ getMyWishlist${input ? `(input:{${input}})` : ''} { list { ${fields} } total page limit totalPages } }`;
	const post = async <T = Data>(query: string, identity?: string): Promise<Response<T>> => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (identity) req.set('Authorization', `Bearer ${identity}`);
		const response = await req.send({ query });
		return response.body as Response<T>;
	};
	beforeEach(async () => {
		f = wishlistFixture();
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				WishlistResolver,
				WishlistService,
				AuthGuard,
				{ provide: getModelToken('WishlistItem'), useValue: f.model },
				{ provide: getModelToken('Yacht'), useValue: f.yachtModel },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: (req: AuthRequest) => {
							const identity = req.headers.authorization?.replace('Bearer ', '');
							if (!identity) throw authError(AuthErrorCode.UNAUTHENTICATED);
							if (identity === 'BLOCKED') throw authError(AuthErrorCode.ACCOUNT_BLOCKED);
							if (identity === 'DELETED') throw authError(AuthErrorCode.ACCOUNT_DELETED);
							const role =
								identity === 'B'
									? MemberRole.USER
									: Object.values(MemberRole).find((value) => value.toString() === identity);
							if (!role) throw authError(AuthErrorCode.UNAUTHENTICATED);
							req.authMember = testMember(identity === 'B' ? 2 : 1, role);
							return Promise.resolve(req.authMember);
						},
					},
				},
			],
		}).compile();
		app = module.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(
			new ValidationPipe({
				transform: true,
				whitelist: true,
				forbidNonWhitelisted: true,
				validationError: { target: false, value: false },
			}),
		);
		await app.init();
	});
	afterEach(async () => app.close());

	it.each([
		[undefined, AuthErrorCode.UNAUTHENTICATED],
		['BLOCKED', AuthErrorCode.ACCOUNT_BLOCKED],
		['DELETED', AuthErrorCode.ACCOUNT_DELETED],
	])('rejects %s for all personal operations through shared auth', async (identity, code) => {
		for (const query of [list(), add(), remove(), toggle(), isSaved()]) {
			const response = await post(query, identity);
			expect(response.errors?.[0].extensions.code).toBe(code);
		}
		expect(f.items()).toHaveLength(0);
		expect(f.model.aggregate).not.toHaveBeenCalled();
		expect(f.yachtModel.exists).not.toHaveBeenCalled();
	});
	it.each(Object.values(MemberRole))('permits active %s for all personal operations', async (identity) => {
		const added = await post(add(), identity);
		expect(added.errors).toBeUndefined();
		expect(added.data?.addYachtToWishlist.yachtId).toBe(testId(10));
		expect((await post(isSaved(), identity)).data?.isYachtWishlisted).toBe(true);
		expect((await post(list(), identity)).data?.getMyWishlist.total).toBe(1);
		expect((await post(toggle(), identity)).data?.toggleYachtWishlist.wishlisted).toBe(false);
		expect((await post(toggle(), identity)).data?.toggleYachtWishlist.wishlisted).toBe(true);
		expect((await post(remove(), identity)).data?.removeYachtFromWishlist).toBe(true);
		expect((await post(remove(), identity)).data?.removeYachtFromWishlist).toBe(false);
	});
	it('exposes relation IDs/timestamps and Int-total wrapper without member metadata/nested Yacht', async () => {
		type Introspection = {
			a: { fields: { name: string }[] };
			b: { fields: { name: string; type: { ofType: { name: string } | null } }[] };
			c: { inputFields: { name: string }[] };
		};
		const response = await post<Introspection>(
			'{ a:__type(name:"WishlistItem") { fields { name } } b:__type(name:"WishlistItems") { fields { name type { ofType { name } } } } c:__type(name:"WishlistCatalogInput") { inputFields { name } } }',
		);
		expect(response.errors).toBeUndefined();
		expect(response.data?.a.fields.map((field) => field.name).sort()).toEqual([
			'_id',
			'createdAt',
			'updatedAt',
			'yachtId',
		]);
		expect(response.data?.b.fields.find((field) => field.name === 'total')?.type.ofType?.name).toBe('Int');
		expect(response.data?.c.inputFields.map((field) => field.name).sort()).toEqual(['limit', 'page']);
	});
	it('isolates members including ADMIN, with independent saves and explicit owner removal', async () => {
		await post(add(), 'USER');
		expect((await post(isSaved(), 'B')).data?.isYachtWishlisted).toBe(false);
		expect((await post(list(), 'B')).data?.getMyWishlist.total).toBe(0);
		expect((await post(remove(), 'B')).data?.removeYachtFromWishlist).toBe(false);
		await post(add(), 'B');
		await post(add(testId(11)), 'ADMIN');
		expect(f.items()).toHaveLength(3);
		expect((await post(list(), 'B')).data?.getMyWishlist.total).toBe(1);
		await post(remove(), 'ADMIN');
		expect((await post(isSaved(), 'B')).data?.isYachtWishlisted).toBe(true);
	});
	it.each([`memberId:"${testId(2)}"`, `filter:{memberId:"${testId(2)}"}`, 'sortBy:NEWEST'])(
		'rejects undeclared catalog input %s',
		async (input) => {
			expect((await post(list(input), 'ADMIN')).errors?.[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
			expect(f.model.aggregate).not.toHaveBeenCalled();
		},
	);
	it('does not accept a memberId mutation argument or expose admin-wide operations', async () => {
		for (const query of [
			`mutation { addYachtToWishlist(yachtId:"${testId(10)}",memberId:"${testId(2)}") { yachtId } }`,
			'{ getAllWishlists { total } }',
			`{ getWishlistForMember(memberId:"${testId(2)}") { total } }`,
		])
			expect((await post(query, 'ADMIN')).errors?.[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
	});
	it('duplicate/concurrent adds preserve one relation and original timestamps', async () => {
		const responses = await Promise.all([post(add(), 'USER'), post(add(), 'USER')]);
		expect(responses[0].errors).toBeUndefined();
		expect(responses[1].errors).toBeUndefined();
		expect(responses[0].data?.addYachtToWishlist).toEqual(responses[1].data?.addYachtToWishlist);
		expect(f.items()).toHaveLength(1);
	});
	it.each([testId(12), testId(13), testId(99)])(
		'rejects new hidden/missing save and saved-state query for %s',
		async (id) => {
			for (const query of [add(id), toggle(id), isSaved(id)]) {
				const response = await post(query, 'USER');
				expect(response.errors).toEqual([
					{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
				]);
			}
			expect(f.items()).toHaveLength(0);
		},
	);
	it.each(['invalid', '123456789012', '', 'x'.repeat(24)])(
		'rejects invalid yacht ID %s before persistence',
		async (id) => {
			for (const query of [add(id), remove(id), toggle(id), isSaved(id)])
				expect((await post(query, 'USER')).errors?.[0].extensions.code).toBe('BAD_REQUEST');
			expect(f.yachtModel.exists).not.toHaveBeenCalled();
			expect(f.model.findOneAndDelete).not.toHaveBeenCalled();
		},
	);
	it.each([YachtStatus.DRAFT, YachtStatus.ARCHIVED])(
		'retains saves when yacht becomes %s, hides them and reveals on republication',
		async (status) => {
			await post(add(), 'USER');
			f.yachts.set(testId(10), status);
			expect((await post(list(), 'USER')).data?.getMyWishlist).toEqual({
				list: [],
				total: 0,
				page: 1,
				limit: 20,
				totalPages: 0,
			});
			expect(f.items()).toHaveLength(1);
			f.yachts.set(testId(10), YachtStatus.PUBLISHED);
			expect((await post(list(), 'USER')).data?.getMyWishlist.total).toBe(1);
			expect(f.model.deleteOne).not.toHaveBeenCalled();
		},
	);
	it('excludes broken references without deletion or null output, while allowing explicit removal', async () => {
		await post(add(), 'USER');
		f.yachts.delete(testId(10));
		expect((await post(list(), 'USER')).data?.getMyWishlist.total).toBe(0);
		expect(f.items()).toHaveLength(1);
		expect((await post(remove(), 'USER')).data?.removeYachtFromWishlist).toBe(true);
	});
	it('can toggle off a hidden saved relation but cannot toggle it back on', async () => {
		await post(add(), 'USER');
		f.yachts.set(testId(10), YachtStatus.DRAFT);
		expect((await post(toggle(), 'USER')).data?.toggleYachtWishlist).toEqual({
			yachtId: testId(10),
			wishlisted: false,
		});
		expect((await post(toggle(), 'USER')).errors).toBeDefined();
	});
	it('paginates and counts visible saves only, newest-first with deterministic ID ties', async () => {
		f.seed(1, 10, 100);
		f.seed(1, 11, 101);
		f.seed(1, 12, 102);
		f.seed(1, 99, 103);
		f.seed(2, 10, 104);
		const result = await post(list('page:2,limit:1'), 'USER');
		expect(result.errors).toBeUndefined();
		expect(result.data?.getMyWishlist).toMatchObject({ total: 2, page: 2, limit: 1, totalPages: 2 });
		expect(result.data?.getMyWishlist.list[0]._id).toBe(testId(100));
		expect((await post(list('page:1,limit:1'), 'USER')).data?.getMyWishlist.list[0]._id).toBe(testId(101));
		expect((await post(list('limit:50'), 'USER')).data?.getMyWishlist.limit).toBe(50);
		expect((await post(list('page:3,limit:1'), 'USER')).data?.getMyWishlist).toMatchObject({ total: 2, list: [] });
	});
	it.each(['page:0', 'page:-1', 'page:1.5', 'limit:0', 'limit:51', 'limit:1.5'])(
		'rejects pagination %s before queries',
		async (input) => {
			expect((await post(list(input), 'USER')).errors).toBeDefined();
			expect(f.model.aggregate).not.toHaveBeenCalled();
		},
	);
	it('uses the shared formatter for internal failures without database/path/stack exposure', async () => {
		f.model.aggregate.mockRejectedValueOnce(new Error('private database and filesystem details'));
		expect((await post(list(), 'USER')).errors).toEqual([
			{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
		]);
	});
});
