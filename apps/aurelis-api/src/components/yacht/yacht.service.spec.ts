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
		service = new YachtService(model as never, brokers as never);
	});

	it('filters the public catalog by yacht mode, location, and price range', async () => {
		aggregate.mockResolvedValue([{ list: [], meta: [{ total: 0 }] }]);
		await service.catalog(catalogInput({
			filter: { mode: YachtListingMode.CHARTER, location: 'Cannes', minPrice: 1000, maxPrice: 5000, currency: 'EUR' },
			limit: 10,
		}));

		const pipeline = aggregate.mock.calls[0][0];
		expect(pipeline[0].$match).toMatchObject({
			status: YachtStatus.PUBLISHED,
			listingModes: YachtListingMode.CHARTER,
			charterCurrency: 'EUR',
			charterRate: { $gte: 1000, $lte: 5000 },
		});
		expect(pipeline[0].$match.location.test('Cannes')).toBe(true);
	});

	it('requires a sales or charter mode when filtering prices', async () => {
		await expect(service.catalog(catalogInput({ filter: { minPrice: 500 } }))).rejects.toBeInstanceOf(BadRequestException);
		expect(aggregate).not.toHaveBeenCalled();
	});

	it('requires a currency when sorting by price across global inventory', async () => {
		await expect(service.catalog(catalogInput({ sortBy: YachtSortBy.PRICE, filter: { mode: YachtListingMode.SALES } }))).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects inverted ranges', async () => {
		await expect(service.catalog(catalogInput({ filter: { minLengthM: 80, maxLengthM: 30 } }))).rejects.toBeInstanceOf(BadRequestException);
	});

	it('checks that an active broker exists before creating a yacht', async () => {
		const create = jest.fn().mockResolvedValue({ _id: 'yacht-1' });
		(service as any).yachtModel.create = create;
		await service.create({
			name: 'Aurelis One', builder: 'Builder', yearBuilt: 2020, lengthM: 30, location: 'Nice', country: 'France',
			listingModes: [YachtListingMode.SALES], featured: false, brokerId: 'broker-1',
		});
		expect(brokers.getById).toHaveBeenCalledWith('broker-1');
		expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: YachtStatus.DRAFT }));
	});
});
