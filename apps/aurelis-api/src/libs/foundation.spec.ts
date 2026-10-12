import { CreateAuthIdentityInput } from './dto/auth-identity/auth-identity.input';
import { AuthProvider } from './enums/account.enum';
import { CreateYachtListingInput } from './dto/yacht-listing/yacht-listing.input';
import { YachtListingSchema } from './models/yacht-listing.model';
import { ListingType, ListingStatus } from './enums/yacht-listing.enum';
import { Test } from '@nestjs/testing';
import {
	GraphQLSchemaBuilderModule,
	GraphQLSchemaFactory,
	Resolver,
	Query,
	Args,
} from '@nestjs/graphql';
import * as dto from './dto';
import { MemberStatus as LegacyMemberStatus } from './enums/member.enum';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { model, deleteModel } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { of, lastValueFrom } from 'rxjs';
import { ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aurelisModelDefinitions } from './models/model-definitions';
import { MemberRecordSchema } from './models/account.model';
import { CreateYachtInput } from './dto/yacht/yacht.input';
import { UpdateYachtInput } from './dto/yacht/yacht.update';
import { CreateInquiryInput } from './dto/inquiry/inquiry.input';
import { MemberRecord } from './dto/account/account';
import { YachtType, ContentStatus } from './enums/yacht.enum';
import { InquiryType, InquirySource } from './enums/inquiry.enum';
import { validateEnvironment, mongoUri } from './config/environment';
import { isJsonValue } from './types/json.type';
import { JsonScalar } from './types/json.scalar';
import { SerializeInterceptor } from './interceptors/serialize.interceptor';
import { LoggingInterceptor } from './interceptors/Logging.interceptor';

const validYacht = {
	name: 'Aurelis',
	slug: 'aurelis',
	yachtType: YachtType.MOTOR,
	buildYear: 2020,
	lengthM: 42.5,
	cabins: 5,
	guestCapacity: 10,
	crewCapacity: 8,
	description: 'Luxury motor yacht',
	images: ['yacht.jpg'],
	status: ContentStatus.ACTIVE,
};
const validEnv = {
	MONGO_DEV: 'mongodb://localhost:27017/aurelis',
	SECRET_TOKEN: 'x'.repeat(64),
};

@Resolver()
class FoundationResolver {
	@Query(() => String)
	foundation(
		@Args('create', { type: () => CreateYachtInput, nullable: true })
		_create?: CreateYachtInput,
		@Args('update', { type: () => UpdateYachtInput, nullable: true })
		_update?: UpdateYachtInput,
	): string {
		return 'ok';
	}
}

Object.entries(dto)
	.filter(
		([name]) =>
			name.startsWith('Create') ||
			name.startsWith('Update') ||
			name === 'PaginationInput',
	)
	.forEach(([name, inputType], index) => {
		Args(name, { type: () => inputType, nullable: true })(
			FoundationResolver.prototype,
			'foundation',
			index + 2,
		);
	});

describe('Aurelis ER foundation', () => {
	it('generates a valid GraphQL schema for every ER response and input', async () => {
		expect(LegacyMemberStatus.ACTIVE).toBe('ACTIVE');
		const module = await Test.createTestingModule({
			imports: [GraphQLSchemaBuilderModule],
		}).compile();
		try {
			const schema = await module.get(GraphQLSchemaFactory).create([FoundationResolver], {
				orphanedTypes: Object.values(dto).filter((value) => typeof value === 'function'),
			});
			expect(schema.getType('Yacht')).toBeDefined();
			expect(schema.getType('MemberRecord')).toBeDefined();
			expect(schema.getType('AurelisJSON')).toBeDefined();
			expect(schema.getType('MemberStatus')).toBeDefined();
			expect(schema.getType('CreateYachtInput')).toBeDefined();
		} finally {
			await module.close();
		}
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('defines all 13 ER collections with UUID identities and timestamps', () => {
		expect(aurelisModelDefinitions.map(({ schema }) => schema.get('collection'))).toEqual(
			[
				'members',
				'authIdentities',
				'yachts',
				'yachtListings',
				'destinations',
				'yachtDestinations',
				'offices',
				'teamMembers',
				'wishlists',
				'inquiries',
				'articles',
				'pageContents',
				'newsletterSubscriptions',
			],
		);
		for (const { name, schema } of aurelisModelDefinitions) {
			expect(schema.path('createdAt')).toBeDefined();
			expect(schema.path('updatedAt')).toBeDefined();
			const Model = model(name, schema);
			expect(new Model()._id).toMatch(/^[0-9a-f-]{36}$/);
			deleteModel(name);
		}
		expect(MemberRecordSchema.path('passwordHash').options.select).toBe(false);
	});

	it('accepts opaque provider IDs and preserves decimal listing prices', async () => {
		expect(
			validateSync(
				plainToInstance(CreateAuthIdentityInput, {
					memberId: randomUUID(),
					provider: AuthProvider.GOOGLE,
					providerUserId: '109876543210987654321',
				}),
			),
		).toHaveLength(0);
		const listing = {
			yachtId: randomUUID(),
			listingType: ListingType.SALE,
			currency: 'EUR',
			price: '12345678901234567890.12',
			priceOnRequest: false,
			isFeatured: false,
			status: ListingStatus.DRAFT,
		};
		expect(validateSync(plainToInstance(CreateYachtListingInput, listing))).toHaveLength(
			0,
		);
		expect(
			validateSync(
				plainToInstance(CreateYachtListingInput, { ...listing, price: 1.1 }),
			).map((e) => e.property),
		).toContain('price');
		const Listing = model('DecimalListingTest', YachtListingSchema);
		try {
			const stored = new Listing(listing);
			expect(stored.validateSync()).toBeUndefined();
			expect(stored.price?.toString()).toBe(listing.price);
			const serialized = await lastValueFrom(
				new SerializeInterceptor(dto.YachtListing).intercept({} as ExecutionContext, {
					handle: () => of(stored.toObject()),
				}),
			);
			expect(serialized).toMatchObject({ price: listing.price });
		} finally {
			deleteModel('DecimalListingTest');
		}
	});

	it('rejects invalid enum values, fractional capacities, and missing required fields', () => {
		expect(validateSync(plainToInstance(CreateYachtInput, validYacht))).toHaveLength(0);
		const invalid = plainToInstance(CreateYachtInput, {
			...validYacht,
			yachtType: 'VILLA',
			cabins: 2.5,
			lengthM: -1,
		});
		expect(validateSync(invalid).map(({ property }) => property)).toEqual(
			expect.arrayContaining(['yachtType', 'cabins', 'lengthM']),
		);
		expect(validateSync(new CreateYachtInput()).length).toBeGreaterThan(0);
	});

	it('allows omitted update fields while rejecting null required fields and invalid IDs', () => {
		expect(
			validateSync(plainToInstance(UpdateYachtInput, { _id: randomUUID() })),
		).toHaveLength(0);
		expect(
			validateSync(
				plainToInstance(UpdateYachtInput, { _id: randomUUID(), name: null }),
			).map((e) => e.property),
		).toContain('name');
		expect(
			validateSync(plainToInstance(UpdateYachtInput, { _id: 'bad' })).map(
				(e) => e.property,
			),
		).toContain('_id');
	});

	it('transforms inquiry consent dates and validates JSON payloads', () => {
		const input = {
			type: InquiryType.CHARTER,
			source: InquirySource.YACHT_PAGE,
			firstName: 'Alex',
			lastName: 'Smith',
			email: 'alex@example.com',
			message: 'Interested in a charter',
			consentAt: '2026-10-12T00:00:00Z',
			privacyPolicyVersion: '1',
			charterDetails: { guests: 8, ports: ['Monaco'] },
		};
		expect(validateSync(plainToInstance(CreateInquiryInput, input))).toHaveLength(0);
		expect(
			validateSync(
				plainToInstance(CreateInquiryInput, {
					...input,
					charterDetails: { guests: Infinity },
				}),
			).map((e) => e.property),
		).toContain('charterDetails');
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		expect(isJsonValue(cycle)).toBe(false);
		expect(() => JsonScalar.parseValue({ value: undefined })).toThrow(
			'Expected a valid JSON value',
		);
	});

	it('validates configuration and chooses the production database explicitly', () => {
		const env = validateEnvironment(validEnv);
		expect(env.PORT_BATCH).toBe(3001);
		expect(mongoUri(new ConfigService(env))).toBe(validEnv.MONGO_DEV);
		expect(() => validateEnvironment({ ...validEnv, PORT_API: 70000 })).toThrow(
			'PORT_API',
		);
		expect(() => validateEnvironment({ ...validEnv, SECRET_TOKEN: 'short' })).toThrow(
			'SECRET_TOKEN',
		);
		expect(() => validateEnvironment({ ...validEnv, NODE_ENV: 'production' })).toThrow(
			'MONGO_PROD',
		);
		const production = validateEnvironment({
			...validEnv,
			NODE_ENV: 'production',
			MONGO_PROD: 'mongodb://db:27017/aurelis',
		});
		expect(mongoUri(new ConfigService({ _PROCESS_ENV_VALIDATED: production }))).toBe(
			'mongodb://db:27017/aurelis',
		);
	});

	it('serializes accounts without credential hashes or unknown fields', async () => {
		const interceptor = new SerializeInterceptor(MemberRecord);
		const result = await lastValueFrom(
			interceptor.intercept({} as ExecutionContext, {
				handle: () =>
					of({
						_id: randomUUID(),
						name: 'alex',
						passwordHash: 'private',
						memberPassword: 'legacy-private',
						role: 'USER',
					}),
			}),
		);
		expect(result).toMatchObject({ name: 'alex', role: 'USER' });
		expect(result).not.toHaveProperty('passwordHash');
		expect(result).not.toHaveProperty('memberPassword');
	});

	it.each(['http', 'graphql', 'ws'])(
		'passes through %s results without logging private payloads',
		async (transport) => {
			const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
			const context = {
				getType: () => transport,
				getClass: () => FoundationResolver,
				getHandler: () => ({ name: 'operation' }),
				getArgs: () => [
					null,
					{},
					{ req: { body: { password: 'private' } } },
					{ parentType: { name: 'Query' }, fieldName: 'yachts' },
				],
				switchToHttp: () => ({
					getRequest: () => ({
						method: 'POST',
						path: '/graphql',
						body: { password: 'private' },
					}),
				}),
			} as unknown as ExecutionContext;
			const result = await lastValueFrom(
				new LoggingInterceptor().intercept(context, {
					handle: () => of({ passwordHash: 'private' }),
				}),
			);
			expect(result).toEqual({ passwordHash: 'private' });
			expect(JSON.stringify(log.mock.calls)).not.toContain('private');
		},
	);
});
