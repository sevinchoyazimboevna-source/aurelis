import { BadRequestException } from '@nestjs/common';
import { YachtService } from './yacht.service';
import { YachtCatalogInput } from '../../libs/dto/yacht/yacht.input';
import { YachtListingMode, YachtSortBy, YachtStatus } from '../../libs/enums/yacht.enum';

describe('YachtService', () => {
	const aggregate = jest.fn();
	const model = { aggregate };
	const brokers = { getById: jest.fn().mockResolvedValue({ _id: 'broker-1' }) };
	let service: YachtService;
	const catalogInput = (overrides: Partial<YachtCatalogInput> = {}): YachtCatalogInput => ({
		page: 1,
		limit: 20,
		sortBy: YachtSortBy.FEATURED,
		descending: false,
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		service = new YachtService(model as never, brokers as never, {} as never);
	});

	it('filters the public catalog by yacht mode, location, and price range', async () => {
		aggregate.mockResolvedValue([{ list: [], meta: [{ total: 0 }] }]);
		await service.catalog(
			catalogInput({
				filter: { mode: YachtListingMode.CHARTER, location: 'Cannes', minPrice: 1000, maxPrice: 5000, currency: 'EUR' },
				limit: 10,
			}),
		);

		const pipeline = aggregate.mock.calls[0][0];
		expect(pipeline[0].$match).toMatchObject({
			status: YachtStatus.PUBLISHED,
			listingModes: YachtListingMode.CHARTER,
			charterCurrency: 'EUR',
			charterPrice: { $gte: 1000, $lte: 5000 },
		});
		expect(pipeline[0].$match.location.test('Cannes')).toBe(true);
	});

	it('requires a sales or charter mode when filtering prices', async () => {
		await expect(service.catalog(catalogInput({ filter: { minPrice: 500 } }))).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(aggregate).not.toHaveBeenCalled();
	});

	it('requires a currency when sorting by price across global inventory', async () => {
		await expect(
			service.catalog(catalogInput({ sortBy: YachtSortBy.PRICE, filter: { mode: YachtListingMode.SALE } })),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects inverted ranges', async () => {
		await expect(service.catalog(catalogInput({ filter: { minLengthM: 80, maxLengthM: 30 } }))).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it('checks that an active broker exists before creating a yacht', async () => {
		const create = jest.fn().mockResolvedValue({ _id: 'yacht-1' });
		(service as any).yachtModel.create = create;
		await service.create({
			name: 'Aurelis One',
			builder: 'Builder',
			yearBuilt: 2020,
			lengthM: 30,
			location: 'Nice',
			country: 'France',
			listingModes: [YachtListingMode.SALE],
			featured: false,
			brokerId: '507f1f77bcf86cd799439011',
		});
		expect(brokers.getById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
		expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: YachtStatus.DRAFT }));
	});
});

// These tests exercise the service boundary, including calls made outside GraphQL.
describe('Yacht Step 3 collection and write behavior', () => {
	const id = '507f1f77bcf86cd799439011';
	const valid = {
		name: 'Aurelis One',
		location: 'Nice',
		country: 'France',
		brokerId: id,
		listingModes: [YachtListingMode.SALE, YachtListingMode.CHARTER],
	};
	let aggregate: jest.Mock,
		create: jest.Mock,
		update: jest.Mock,
		findById: jest.Mock,
		brokers: { getById: jest.Mock },
		service: YachtService;
	beforeEach(() => {
		aggregate = jest.fn().mockResolvedValue([{ list: [{ name: 'One' }], meta: [{ total: 41 }] }]);
		create = jest.fn().mockImplementation(async (fields) => fields);
		update = jest
			.fn()
			.mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...valid, charterPrice: 100, charterCurrency: 'EUR' }) });
		findById = jest.fn().mockReturnValue({
			lean: () => ({ exec: async () => ({ ...valid, charterPrice: 100, charterCurrency: 'EUR' }) }),
		});
		brokers = { getById: jest.fn().mockResolvedValue({ _id: id }) };
		service = new YachtService(
			{ aggregate, create, findById, findByIdAndUpdate: update } as never,
			brokers as never,
			{} as never,
		);
	});
	it.each([YachtStatus.DRAFT, YachtStatus.ARCHIVED, YachtStatus.PUBLISHED])(
		'ignores public status override %s while staff honors it',
		async (status) => {
			await service.catalog({ filter: { status } } as YachtCatalogInput);
			expect(aggregate.mock.calls[0][0][0].$match.status).toBe(YachtStatus.PUBLISHED);
			await service.getForStaff({ filter: { status } } as YachtCatalogInput);
			expect(aggregate.mock.calls[1][0][0].$match.status).toBe(status);
		},
	);
	it('forces featured and publication constraints', async () => {
		await service.catalog({ filter: { featured: false, status: YachtStatus.DRAFT } } as YachtCatalogInput, true);
		expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: YachtStatus.PUBLISHED, featured: true });
	});
	it('shares specification filters and sort with staff and preserves escaped literal search', async () => {
		const input = {
			filter: {
				listingMode: YachtListingMode.SALE,
				builder: 'A.B',
				model: 'M[1]',
				country: 'FR',
				location: 'Nice',
				featured: false,
				minLengthM: 1,
				maxLengthM: 30,
				minCabins: 0,
				maxCabins: 5,
				minGuests: 1,
				maxGuests: 12,
			},
			sortBy: YachtSortBy.NAME_ASC,
		} as YachtCatalogInput;
		await service.catalog(input);
		await service.getForStaff(input);
		const publicPipeline = aggregate.mock.calls[0][0],
			staffPipeline = aggregate.mock.calls[1][0];
		const { status, ...publicMatch } = publicPipeline[0].$match;
		expect(publicMatch).toEqual(staffPipeline[0].$match);
		expect(publicPipeline[1]).toEqual(staffPipeline[1]);
		expect(publicMatch).toMatchObject({
			listingModes: 'SALE',
			featured: false,
			lengthM: { $gte: 1, $lte: 30 },
			cabins: { $gte: 0, $lte: 5 },
			guests: { $gte: 1, $lte: 12 },
		});
		expect(publicMatch.builder.test('A.B')).toBe(true);
		expect(publicMatch.builder.test('AxB')).toBe(false);
		expect(publicMatch.model.test('M[1]')).toBe(true);
	});
	it.each([
		[YachtSortBy.NEWEST, 'createdAt', -1],
		[YachtSortBy.NAME_ASC, 'name', 1],
		[YachtSortBy.NAME_DESC, 'name', -1],
		[YachtSortBy.PRICE_ASC, 'charterPrice', 1],
		[YachtSortBy.PRICE_DESC, 'charterPrice', -1],
	])('maps %s to a deterministic canonical sort', async (sortBy, field, direction) => {
		await service.catalog({
			sortBy,
			filter: { listingMode: YachtListingMode.CHARTER, currency: 'EUR' },
		} as YachtCatalogInput);
		expect(aggregate.mock.calls[0][0][1].$sort).toMatchObject({ [field]: direction, _id: -1 });
	});
	it.each([YachtSortBy.PRICE_ASC, YachtSortBy.PRICE_DESC])('sorts SALE on salePrice for %s', async (sortBy) => {
		await service.catalog({
			sortBy,
			filter: { mode: YachtListingMode.SALE, currency: 'USD', minPrice: 0, maxPrice: 1000 },
		} as YachtCatalogInput);
		expect(aggregate.mock.calls[0][0][0].$match).toMatchObject({
			salePrice: { $gte: 0, $lte: 1000 },
			saleCurrency: 'USD',
		});
		expect(aggregate.mock.calls[0][0][1].$sort.salePrice).toBe(sortBy === YachtSortBy.PRICE_ASC ? 1 : -1);
	});
	it.each([{}, { page: 2, limit: 10 }, { page: 1, limit: 50 }, { page: 20, limit: 3 }])(
		'uses MongoDB pagination and count metadata for %j',
		async (input) => {
			const result = await service.catalog(input as YachtCatalogInput);
			const page = input.page ?? 1,
				limit = input.limit ?? 20;
			expect(aggregate.mock.calls[0][0][2].$facet.list.slice(0, 2)).toEqual([
				{ $skip: (page - 1) * limit },
				{ $limit: limit },
			]);
			expect(result).toEqual({
				list: [{ name: 'One', broker: null }],
				total: 41,
				page,
				limit,
				totalPages: Math.ceil(41 / limit),
			});
		},
	);
	it('returns an empty wrapper for no matches', async () => {
		aggregate.mockResolvedValue([{ list: [], meta: [] }]);
		expect(await service.catalog({} as YachtCatalogInput)).toEqual({
			list: [],
			total: 0,
			page: 1,
			limit: 20,
			totalPages: 0,
		});
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: -1 },
		{ limit: Infinity },
		{ filter: { minCabins: -1 } },
		{ filter: { minGuests: 1.5 } },
		{ filter: { minPrice: -1 } },
		{ filter: { minCabins: 5, maxCabins: 2 } },
		{ filter: { minGuests: 5, maxGuests: 2 } },
		{ filter: { mode: 'SALE', listingMode: 'CHARTER' } },
	])('rejects invalid collection input %j', async (input) => {
		await expect(service.catalog(input as YachtCatalogInput)).rejects.toBeInstanceOf(BadRequestException);
		expect(aggregate).not.toHaveBeenCalled();
	});
	it.each([{ charterPrice: 100 }, { charterRate: 100 }, { charterPrice: 100, charterRate: 100 }, { charterRate: 0 }])(
		'persists only canonical charterPrice for create and update: %j',
		async (price) => {
			await service.create({ ...valid, ...price, charterCurrency: 'EUR' });
			expect(create.mock.calls[0][0].charterPrice).toBe(price.charterPrice ?? price.charterRate);
			expect(create.mock.calls[0][0]).not.toHaveProperty('charterRate');
			await service.update({ _id: id, ...price });
			expect(update.mock.calls[0][1].$set.charterPrice).toBe(price.charterPrice ?? price.charterRate);
			expect(update.mock.calls[0][1].$set).not.toHaveProperty('charterRate');
		},
	);
	it('rejects conflicting aliases before create and update database calls', async () => {
		const price = { charterPrice: 100, charterRate: 200 };
		await expect(service.create({ ...valid, ...price })).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.update({ _id: id, ...price })).rejects.toBeInstanceOf(BadRequestException);
		expect(create).not.toHaveBeenCalled();
		expect(findById).not.toHaveBeenCalled();
	});
	it('preserves omitted prices, broker and featured in partial updates', async () => {
		await service.update({ _id: id, name: 'Updated' });
		expect(update.mock.calls[0][1]).toEqual({ $set: { name: 'Updated' } });
		expect(brokers.getById).not.toHaveBeenCalled();
	});
	it.each([
		{ name: '  ' },
		{ lengthM: -1 },
		{ lengthM: 0 },
		{ beamM: 0 },
		{ draftM: -1 },
		{ cabins: -1 },
		{ guests: 1.5 },
		{ crew: NaN },
		{ yearBuilt: 1700 },
		{ yearBuilt: 2020.5 },
		{ yearBuilt: new Date().getFullYear() + 1 },
		{ salePrice: -1, saleCurrency: 'USD' },
		{ charterRate: -1, charterCurrency: 'EUR' },
		{ listingModes: [] },
		{ listingModes: ['SALES'] },
		{ status: 'INVALID' },
		{ lengthM: '30' },
		{ name: null },
		{ charterRate: null },
		{ listingModes: null },
		{ featured: null },
	])('rejects invalid writes %j', async (fields) => {
		await expect(service.create({ ...valid, ...fields } as never)).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.update({ _id: id, ...fields } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(create).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});
	it.each([YachtListingMode.SALE, YachtListingMode.CHARTER])('accepts %s without imposing a price', async (mode) => {
		await service.create({ ...valid, listingModes: [mode], featured: true });
		expect(create.mock.calls[0][0]).toMatchObject({ listingModes: [mode], featured: true, status: YachtStatus.DRAFT });
	});
	it.each([YachtStatus.DRAFT, YachtStatus.PUBLISHED, YachtStatus.ARCHIVED])(
		'accepts explicit status %s',
		async (status) => {
			await service.create({ ...valid, status });
			expect(create.mock.calls[0][0].status).toBe(status);
		},
	);
});

describe('Required create fields', () => {
	it('rejects missing name before persistence', async () => {
		const create = jest.fn();
		const service = new YachtService({ create } as never, {} as never, {} as never);
		await expect(
			service.create({
				location: 'Nice',
				country: 'France',
				brokerId: '507f1f77bcf86cd799439011',
				listingModes: [YachtListingMode.SALE],
			} as never),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(create).not.toHaveBeenCalled();
	});
});

describe('Missing broker query results', () => {
	it('marks an absent catalog broker explicitly to avoid repeated resolver lookups', async () => {
		const service = new YachtService(
			{ aggregate: async () => [{ list: [{ name: 'One' }], meta: [] }] } as never,
			{} as never,
			{} as never,
		);
		expect((await service.catalog({} as YachtCatalogInput)).list[0]).toHaveProperty('broker', null);
	});
});
