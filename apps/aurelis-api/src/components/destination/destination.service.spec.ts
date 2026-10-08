import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DestinationService } from './destination.service';
import { normalizeDestinationSlug } from './destination-slug';
import { DestinationSortBy, DestinationStatus, DestinationType } from '../../libs/enums/destination.enum';

describe('Destination service', () => {
	const id = (n: number) => n.toString(16).padStart(24, '0');
	let service: DestinationService;
	let model: any;
	let parents: Map<string, any>;
	const createInput = { name: '  French Riviera  ', type: DestinationType.AREA };
	beforeEach(() => {
		parents = new Map();
		model = {
			aggregate: jest.fn().mockResolvedValue([{ list: [], meta: [{ total: 41 }] }]),
			exists: jest.fn(async (match) => (match.slug ? null : { _id: id(1) })),
			create: jest.fn(async (fields) => fields),
			findById: jest.fn((value) => ({
				select: () => ({ lean: () => ({ exec: async () => parents.get(value) ?? null }) }),
			})),
			findByIdAndUpdate: jest.fn((_id, update) => ({ exec: async () => ({ _id, ...update.$set }) })),
			findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })),
			countDocuments: jest.fn(async (match) => match._id.$in.length),
		};
		service = new DestinationService(model);
	});
	it('generates one canonical slug and explicit safe defaults', async () => {
		expect(await service.create(createInput)).toEqual({
			name: 'French Riviera',
			type: 'AREA',
			slug: 'french-riviera',
			parentId: null,
			status: 'DRAFT',
			featured: false,
			sortOrder: 0,
		});
	});
	it.each([
		['  FRENCH  Riviera ', 'french-riviera'],
		['Crème-Brûlée', 'creme-brulee'],
		['a---b', 'a-b'],
	])('normalizes explicit slug %s', async (slug, expected) => {
		expect((await service.create({ ...createInput, slug })).slug).toBe(expected);
	});
	it.each(['', '   ', 'a/b', 'a?b', 'a#b', 'a_b', 'a.b', '😀', 'x'.repeat(121)])(
		'rejects unsafe/empty slug %s',
		async (slug) => {
			await expect(service.create({ ...createInput, slug })).rejects.toBeInstanceOf(BadRequestException);
			expect(model.create).not.toHaveBeenCalled();
		},
	);
	it('generates punctuation-safe names with the shared helper', () =>
		expect(normalizeDestinationSlug('St. Barts', true)).toBe('st-barts'));
	it('rejects duplicate slug globally including archived records', async () => {
		model.exists.mockResolvedValue({ _id: id(2) });
		await expect(service.create(createInput)).rejects.toThrow('slug already exists');
		expect(model.create).not.toHaveBeenCalled();
	});
	it('maps a unique-index race to validation', async () => {
		model.create.mockRejectedValue({ code: 11000 });
		await expect(service.create(createInput)).rejects.toThrow('slug already exists');
	});
	it('does not mask unexpected write failures', async () => {
		model.create.mockRejectedValue(new Error('storage'));
		await expect(service.create(createInput)).rejects.toThrow('storage');
	});
	it('preserves existing slug and all omitted fields on name-only updates', async () => {
		await service.update({ _id: id(1), name: 'New Name' });
		expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
			id(1),
			{ $set: { name: 'New Name' } },
			{ new: true, runValidators: true },
		);
		expect(model.exists).toHaveBeenCalledTimes(1);
	});
	it('normalizes explicit slug changes and excludes the same destination', async () => {
		await service.update({ _id: id(1), slug: 'NEW Slug' });
		expect(model.exists).toHaveBeenLastCalledWith({ slug: 'new-slug', _id: { $ne: id(1) } });
		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ slug: 'new-slug' });
	});
	it('maps unique-index races during slug updates to validation', async () => {
		model.findByIdAndUpdate.mockReturnValue({
			exec: async () => {
				throw { code: 11000 };
			},
		});
		await expect(service.update({ _id: id(1), slug: 'new' })).rejects.toThrow('slug already exists');
	});
	it('rejects duplicate slug changes', async () => {
		model.exists.mockResolvedValue({ _id: id(2) });
		await expect(service.update({ _id: id(1), slug: 'duplicate' })).rejects.toThrow('slug already exists');
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('rejects missing update records', async () => {
		model.exists.mockResolvedValue(null);
		await expect(service.update({ _id: id(1), name: 'New' })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('handles deletion between existence check and update', async () => {
		model.findByIdAndUpdate.mockReturnValue({ exec: async () => null });
		await expect(service.update({ _id: id(1), name: 'New' })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('permits a parent with an existing root ancestor and any publication status', async () => {
		parents.set(id(2), { _id: id(2), parentId: new Types.ObjectId(id(3)), status: 'ARCHIVED' });
		parents.set(id(3), { _id: id(3), parentId: null });
		await service.create({ ...createInput, parentId: id(2) });
		expect(model.findById).toHaveBeenCalledTimes(2);
		expect(model.create.mock.calls[0][0].parentId).toBe(id(2));
	});
	it('rejects missing parents before writing', async () => {
		await expect(service.create({ ...createInput, parentId: id(99) })).rejects.toThrow('parent not found');
		expect(model.create).not.toHaveBeenCalled();
	});
	it('rejects self-parenting', async () => {
		await expect(service.update({ _id: id(1), parentId: id(1) })).rejects.toThrow('cycle');
		expect(model.findById).not.toHaveBeenCalled();
	});
	it.each([1, 4])('rejects cycles through %s ancestors', async (depth) => {
		for (let n = 2; n < depth + 2; n++) parents.set(id(n), { parentId: id(n === depth + 1 ? 1 : n + 1) });
		await expect(service.update({ _id: id(1), parentId: id(2) })).rejects.toThrow('cycle');
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('rejects pre-existing loops while creating a child', async () => {
		parents.set(id(2), { parentId: id(3) });
		parents.set(id(3), { parentId: id(2) });
		await expect(service.create({ ...createInput, parentId: id(2) })).rejects.toThrow('cycle');
	});
	it('allows explicitly clearing parent without resetting other fields', async () => {
		await service.update({ _id: id(1), parentId: null });
		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ parentId: null });
	});
	it('archives by status only without cascading or deleting', async () => {
		await service.update({ _id: id(1), status: DestinationStatus.ARCHIVED });
		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ status: 'ARCHIVED' });
	});
	it.each([
		{ name: '' },
		{ name: '  ' },
		{ name: 'x'.repeat(121) },
		{ name: null },
		{ type: 'CITY' },
		{ status: 'DELETED' },
		{ parentId: 'invalid' },
		{ sortOrder: -1 },
		{ sortOrder: 0.1 },
		{ sortOrder: '2' },
		{ featured: 'true' },
		{ featured: null },
		{ slug: null },
		{ images: [1] },
		{ images: [' '] },
		{ heroImage: '' },
		{ country: null },
		{ rogue: 1 },
	])('rejects invalid mutation fields %j', async (patch) => {
		await expect(service.create({ ...createInput, ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(model.create).not.toHaveBeenCalled();
	});
	it.each([{ name: null }, { type: null }, { status: null }, { sortOrder: null }, { images: null }, { _id: 'bad' }])(
		'validates partial updates %j',
		async (patch) => {
			await expect(service.update({ _id: id(1), ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		},
	);
	it.each(Object.values(DestinationStatus))('forces published public catalog despite %s filter', async (status) => {
		await service.catalog({ filter: { status } } as never);
		expect(model.aggregate.mock.calls[0][0][0].$match.status).toBe('PUBLISHED');
		await service.getForAdmin({ filter: { status } } as never);
		expect(model.aggregate.mock.calls[1][0][0].$match.status).toBe(status);
	});
	it('honors every filter with escaped search and BSON parent match', async () => {
		await service.catalog({
			filter: {
				parentId: id(2),
				type: DestinationType.AREA,
				country: 'St.(A)',
				region: 'A+B',
				featured: false,
				search: '.*',
			},
		} as never);
		const match = model.aggregate.mock.calls[0][0][0].$match;
		expect(match.parentId).toEqual(new Types.ObjectId(id(2)));
		expect(match.type).toBe('AREA');
		expect(match.featured).toBe(false);
		expect(match.country.test('St.(A)')).toBe(true);
		expect(match.country.test('St.A')).toBe(false);
		expect(match.region.test('A+B')).toBe(true);
		expect(match.region.test('AAAB')).toBe(false);
		expect(match.$or).toHaveLength(3);
		expect(match.$or[0].name.test('anything')).toBe(false);
	});
	it('supports root filter through explicit null', async () => {
		await service.catalog({ filter: { parentId: null } } as never);
		expect(model.aggregate.mock.calls[0][0][0].$match.parentId).toBeNull();
	});
	it('forces featured true even when filter says false', async () => {
		await service.catalog({ filter: { featured: false } } as never, true);
		expect(model.aggregate.mock.calls[0][0][0].$match).toEqual({ status: 'PUBLISHED', featured: true });
	});
	it.each([
		[DestinationSortBy.FEATURED, { featured: -1, sortOrder: 1, name: 1, _id: 1 }],
		[DestinationSortBy.SORT_ORDER, { sortOrder: 1, name: 1, _id: 1 }],
		[DestinationSortBy.NAME_ASC, { name: 1, _id: 1 }],
		[DestinationSortBy.NAME_DESC, { name: -1, _id: 1 }],
		[DestinationSortBy.NEWEST, { createdAt: -1, _id: -1 }],
	])('uses deterministic Mongo sort %s', async (sortBy, sort) => {
		await service.catalog({ sortBy } as never);
		expect(model.aggregate.mock.calls[0][0][1].$sort).toEqual(sort);
	});
	it('returns default metadata and Mongo pagination', async () => {
		expect(await service.catalog({} as never)).toEqual({ list: [], total: 41, page: 1, limit: 20, totalPages: 3 });
		expect(model.aggregate.mock.calls[0][0][2].$facet.list).toEqual([{ $skip: 0 }, { $limit: 20 }]);
	});
	it('uses page two and maximum limit', async () => {
		expect((await service.catalog({ page: 2, limit: 50 } as never)).totalPages).toBe(1);
		expect(model.aggregate.mock.calls[0][0][2].$facet.list).toEqual([{ $skip: 50 }, { $limit: 50 }]);
	});
	it('handles empty aggregate metadata', async () => {
		model.aggregate.mockResolvedValue([]);
		expect(await service.catalog({} as never)).toEqual({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ page: '1' },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: 1.5 },
		{ sortBy: 'BAD' },
		{ filter: { parentId: 'bad' } },
		{ filter: { type: 'CITY' } },
		{ filter: { status: 'BAD' } },
		{ filter: { featured: 1 } },
	])('rejects invalid queries %j', async (input) => {
		await expect(service.catalog(input as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(model.aggregate).not.toHaveBeenCalled();
	});
	it('reads only a published canonical slug', async () => {
		await expect(service.getBySlug('RIVIERA')).rejects.toBeInstanceOf(NotFoundException);
		expect(model.findOne).toHaveBeenCalledWith({ slug: 'riviera', status: 'PUBLISHED' });
	});
	it('validates optional IDs in one bulk existence query, including hidden destinations', async () => {
		await service.validateIds([]);
		expect(model.countDocuments).not.toHaveBeenCalled();
		await service.validateIds([id(1), id(2)]);
		expect(model.countDocuments).toHaveBeenCalledWith({ _id: { $in: [id(1), id(2)] } });
	});
	it.each([
		{ ids: ['bad'] },
		{ ids: [id(1), id(1)] },
		{ ids: ['abcdefabcdefabcdefabcdef', 'ABCDEFABCDEFABCDEFABCDEF'] },
		{ ids: [null] },
	])('rejects malformed or duplicate IDs %j', async ({ ids }) => {
		await expect(service.validateIds(ids as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(model.countDocuments).not.toHaveBeenCalled();
	});
	it('rejects nonexisting IDs', async () => {
		model.countDocuments.mockResolvedValue(1);
		await expect(service.validateIds([id(1), id(2)])).rejects.toThrow('Destination not found');
	});
});
