import { Types } from 'mongoose';
import { YachtService } from './yacht.service';
import { YachtResolver } from './yacht.resolver';
import { YachtListingMode } from '../../libs/enums/yacht.enum';

describe('Yacht explicit destination tags', () => {
	const id = '507f1f77bcf86cd799439011';
	const other = '507f1f77bcf86cd799439012';
	const valid = {
		name: 'Example Yacht',
		location: 'Nice',
		country: 'France',
		brokerId: id,
		listingModes: [YachtListingMode.SALE],
	};
	let service: YachtService;
	let model: any;
	let destinations: any;
	beforeEach(() => {
		model = {
			create: jest.fn(async (fields) => fields),
			aggregate: jest.fn().mockResolvedValue([{ list: [], meta: [] }]),
			findById: jest.fn(() => ({ lean: () => ({ exec: async () => ({ ...valid, destinationIds: [id] }) }) })),
			findByIdAndUpdate: jest.fn((_id, update) => ({ exec: async () => ({ ...valid, _id, ...update.$set }) })),
		};
		destinations = { validateIds: jest.fn() };
		service = new YachtService(model, { getById: jest.fn() } as never, destinations);
	});
	it('keeps existing yachts valid without tags or a destination lookup', async () => {
		await service.create(valid);
		expect(destinations.validateIds).not.toHaveBeenCalled();
		expect(model.create.mock.calls[0][0]).toMatchObject({ location: 'Nice', country: 'France' });
	});
	it.each([{ destinationIds: [id] }, { destinationIds: [id, other] }, { destinationIds: [] }])(
		'validates explicitly supplied tags %j',
		async ({ destinationIds }) => {
			await service.create({ ...valid, destinationIds });
			expect(destinations.validateIds).toHaveBeenCalledWith(destinationIds);
		},
	);
	it('preserves omitted tags on partial updates', async () => {
		await service.update({ _id: id, name: 'Updated Yacht' });
		expect(destinations.validateIds).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ name: 'Updated Yacht' });
	});
	it('validates replacement tags and supports clearing with an empty array', async () => {
		await service.update({ _id: id, destinationIds: [other] });
		expect(destinations.validateIds).toHaveBeenCalledWith([other]);
		await service.update({ _id: id, destinationIds: [] });
		expect(model.findByIdAndUpdate.mock.calls[1][1].$set).toEqual({ destinationIds: [] });
	});
	it.each([{ destinationIds: ['bad'] }, { destinationIds: [id, id] }, { destinationIds: null }])(
		'rejects invalid tags %j before create or update',
		async (patch) => {
			await expect(service.create({ ...valid, ...patch } as never)).rejects.toThrow('Invalid yacht input');
			await expect(service.update({ _id: id, ...patch } as never)).rejects.toThrow('Invalid yacht input');
			expect(model.create).not.toHaveBeenCalled();
			expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
		},
	);
	it('rejects nonexistent references before writes', async () => {
		destinations.validateIds.mockRejectedValue(new Error('Destination not found'));
		await expect(service.create({ ...valid, destinationIds: [id] })).rejects.toThrow('Destination not found');
		await expect(service.update({ _id: id, destinationIds: [id] })).rejects.toThrow('Destination not found');
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('uses BSON scalar membership with existing filters, no descendant expansion', async () => {
		await service.catalog({
			filter: { destinationId: id, location: 'Nice', country: 'France', mode: YachtListingMode.SALE },
		} as never);
		expect(model.aggregate.mock.calls[0][0][0].$match).toEqual({
			status: 'PUBLISHED',
			destinationIds: new Types.ObjectId(id),
			listingModes: 'SALE',
			location: /Nice/i,
			country: /^France$/i,
		});
		expect(destinations.validateIds).not.toHaveBeenCalled();
	});
	it('applies membership on staff and featured paths', async () => {
		await service.getForStaff({ filter: { destinationId: other } } as never);
		await service.catalog({ filter: { destinationId: other } } as never, true);
		expect(model.aggregate.mock.calls[0][0][0].$match).toEqual({ destinationIds: new Types.ObjectId(other) });
		expect(model.aggregate.mock.calls[1][0][0].$match).toEqual({
			status: 'PUBLISHED',
			destinationIds: new Types.ObjectId(other),
			featured: true,
		});
	});
	it('rejects invalid destination filter IDs before aggregation', async () => {
		await expect(service.catalog({ filter: { destinationId: 'bad' } } as never)).rejects.toThrow('Invalid yacht query');
		expect(model.aggregate).not.toHaveBeenCalled();
	});
	it('presents empty tags for older records without rewriting persistence', () => {
		const resolver = new YachtResolver(service, {} as never);
		expect(resolver.resolveDestinationIds(valid as never)).toEqual([]);
		expect(resolver.resolveDestinationIds({ destinationIds: [id] } as never)).toEqual([id]);
	});
});
