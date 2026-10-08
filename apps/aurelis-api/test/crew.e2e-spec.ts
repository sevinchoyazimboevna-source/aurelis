import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { CrewResolver } from '../src/components/crew/crew.resolver';
import { CrewService } from '../src/components/crew/crew.service';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { RolesGuard } from '../src/components/auth/guards/roles.guard';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';
import { YachtResolver } from '../src/components/yacht/yacht.resolver';
import { YachtService } from '../src/components/yacht/yacht.service';
import { BrokerService } from '../src/components/broker/broker.service';

// Real GraphQL, Crew service and STEP 2 guards; deterministic mocked persistence.
// MongoDB aggregation execution and unique-index enforcement are not simulated integration guarantees.
describe('Crew GraphQL contracts and authorization (e2e)', () => {
	let app: INestApplication;
	let records: any[];
	const id = (number: number) => number.toString(16).padStart(24, '0');
	const linkedMember = id(100);
	const memberRecords = [
		{ _id: linkedMember, role: 'CREW', password: 'private-password', googleId: 'private-google' },
		{ _id: id(101), role: 'USER' },
		{ _id: id(102), role: 'ADMIN' },
	];
	const matches = (record, match) =>
		Object.entries(match).every(([field, value]: [string, any]) => {
			const actual = record[field];
			if (value instanceof RegExp)
				return Array.isArray(actual)
					? actual.some((item) => value.test(item))
					: typeof actual === 'string' && value.test(actual);
			if (value && typeof value === 'object') {
				if ('$ne' in value) return actual !== value.$ne;
				return (value.$gte === undefined || actual >= value.$gte) && (value.$lte === undefined || actual <= value.$lte);
			}
			return actual === value;
		});
	const model = {
		aggregate: jest.fn(async (pipeline) => {
			const match = pipeline[0].$match;
			const eligible = records.filter((record) => matches(record, match)).map((record) => ({ ...record }));
			if (pipeline.some((stage) => stage.$set))
				for (const profile of eligible)
					profile._crewSortName =
						profile.displayName ?? [profile.firstName, profile.lastName].filter(Boolean).join(' ');
			const sort = pipeline.find((stage) => stage.$sort).$sort;
			eligible.sort((a, b) => {
				for (const [field, direction] of Object.entries(sort)) {
					if (a[field] < b[field]) return -Number(direction);
					if (a[field] > b[field]) return Number(direction);
				}
				return 0;
			});
			const stages = pipeline.find((stage) => stage.$facet).$facet.list;
			const list = eligible
				.slice(stages[0].$skip, stages[0].$skip + stages[1].$limit)
				.map(({ _crewSortName, ...profile }) => profile);
			return [{ list, meta: [{ total: eligible.length }] }];
		}),
		findOne: jest.fn((match) => ({
			lean: () => ({ exec: async () => records.find((record) => matches(record, match)) ?? null }),
		})),
		exists: jest.fn(async (match) => {
			const record = records.find((record) => matches(record, match));
			return record ? { _id: record._id } : null;
		}),
		create: jest.fn(async (fields) => {
			const record = {
				_id: id(20 + records.length),
				languages: [],
				images: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				...fields,
			};
			records.push(record);
			return record;
		}),
		findByIdAndUpdate: jest.fn((profileId, update) => ({
			exec: async () => {
				const record = records.find((record) => record._id === profileId);
				if (!record) return null;
				Object.assign(record, update.$set);
				return record;
			},
		})),
	};
	const members = {
		exists: jest.fn(async (match) => {
			const member = memberRecords.find((member) => member._id === match._id);
			return member ? { _id: member._id } : null;
		}),
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
				CrewResolver,
				CrewService,
				AuthGuard,
				RolesGuard,
				YachtResolver,
				{ provide: getModelToken('CrewProfile'), useValue: model },
				{ provide: getModelToken('Member'), useValue: members },
				{ provide: YachtService, useValue: {} },
				{ provide: BrokerService, useValue: {} },
				{
					provide: AuthService,
					useValue: {
						authenticateRequest: async (req) => {
							if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
							req.authMember = { role: req.headers.authorization.replace('Bearer ', ''), status: 'ACTIVE' };
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
			languages: ['English', 'French'],
			images: [],
			featured: true,
			nationality: 'French',
			location: 'Cannes',
			bio: 'Biography',
			createdAt: new Date('2026-06-03'),
			updatedAt: new Date('2026-06-03'),
		};
		records = [
			{
				...base,
				_id: id(1),
				memberId: linkedMember,
				firstName: 'Alice',
				lastName: 'Able',
				role: 'CAPTAIN',
				status: 'PUBLISHED',
				experienceYears: 12,
			},
			{
				...base,
				_id: id(2),
				firstName: 'Ben',
				role: 'CHEF',
				status: 'PUBLISHED',
				experienceYears: 3,
				featured: false,
				displayName: 'Chef B',
				createdAt: new Date('2026-06-01'),
			},
			{ ...base, _id: id(3), firstName: 'Draft Captain', role: 'CAPTAIN', status: 'DRAFT', experienceYears: 20 },
			{ ...base, _id: id(4), firstName: 'Archived Captain', role: 'CAPTAIN', status: 'ARCHIVED', experienceYears: 25 },
			{ ...base, _id: id(5), firstName: 'Draft Chef', role: 'CHEF', status: 'DRAFT', experienceYears: 15 },
			{ ...base, _id: id(6), firstName: 'Archived Chef', role: 'CHEF', status: 'ARCHIVED', experienceYears: 18 },
			{
				...base,
				_id: id(7),
				firstName: 'Cara',
				role: 'CHEF',
				status: 'PUBLISHED',
				experienceYears: 3,
				nationality: 'Italian',
				location: 'Antibes',
				languages: ['French', 'Italian'],
				createdAt: new Date('2026-06-02'),
			},
		];
	});
	it('publishes the new profile and Int collection contract without sensitive member fields', async () => {
		const response = await post(
			'{ profile: __type(name: "CrewProfile") { fields { name } } wrapper: __type(name: "Crews") { fields { name type { kind name ofType { name } } } } roles: __type(name: "CrewRole") { enumValues { name } } statuses: __type(name: "CrewStatus") { enumValues { name } } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.profile.fields.map((field) => field.name)).toEqual([
			'_id',
			'memberId',
			'role',
			'status',
			'firstName',
			'lastName',
			'displayName',
			'nationality',
			'location',
			'bio',
			'experienceYears',
			'languages',
			'profileImage',
			'images',
			'featured',
			'createdAt',
			'updatedAt',
		]);
		expect(response.body.data.wrapper.fields.map((field) => field.name)).toEqual([
			'list',
			'total',
			'page',
			'limit',
			'totalPages',
		]);
		expect(response.body.data.wrapper.fields.find((field) => field.name === 'total').type).toMatchObject({
			kind: 'NON_NULL',
			ofType: { name: 'Int' },
		});
		expect(response.body.data.roles.enumValues.map((value) => value.name)).toEqual(['CAPTAIN', 'CHEF']);
		expect(response.body.data.statuses.enumValues.map((value) => value.name)).toEqual([
			'DRAFT',
			'PUBLISHED',
			'ARCHIVED',
		]);
	});
	it('leaves existing Yacht contracts intact in the same GraphQL schema', async () => {
		const response = await post(
			'{ yacht: __type(name: "Yacht") { fields(includeDeprecated: true) { name } } wrapper: __type(name: "Yachts") { fields { name type { name ofType { name } } } } mode: __type(name: "YachtListingMode") { enumValues { name } } query: __type(name: "Query") { fields { name type { ofType { name } } } } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.yacht.fields.map((field) => field.name)).toEqual(
			expect.arrayContaining(['crew', 'charterRate', 'charterPrice']),
		);
		expect(response.body.data.wrapper.fields.find((field) => field.name === 'total').type.ofType.name).toBe('Float');
		expect(response.body.data.mode.enumValues.map((value) => value.name)).toEqual(['SALE', 'CHARTER']);
		for (const name of ['getYachts', 'getFeaturedYachts', 'getYachtsForStaff'])
			expect(response.body.data.query.fields.find((field) => field.name === name).type.ofType.name).toBe('Yachts');
	});
	it.each(['DRAFT', 'ARCHIVED', 'PUBLISHED'])('forces public publication despite requested %s', async (status) => {
		const response = await post(
			`{ getCrews(input: { filter: { status: ${status} } }) { list { firstName status displayName memberId } total page limit totalPages } }`,
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getCrews).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
		expect(response.body.data.getCrews.list.map((profile) => profile.status)).toEqual([
			'PUBLISHED',
			'PUBLISHED',
			'PUBLISHED',
		]);
		expect(response.body.data.getCrews.list[0]).toMatchObject({ displayName: 'Alice Able', memberId: linkedMember });
		expect(JSON.stringify(response.body)).not.toMatch(/password|googleId|jwt|accessToken/);
	});
	it.each([
		['CAPTAIN', ['Alice']],
		['CHEF', ['Cara', 'Ben']],
	])('filters professional role %s', async (role, names) => {
		const response = await post(`{ getCrews(input: { filter: { role: ${role} } }) { list { firstName } total } }`);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getCrews.list.map((profile) => profile.firstName)).toEqual(names);
	});
	it.each([
		['nationality: "french"', ['Alice', 'Ben']],
		['location: "annes"', ['Alice', 'Ben']],
		['language: "english"', ['Alice', 'Ben']],
		['featured: false', ['Ben']],
		['minExperienceYears: 3, maxExperienceYears: 3', ['Cara', 'Ben']],
		['nationality: "Italian", language: "French", minExperienceYears: 0, featured: true', ['Cara']],
	])('applies filter %s', async (filter, names) => {
		const response = await post(`{ getCrews(input: { filter: { ${filter} } }) { list { firstName } total } }`);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getCrews.list.map((profile) => profile.firstName)).toEqual(names);
	});
	it.each([
		['NEWEST', ['Alice', 'Cara', 'Ben']],
		['EXPERIENCE_ASC', ['Cara', 'Ben', 'Alice']],
		['EXPERIENCE_DESC', ['Alice', 'Cara', 'Ben']],
		['NAME_ASC', ['Alice', 'Cara', 'Ben']],
		['NAME_DESC', ['Ben', 'Cara', 'Alice']],
	])('sorts %s with stable ties and presentation names', async (sortBy, names) => {
		const response = await post(`{ getCrews(input: { sortBy: ${sortBy} }) { list { firstName displayName } } }`);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getCrews.list.map((profile) => profile.firstName)).toEqual(names);
	});
	it('supports page 2 and out-of-range pages without losing the eligible total', async () => {
		const page2 = await post(
			'{ getCrews(input: { page: 2, limit: 2 }) { list { firstName } total page limit totalPages } }',
		);
		expect(page2.body.data.getCrews).toEqual({
			list: [{ firstName: 'Ben' }],
			total: 3,
			page: 2,
			limit: 2,
			totalPages: 2,
		});
		const empty = await post('{ getCrews(input: { page: 20, limit: 2 }) { list { _id } total totalPages } }');
		expect(empty.body.data.getCrews).toEqual({ list: [], total: 3, totalPages: 2 });
	});
	it('allows maximum limit 50 and returns correct zero-match metadata', async () => {
		const max = await post('{ getCrews(input: { limit: 50 }) { total limit } }');
		expect(max.body.data.getCrews).toEqual({ total: 3, limit: 50 });
		const empty = await post(
			'{ getCrews(input: { filter: { nationality: "Unknown" } }) { list { _id } total totalPages } }',
		);
		expect(empty.body.data.getCrews).toEqual({ list: [], total: 0, totalPages: 0 });
	});
	it('features only published profiles and forces featured=true', async () => {
		const response = await post(
			'{ getFeaturedCrews(input: { filter: { status: DRAFT, featured: false } }) { list { firstName status featured } total } }',
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getFeaturedCrews).toEqual({
			list: [
				{ firstName: 'Alice', status: 'PUBLISHED', featured: true },
				{ firstName: 'Cara', status: 'PUBLISHED', featured: true },
			],
			total: 2,
		});
		const defaults = await post('{ getFeaturedCrews { total page limit } }');
		expect(defaults.body.data.getFeaturedCrews).toEqual({ total: 2, page: 1, limit: 20 });
	});
	it.each([3, 4, 5, 6, 90])('hides unpublished or missing detail ID %s', async (number) => {
		const response = await post(`{ getCrew(id: "${id(number)}") { _id } }`);
		expect(response.body.errors[0].message).toBe('Internal server error');
		expect(response.body.data).toBeNull();
	});
	it('serves a public detail with derived name and simple image fields', async () => {
		const response = await post(
			`{ getCrew(id: "${id(1)}") { firstName displayName experienceYears languages profileImage images } }`,
		);
		expect(response.body.data.getCrew).toEqual({
			firstName: 'Alice',
			displayName: 'Alice Able',
			experienceYears: 12,
			languages: ['English', 'French'],
			profileImage: null,
			images: [],
		});
	});
	it.each(['USER', 'OWNER', 'CREW', undefined])('protects all ADMIN operations from %s', async (role) => {
		for (const query of [
			'{ getCrewsForStaff(input: {}) { total } }',
			'mutation { createCrewProfile(input: { firstName: "New", role: CAPTAIN }) { _id } }',
			`mutation { updateCrewProfile(input: { _id: "${id(1)}", bio: "Update" }) { _id } }`,
		]) {
			const response = await post(query, role);
			expect(response.body.errors[0].extensions.code).toBe(role ? 'AUTH_FORBIDDEN' : 'AUTH_UNAUTHENTICATED');
		}
		expect(model.aggregate).not.toHaveBeenCalled();
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('allows ADMIN reads across all statuses with shared filters', async () => {
		const all = await post('{ getCrewsForStaff(input: {}) { total } }', 'ADMIN');
		expect(all.body.data.getCrewsForStaff.total).toBe(7);
		const drafts = await post(
			'{ getCrewsForStaff(input: { filter: { status: DRAFT, role: CHEF } }) { list { firstName status } total } }',
			'ADMIN',
		);
		expect(drafts.body.data.getCrewsForStaff).toEqual({
			list: [{ firstName: 'Draft Chef', status: 'DRAFT' }],
			total: 1,
		});
	});
	it.each(['CAPTAIN', 'CHEF'])(
		'allows ADMIN to create %s as a featured draft without a member account',
		async (role) => {
			const response = await post(
				`mutation { createCrewProfile(input: { firstName: " New ", lastName: " Profile ", role: ${role}, featured: true, languages: [" English "] }) { firstName lastName displayName role status featured memberId languages } }`,
				'ADMIN',
			);
			expect(response.body.errors).toBeUndefined();
			expect(response.body.data.createCrewProfile).toEqual({
				firstName: 'New',
				lastName: 'Profile',
				displayName: 'New Profile',
				role,
				status: 'DRAFT',
				featured: true,
				memberId: null,
				languages: ['English'],
			});
			expect(model.create.mock.calls[0][0]).not.toHaveProperty('displayName');
			expect(members.exists).not.toHaveBeenCalled();
		},
	);
	it('preserves omitted fields in a partial update and archives through status only', async () => {
		const update = await post(
			`mutation { updateCrewProfile(input: { _id: "${id(1)}", bio: "New bio" }) { role firstName featured experienceYears memberId bio } }`,
			'ADMIN',
		);
		expect(update.body.errors).toBeUndefined();
		expect(update.body.data.updateCrewProfile).toEqual({
			role: 'CAPTAIN',
			firstName: 'Alice',
			featured: true,
			experienceYears: 12,
			memberId: linkedMember,
			bio: 'New bio',
		});
		expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({ $set: { bio: 'New bio' } });
		const archive = await post(
			`mutation { updateCrewProfile(input: { _id: "${id(1)}", status: ARCHIVED }) { status } }`,
			'ADMIN',
		);
		expect(archive.body.data.updateCrewProfile.status).toBe('ARCHIVED');
		expect(records).toHaveLength(7);
		const hidden = await post(`{ getCrew(id: "${id(1)}") { _id } }`);
		expect(hidden.body.errors[0].message).toBe('Internal server error');
	});
	it.each(['CREW', 'USER', 'ADMIN'])(
		'permits an ADMIN-curated link to an existing %s member without changing the role',
		async (memberRole) => {
			const member = memberRecords.find((member) => member.role === memberRole)!;
			// The existing CREW member is already linked, so use update for that case.
			const query =
				memberRole === 'CREW'
					? `mutation { updateCrewProfile(input: { _id: "${id(1)}", memberId: "${member._id}" }) { memberId } }`
					: `mutation { createCrewProfile(input: { firstName: "New", role: CHEF, memberId: "${member._id}" }) { memberId } }`;
			const response = await post(query, 'ADMIN');
			expect(response.body.errors).toBeUndefined();
			expect(member.role).toBe(memberRole);
			expect(members.exists).toHaveBeenCalledWith({ _id: member._id });
		},
	);
	it('rejects nonexistent linked members and duplicates without exposing database internals', async () => {
		const missing = await post(
			`mutation { createCrewProfile(input: { firstName: "New", role: CHEF, memberId: "${id(999)}" }) { _id } }`,
			'ADMIN',
		);
		expect(missing.body.errors[0].message).toBe('Linked member not found');
		const duplicate = await post(
			`mutation { createCrewProfile(input: { firstName: "New", role: CHEF, memberId: "${linkedMember}" }) { _id } }`,
			'ADMIN',
		);
		expect(duplicate.body.errors[0].message).toBe('A crew profile already exists for this member');
		expect(model.create).not.toHaveBeenCalled();
	});
	it('reports unique-index races as normal relationship validation errors', async () => {
		const error = { code: 11000, message: 'internal duplicate key details' };
		model.create.mockRejectedValueOnce(error);
		const create = await post(
			`mutation { createCrewProfile(input: { firstName: "New", role: CHEF, memberId: "${id(101)}" }) { _id } }`,
			'ADMIN',
		);
		expect(create.body.errors[0].message).toBe('A crew profile already exists for this member');
		expect(create.body.errors[0].extensions.code).not.toMatch(/^AUTH_/);
		model.findByIdAndUpdate.mockImplementationOnce(() => ({
			exec: async () => {
				throw error;
			},
		}));
		const update = await post(
			`mutation { updateCrewProfile(input: { _id: "${id(2)}", memberId: "${id(101)}" }) { _id } }`,
			'ADMIN',
		);
		expect(update.body.errors[0].message).toBe('A crew profile already exists for this member');
		expect(JSON.stringify([create.body, update.body])).not.toContain('duplicate key');
	});
	it('suppresses unexpected database details in public errors', async () => {
		model.aggregate.mockRejectedValueOnce(new Error('sensitive-database-details/internal-path'));
		const response = await post('{ getCrews(input: {}) { total } }');
		expect(response.body.errors[0].message).toBe('Internal server error');
		expect(JSON.stringify(response.body)).not.toMatch(/sensitive-database|internal-path|stacktrace/);
	});
	it.each([
		'page: 0',
		'limit: 0',
		'limit: 51',
		'filter: { minExperienceYears: -1 }',
		'filter: { minExperienceYears: 10, maxExperienceYears: 2 }',
		'filter: { role: ENGINEER }',
	])('rejects invalid public input %s with non-auth validation', async (input) => {
		const response = await post(`{ getCrews(input: { ${input} }) { total } }`);
		expect(response.body.errors).toBeDefined();
		expect(response.body.errors[0].extensions.code).not.toMatch(/^AUTH_/);
		expect(model.aggregate).not.toHaveBeenCalled();
	});
	it.each(['experienceYears: -1', 'firstName: "   "', 'memberId: "invalid"', 'role: ENGINEER', 'languages: [" "]'])(
		'rejects invalid ADMIN writes %s',
		async (input) => {
			const fields = input.startsWith('firstName:')
				? `${input}, role: CHEF`
				: input.startsWith('role:')
					? `firstName: "New", ${input}`
					: `firstName: "New", role: CHEF, ${input}`;
			const response = await post(`mutation { createCrewProfile(input: { ${fields} }) { _id } }`, 'ADMIN');
			expect(response.body.errors).toBeDefined();
			expect(response.body.errors[0].extensions.code).not.toMatch(/^AUTH_/);
			expect(model.create).not.toHaveBeenCalled();
		},
	);
	it('handles missing required create fields and invalid public detail IDs', async () => {
		const missing = await post('mutation { createCrewProfile(input: { role: CHEF }) { _id } }', 'ADMIN');
		expect(missing.body.errors).toBeDefined();
		const invalid = await post('{ getCrew(id: "invalid") { _id } }');
		expect(invalid.body.errors[0].message).toBe('Invalid crew profile ID');
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findOne).not.toHaveBeenCalled();
	});
});
