import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OfficeService } from './office.service';
import { OfficeSortBy } from '../../libs/enums/office.enum';

describe('Office service (offline)', () => {
	const id = '000000000000000000000001';
	const valid = {
		name: '  Aurelis Test  ',
		country: ' Test Country ',
		city: ' Test City ',
		addressLine1: ' Street 1 ',
	};
	let model: any;
	let service: OfficeService;
	beforeEach(() => {
		model = {
			exists: jest.fn(async (match) => (match.slug ? null : { _id: id })),
			create: jest.fn(async (fields) => fields),
			findByIdAndUpdate: jest.fn((_id, update) => ({ exec: async () => ({ _id, ...update.$set }) })),
			findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })),
			aggregate: jest.fn().mockResolvedValue([{ list: [], meta: [{ total: 41 }] }]),
		};
		service = new OfficeService(model);
	});
	it('trims required fields, generates slug and defaults', async () => {
		expect(await service.create(valid)).toEqual({
			name: 'Aurelis Test',
			country: 'Test Country',
			city: 'Test City',
			addressLine1: 'Street 1',
			slug: 'aurelis-test',
			status: 'DRAFT',
			featured: false,
			sortOrder: 0,
		});
	});
	it('normalizes explicit slugs and public contact email', async () => {
		expect(await service.create({ ...valid, slug: ' TEST  Office ', email: ' INFO@EXAMPLE.COM ' })).toMatchObject({
			slug: 'test-office',
			email: 'info@example.com',
		});
	});
	it.each(['', ' ', 'a/b', 'a?b', 'a_b', 'x'.repeat(121)])('rejects unsafe slug %s', async (slug) => {
		await expect(service.create({ ...valid, slug })).rejects.toBeInstanceOf(BadRequestException);
		expect(model.create).not.toHaveBeenCalled();
	});
	it.each([
		{ name: ' ' },
		{ country: ' ' },
		{ city: ' ' },
		{ addressLine1: ' ' },
		{ email: 'bad' },
		{ status: 'INVALID' },
		{ sortOrder: -1 },
		{ sortOrder: 1.2 },
		{ timezone: 'Invalid/Zone' },
		{ phone: '' },
		{ businessHours: null },
		{ images: [' '] },
	])('rejects invalid create and partial update %j', async (patch) => {
		await expect(service.create({ ...valid, ...patch } as any)).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.update({ _id: id, ...patch } as any)).rejects.toBeInstanceOf(BadRequestException);
	});
	it.each([
		'name',
		'country',
		'city',
		'addressLine1',
		'email',
		'slug',
		'status',
		'timezone',
		'featured',
		'sortOrder',
		'images',
	])('rejects explicit mutation null for %s', async (field) => {
		await expect(service.update({ _id: id, [field]: null } as any)).rejects.toBeInstanceOf(BadRequestException);
	});
	it('checks duplicate slugs across statuses', async () => {
		model.exists.mockResolvedValue({ _id: id });
		await expect(service.create(valid)).rejects.toThrow('slug already exists');
		await expect(service.update({ _id: id, slug: 'duplicate' })).rejects.toThrow('slug already exists');
	});
	it('maps unique-index write races on create and update', async () => {
		model.create.mockRejectedValue({ code: 11000 });
		await expect(service.create(valid)).rejects.toThrow('slug already exists');
		model.findByIdAndUpdate.mockReturnValue({
			exec: async () => {
				throw { code: 11000 };
			},
		});
		await expect(service.update({ _id: id, slug: 'new' })).rejects.toThrow('slug already exists');
	});
	it('preserves omitted fields and public slug on name change', async () => {
		await service.update({ _id: id, name: ' New ', featured: undefined });
		expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
			id,
			{ $set: { name: 'New' } },
			{ new: true, runValidators: true },
		);
	});
	it('normalizes explicit slug updates excluding the current record', async () => {
		await service.update({ _id: id, slug: 'NEW Slug', featured: false, sortOrder: 0, images: [], businessHours: [] });
		expect(model.exists).toHaveBeenLastCalledWith({ slug: 'new-slug', _id: { $ne: id } });
		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).toMatchObject({
			slug: 'new-slug',
			featured: false,
			sortOrder: 0,
			images: [],
			businessHours: [],
		});
	});
	it('rejects missing updates and concurrent removal', async () => {
		model.exists.mockResolvedValueOnce(null);
		await expect(service.update({ _id: id })).rejects.toBeInstanceOf(NotFoundException);
		model.findByIdAndUpdate.mockReturnValue({ exec: async () => null });
		await expect(service.update({ _id: id })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('enforces publication for detail even when no record is visible', async () => {
		await expect(service.getBySlug(' TEST ')).rejects.toBeInstanceOf(NotFoundException);
		expect(model.findOne).toHaveBeenCalledWith({ slug: 'test', status: 'PUBLISHED' });
	});
	it('enforces publication and featured independently of client filters', async () => {
		await service.catalog({ filter: { status: 'ARCHIVED', featured: false } } as any, true);
		expect(model.aggregate.mock.calls[0][0][0].$match).toEqual({ status: 'PUBLISHED', featured: true });
	});
	it('permits admin status filtering and escapes literal regex characters', async () => {
		await service.getForAdmin({ filter: { status: 'DRAFT', country: 'A+B', city: 'C.(D)', search: '.*' } } as any);
		const match = model.aggregate.mock.calls[0][0][0].$match;
		expect(match.status).toBe('DRAFT');
		expect(match.country.test('A+B')).toBe(true);
		expect(match.country.test('AAAB')).toBe(false);
		expect(match.city.test('C.(D)')).toBe(true);
		expect(match.$or[0].name.test('anything')).toBe(false);
		expect(match.$or[0].name.test('literal .*')).toBe(true);
	});
	it.each([
		[OfficeSortBy.FEATURED, { featured: -1, sortOrder: 1, name: 1, _id: 1 }],
		[OfficeSortBy.SORT_ORDER, { sortOrder: 1, name: 1, _id: 1 }],
		[OfficeSortBy.NAME_ASC, { name: 1, _id: 1 }],
		[OfficeSortBy.NAME_DESC, { name: -1, _id: 1 }],
		[OfficeSortBy.NEWEST, { createdAt: -1, _id: -1 }],
	])('uses deterministic MongoDB %s sorting', async (sortBy, expected) => {
		await service.catalog({ sortBy } as any);
		expect(model.aggregate.mock.calls[0][0][1].$sort).toEqual(expected);
	});
	it('returns defaults and MongoDB skip/limit with full count', async () => {
		expect(await service.catalog({} as any)).toEqual({ list: [], total: 41, page: 1, limit: 20, totalPages: 3 });
		expect(await service.catalog({ page: 3, limit: 10 } as any)).toMatchObject({ page: 3, limit: 10, totalPages: 5 });
		expect(model.aggregate.mock.calls[1][0][2].$facet.list).toEqual([{ $skip: 20 }, { $limit: 10 }]);
		model.aggregate.mockResolvedValue([]);
		expect(await service.catalog({ limit: 50 } as any)).toMatchObject({ total: 0, totalPages: 0 });
	});
	it.each([{ page: 0 }, { page: 1.5 }, { limit: 0 }, { limit: 51 }, { limit: 1.5 }, { sortBy: 'BAD' }])(
		'rejects invalid pagination/sort %j',
		async (input) => {
			await expect(service.catalog(input as any)).rejects.toBeInstanceOf(BadRequestException);
			expect(model.aggregate).not.toHaveBeenCalled();
		},
	);
	it('validates optional broker reference existence regardless of status', async () => {
		await expect(service.validateId(id)).resolves.toBeUndefined();
		await expect(service.validateId('invalid')).rejects.toThrow('Invalid office ID');
		model.exists.mockResolvedValue(null);
		await expect(service.validateId(id)).rejects.toThrow('Office not found');
	});
});
