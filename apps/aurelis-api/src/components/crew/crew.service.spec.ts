import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CrewService } from './crew.service';
import { CrewResolver } from './crew.resolver';
import { CrewCatalogInput } from '../../libs/dto/crew/crew.input';
import { CrewRole, CrewSortBy, CrewStatus } from '../../libs/enums/crew.enum';

const id = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';
const valid = { role: CrewRole.CAPTAIN, firstName: 'Aurelis', lastName: 'Captain' };

describe('CrewService writes and member links', () => {
	let service: CrewService;
	let model: { create: jest.Mock; exists: jest.Mock; findByIdAndUpdate: jest.Mock };
	let members: { exists: jest.Mock };
	let updateExec: jest.Mock;
	beforeEach(() => {
		updateExec = jest.fn().mockResolvedValue({ ...valid, _id: id, featured: true, experienceYears: 12 });
		model = {
			create: jest.fn().mockImplementation(async (fields) => fields),
			exists: jest.fn().mockResolvedValue(null),
			findByIdAndUpdate: jest.fn().mockReturnValue({ exec: updateExec }),
		};
		members = { exists: jest.fn().mockResolvedValue({ _id: memberId }) };
		service = new CrewService(model as never, members as never);
	});
	it.each([CrewRole.CAPTAIN, CrewRole.CHEF])(
		'creates a valid %s without a member account or duplicated derived name',
		async (role) => {
			const result = await service.create({ ...valid, role });
			expect(result).toMatchObject({ role, status: CrewStatus.DRAFT, featured: false });
			expect(model.create.mock.calls[0][0]).not.toHaveProperty('displayName');
			expect(members.exists).not.toHaveBeenCalled();
		},
	);
	it('trims names and language entries without coercing numbers or persisting derived data', async () => {
		await service.create({
			...valid,
			firstName: ' Aurelis ',
			languages: [' English ', 'French'],
			profileImage: '/images/captain.png',
			images: ['/images/one.png'],
			experienceYears: 0,
		});
		expect(model.create.mock.calls[0][0]).toMatchObject({
			firstName: 'Aurelis',
			languages: ['English', 'French'],
			experienceYears: 0,
		});
	});
	it.each([CrewStatus.DRAFT, CrewStatus.PUBLISHED, CrewStatus.ARCHIVED])(
		'supports %s without physical deletion',
		async (status) => {
			await service.create({ ...valid, status, featured: true });
			expect(model.create.mock.calls[0][0]).toMatchObject({ status, featured: true });
			await service.update({ _id: id, status });
			expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({ $set: { status } });
		},
	);
	it('does not publish a featured draft', async () => {
		await service.create({ ...valid, featured: true });
		expect(model.create.mock.calls[0][0].status).toBe(CrewStatus.DRAFT);
	});
	it.each([
		{ role: undefined },
		{ firstName: undefined },
		{ firstName: '   ' },
		{ role: 'DECKHAND' },
		{ role: 'CREW' },
		{ status: 'INVALID' },
		{ experienceYears: -1 },
		{ experienceYears: 1.5 },
		{ experienceYears: Infinity },
		{ experienceYears: NaN },
		{ experienceYears: '10' },
		{ memberId: 'invalid' },
		{ memberId: null },
		{ languages: [''] },
		{ languages: ['   '] },
		{ languages: ['English', ' English '] },
		{ languages: [10] },
		{ languages: 'English' },
		{ images: [''] },
		{ profileImage: 10 },
		{ featured: 'true' },
		{ firstName: null },
		{ experienceYears: null },
		{ password: 'do-not-store' },
		{ googleId: 'do-not-store' },
		{ email: 'private@example.com' },
	])('rejects invalid creation fields %j before database access', async (fields) => {
		await expect(service.create({ ...valid, ...fields } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(model.create).not.toHaveBeenCalled();
		expect(members.exists).not.toHaveBeenCalled();
	});
	it.each([
		{ role: 'ENGINEER' },
		{ firstName: '' },
		{ featured: null },
		{ experienceYears: -1 },
		{ experienceYears: '3' },
		{ memberId: 'bad' },
		{ memberId: null },
		{ _id: 'bad' },
		{ jwt: 'do-not-store' },
	])('validates only supplied update fields %j', async (fields) => {
		await expect(service.update({ _id: id, ...fields } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('updates one field without resetting featured, role, names, experience or member link', async () => {
		const result = await service.update({ _id: id, bio: 'New biography', experienceYears: undefined });
		expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
			id,
			{ $set: { bio: 'New biography' } },
			{ new: true, runValidators: true },
		);
		expect(result).toMatchObject({ featured: true, experienceYears: 12 });
		expect(members.exists).not.toHaveBeenCalled();
	});
	it('accepts explicit false, zero and empty arrays as updates', async () => {
		await service.update({ _id: id, featured: false, experienceYears: 0, languages: [], images: [] });
		expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({
			$set: { featured: false, experienceYears: 0, languages: [], images: [] },
		});
	});
	it('reports a missing profile on update', async () => {
		updateExec.mockResolvedValue(null);
		await expect(service.update({ _id: id, bio: 'New biography' })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('verifies a linked member exists without fetching authentication data or mutating roles', async () => {
		await service.create({ ...valid, memberId });
		expect(members.exists).toHaveBeenCalledWith({ _id: memberId });
		expect(model.exists).toHaveBeenCalledWith({ memberId });
		expect(model.create.mock.calls[0][0].memberId).toBe(memberId);
	});
	it('allows reasserting the same member link during update by excluding the current profile', async () => {
		await service.update({ _id: id, memberId });
		expect(model.exists).toHaveBeenCalledWith({ memberId, _id: { $ne: id } });
	});
	it('rejects nonexistent linked members on create and update', async () => {
		members.exists.mockResolvedValue(null);
		await expect(service.create({ ...valid, memberId })).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.update({ _id: id, memberId })).rejects.toBeInstanceOf(BadRequestException);
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('rejects duplicate links on create and update regardless of profile status', async () => {
		model.exists.mockResolvedValue({ _id: 'another-profile' });
		await expect(service.create({ ...valid, memberId })).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.update({ _id: id, memberId })).rejects.toBeInstanceOf(BadRequestException);
		expect(model.create).not.toHaveBeenCalled();
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
	it('handles unique-index races on create and update without exposing MongoDB details', async () => {
		const error = { code: 11000, message: 'internal duplicate key details', keyValue: { memberId } };
		model.create.mockRejectedValue(error);
		updateExec.mockRejectedValue(error);
		await expect(service.create({ ...valid, memberId })).rejects.toThrow(
			'A crew profile already exists for this member',
		);
		await expect(service.update({ _id: id, memberId })).rejects.toThrow(
			'A crew profile already exists for this member',
		);
	});
	it('preserves unexpected errors for the existing GraphQL formatter', async () => {
		const error = new Error('unexpected');
		model.create.mockRejectedValue(error);
		await expect(service.create(valid)).rejects.toBe(error);
	});
});

describe('CrewService collection queries', () => {
	let aggregate: jest.Mock, service: CrewService;
	const catalog = (fields: Partial<CrewCatalogInput> = {}) => ({ ...new CrewCatalogInput(), ...fields });
	beforeEach(() => {
		aggregate = jest.fn().mockResolvedValue([{ list: [{ _id: id }], meta: [{ total: 41 }] }]);
		service = new CrewService({ aggregate } as never, {} as never);
	});
	it.each([CrewStatus.DRAFT, CrewStatus.PUBLISHED, CrewStatus.ARCHIVED])(
		'overrides public %s and allows staff to filter it',
		async (status) => {
			await service.catalog(catalog({ filter: { status } }));
			expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: CrewStatus.PUBLISHED });
			await service.getForStaff(catalog({ filter: { status } }));
			expect(aggregate.mock.calls[1][0][0].$match).toEqual({ status });
		},
	);
	it.each([CrewRole.CAPTAIN, CrewRole.CHEF])('filters %s at MongoDB level', async (role) => {
		await service.catalog(catalog({ filter: { role } }));
		expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: CrewStatus.PUBLISHED, role });
	});
	it('shares all filters, sorting, count and pagination with staff', async () => {
		const input = catalog({
			filter: {
				nationality: ' French ',
				location: 'Cannes (FR)',
				language: 'English+',
				featured: false,
				minExperienceYears: 0,
				maxExperienceYears: 12,
			},
			sortBy: CrewSortBy.EXPERIENCE_DESC,
			page: 2,
			limit: 10,
		});
		await service.catalog(input);
		await service.getForStaff(input);
		const publicPipeline = aggregate.mock.calls[0][0],
			staffPipeline = aggregate.mock.calls[1][0];
		const { status, ...match } = publicPipeline[0].$match;
		expect(match).toEqual(staffPipeline[0].$match);
		expect(publicPipeline.slice(1)).toEqual(staffPipeline.slice(1));
		expect(match).toMatchObject({ experienceYears: { $gte: 0, $lte: 12 }, featured: false });
		expect(match.nationality.test('french')).toBe(true);
		expect(match.nationality.test('French Canadian')).toBe(false);
		expect(match.location.test('Port Cannes (FR)')).toBe(true);
		expect(match.location.test('Cannes FR')).toBe(false);
		expect(match.languages.test('english+')).toBe(true);
		expect(match.languages.test('English')).toBe(false);
	});
	it('forces published and featured constraints even when client requests otherwise', async () => {
		await service.catalog(catalog({ filter: { status: CrewStatus.DRAFT, featured: false } }), true);
		expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: CrewStatus.PUBLISHED, featured: true });
	});
	it.each([
		[CrewSortBy.NEWEST, 'createdAt', -1],
		[CrewSortBy.EXPERIENCE_ASC, 'experienceYears', 1],
		[CrewSortBy.EXPERIENCE_DESC, 'experienceYears', -1],
		[CrewSortBy.NAME_ASC, '_crewSortName', 1],
		[CrewSortBy.NAME_DESC, '_crewSortName', -1],
	])('sorts %s deterministically', async (sortBy, field, direction) => {
		await service.catalog(catalog({ sortBy }));
		const pipeline = aggregate.mock.calls[0][0];
		expect(pipeline.find((stage) => stage.$sort).$sort).toEqual({ [field]: direction, _id: -1 });
		if (field === '_crewSortName') {
			expect(pipeline[1].$set._crewSortName.$ifNull[0]).toBe('$displayName');
			expect(pipeline[pipeline.length - 1].$facet.list).toContainEqual({ $project: { _crewSortName: 0 } });
		} else expect(pipeline.some((stage) => stage.$set)).toBe(false);
	});
	it.each([{}, { page: 2, limit: 10 }, { limit: 50 }, { page: 100, limit: 3 }])(
		'returns canonical wrapper and MongoDB pagination for %j',
		async (overrides) => {
			const result = await service.catalog(catalog(overrides));
			const page = overrides.page ?? 1,
				limit = overrides.limit ?? 20;
			const facet = aggregate.mock.calls[0][0].find((stage) => stage.$facet).$facet;
			expect(facet.list).toEqual([{ $skip: (page - 1) * limit }, { $limit: limit }]);
			expect(facet.meta).toEqual([{ $count: 'total' }]);
			expect(result).toEqual({ list: [{ _id: id }], total: 41, page, limit, totalPages: Math.ceil(41 / limit) });
		},
	);
	it('returns empty metadata for no matches and preserves total on empty pages', async () => {
		aggregate.mockResolvedValueOnce([{ list: [], meta: [] }]);
		expect(await service.catalog(catalog())).toEqual({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });
		aggregate.mockResolvedValueOnce([{ list: [], meta: [{ total: 41 }] }]);
		expect(await service.catalog(catalog({ page: 4 }))).toEqual({
			list: [],
			total: 41,
			page: 4,
			limit: 20,
			totalPages: 3,
		});
	});
	it('treats explicit null query options as omitted', async () => {
		await service.catalog({
			page: null,
			limit: null,
			sortBy: null,
			filter: { minExperienceYears: null, featured: null },
		} as never);
		expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: CrewStatus.PUBLISHED });
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: -1 },
		{ limit: Infinity },
		{ page: '1' },
		{ sortBy: 'INVALID' },
		{ filter: { role: 'CREW' } },
		{ filter: { minExperienceYears: -1 } },
		{ filter: { minExperienceYears: 1.5 } },
		{ filter: { minExperienceYears: 5, maxExperienceYears: 4 } },
		{ filter: { language: ' ' } },
		{ filter: { nationality: 1 } },
		{ filter: { password: 'invalid' } },
	])('rejects invalid catalog input %j before database access', async (input) => {
		await expect(service.catalog(input as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(aggregate).not.toHaveBeenCalled();
	});
});

describe('Crew public details and display names', () => {
	it('requires PUBLISHED independently for detail queries', async () => {
		const findOne = jest.fn().mockReturnValue({ lean: () => ({ exec: async () => ({ _id: id, ...valid }) }) });
		const service = new CrewService({ findOne } as never, {} as never);
		await expect(service.getById(id)).resolves.toMatchObject(valid);
		expect(findOne).toHaveBeenCalledWith({ _id: id, status: CrewStatus.PUBLISHED });
	});
	it('rejects invalid IDs and missing/unpublished records', async () => {
		const findOne = jest.fn().mockReturnValue({ lean: () => ({ exec: async () => null }) });
		const service = new CrewService({ findOne } as never, {} as never);
		await expect(service.getById('invalid')).rejects.toBeInstanceOf(BadRequestException);
		expect(findOne).not.toHaveBeenCalled();
		await expect(service.getById(id)).rejects.toBeInstanceOf(NotFoundException);
	});
	it('derives presentation names without changing profiles', () => {
		const resolver = new CrewResolver({} as never);
		const profile = { ...valid };
		expect(resolver.resolveDisplayName(profile as never)).toBe('Aurelis Captain');
		expect(profile).not.toHaveProperty('displayName');
		expect(resolver.resolveDisplayName({ firstName: 'Aurelis' } as never)).toBe('Aurelis');
		expect(resolver.resolveDisplayName({ ...profile, displayName: 'Captain A' } as never)).toBe('Captain A');
	});
});
