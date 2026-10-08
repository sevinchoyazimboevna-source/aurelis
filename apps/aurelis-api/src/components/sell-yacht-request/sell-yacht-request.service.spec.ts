import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { SellYachtRequest } from '../../libs/dto/sell-yacht-request/sell-yacht-request';
import { SellYachtRequestStatus } from '../../libs/enums/sell-yacht-request.enum';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';
import { SellYachtRequestService } from './sell-yacht-request.service';
import {
	invalidSellRequestPatches,
	sellRequestFields,
	sellRequestFixture,
	sellRequestTestId,
} from './sell-yacht-request-test-fixture';

describe('Sell yacht request service (offline)', () => {
	let f: ReturnType<typeof sellRequestFixture>;
	let service: SellYachtRequestService;
	beforeEach(() => {
		f = sellRequestFixture();
		service = new SellYachtRequestService(f.model as unknown as Model<SellYachtRequest>);
	});
	it('normalizes a guest lead with no inventory ID, forced NEW and no Member link', async () => {
		await service.create({
			...sellRequestFields(),
			ownerName: ' Alex Owner ',
			email: ' OWNER@Example.COM ',
			phone: ' +44 (0)20 1234 5678 ',
			yachtName: ' Owner Yacht ',
			builder: ' Builder ',
			model: ' Model ',
			location: ' Marina ',
			country: ' Italy ',
			description: ' Refit details. ',
			askingPrice: 1000000.25,
			currency: ' usd ',
		});
		expect(f.model.create).toHaveBeenCalledTimes(1);
		expect(f.model.create.mock.calls[0][0]).toEqual({
			...sellRequestFields(),
			status: SellYachtRequestStatus.NEW,
			model: 'Model',
			description: 'Refit details.',
			askingPrice: 1000000.25,
			currency: 'USD',
		});
		expect(f.records[0]).not.toHaveProperty('yachtId');
		expect(f.records[0]).not.toHaveProperty('memberId');
	});
	it.each(Object.values(MemberRole))(
		'links verified %s Member without contact replacement or role mutation',
		async (role) => {
			const member = {
				_id: sellRequestTestId(1),
				email: 'account@example.com',
				role,
				status: MemberStatus.ACTIVE,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const before = { ...member };
			await service.create(sellRequestFields(), member);
			expect(f.records[0].memberId).toEqual(new Types.ObjectId(member._id));
			expect(f.records[0].email).toBe('owner@example.com');
			expect(member).toEqual(before);
		},
	);
	it('rejects malformed trusted member identity', async () => {
		await expect(service.create(sellRequestFields(), { _id: 'bad' } as never)).rejects.toThrow();
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it.each(invalidSellRequestPatches.map((patch, n) => [n, patch] as const))(
		'rejects invalid input case %s',
		async (_n, patch) => {
			await expect(service.create({ ...sellRequestFields(), ...patch })).rejects.toBeInstanceOf(BadRequestException);
			expect(f.model.create).not.toHaveBeenCalled();
		},
	);
	it.each([NaN, Infinity, -Infinity])('rejects nonfinite length/amount %s', async (value) => {
		await expect(service.create({ ...sellRequestFields(), lengthM: value })).rejects.toBeInstanceOf(
			BadRequestException,
		);
		await expect(
			service.create({ ...sellRequestFields(), askingPrice: value, currency: 'USD' }),
		).rejects.toBeInstanceOf(BadRequestException);
	});
	it.each(['status', 'memberId', 'yachtId', 'brokerId', 'destinationIds', 'salePrice', 'images', 'listingModes'])(
		'rejects unsupported/client-controlled %s',
		async (field) => {
			await expect(service.create({ ...sellRequestFields(), [field]: 'spoof' })).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(f.model.create).not.toHaveBeenCalled();
		},
	);
	it('accepts omitted optional fields, currency without price and legitimate repeats', async () => {
		await service.create(sellRequestFields());
		await service.create(sellRequestFields());
		await service.create({ ...sellRequestFields(), currency: ' eur ' });
		expect(f.records).toHaveLength(3);
		expect(f.records[0].askingPrice).toBeUndefined();
		expect(f.records[0].model).toBeUndefined();
		expect(f.records[2].currency).toBe('EUR');
	});
	it('filters exact normalized country/builder/email/status in MongoDB with matching count predicate', async () => {
		await service.create(sellRequestFields());
		await service.create({ ...sellRequestFields(), country: 'France', builder: 'Other', email: 'other@example.com' });
		const result = await service.list({
			page: 1,
			limit: 20,
			status: SellYachtRequestStatus.NEW,
			country: ' Italy ',
			builder: ' Builder ',
			email: ' OWNER@Example.COM ',
		});
		expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
		expect(f.model.find.mock.calls[0][0]).toEqual({
			status: 'NEW',
			country: 'Italy',
			builder: 'Builder',
			email: 'owner@example.com',
		});
		expect(f.model.find.mock.calls[0][0]).toEqual(f.model.countDocuments.mock.calls[0][0]);
	});
	it('uses stable creation/ID order and database skip/limit, including empty/out-of-range pages', async () => {
		await service.create(sellRequestFields());
		await service.create(sellRequestFields());
		f.records.forEach((row) => (row.createdAt = new Date('2026-10-06')));
		const result = await service.list({ page: 2, limit: 1 });
		expect(result).toMatchObject({ total: 2, totalPages: 2, page: 2, limit: 1 });
		expect(result.list[0]._id).toEqual(f.records[0]._id);
		const queryResult = f.model.find.mock.results[0];
		if (queryResult.type !== 'return') throw new Error('Expected query builder');
		expect(queryResult.value.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
		expect(queryResult.value.skip).toHaveBeenCalledWith(1);
		expect(queryResult.value.limit).toHaveBeenCalledWith(1);
		expect(await service.list({ page: 3, limit: 1 })).toMatchObject({ list: [], total: 2 });
		expect(await service.list({ page: 1, limit: 50, country: 'Missing' })).toMatchObject({
			list: [],
			total: 0,
			totalPages: 0,
		});
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ page: null },
		{ page: '1' },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: 1.5 },
		{ limit: null },
		{ status: 'DRAFT' },
		{ status: null },
		{ country: ' ' },
		{ builder: ' ' },
		{ email: 'bad' },
		{ memberId: sellRequestTestId(1) },
	])('rejects invalid catalog %j', async (patch) => {
		await expect(service.list({ page: 1, limit: 20, ...patch } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.find).not.toHaveBeenCalled();
	});
	it('provides defaults and preserves requests after close; validates missing/detail IDs', async () => {
		await service.create(sellRequestFields());
		expect(await service.list({} as never)).toMatchObject({ page: 1, limit: 20 });
		const id = f.records[0]._id.toHexString();
		expect(await service.getById(id)).toBe(f.records[0]);
		await expect(service.getById('bad')).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.getById(sellRequestTestId(99))).rejects.toBeInstanceOf(NotFoundException);
		await expect(
			service.updateStatus({ requestId: sellRequestTestId(99), status: SellYachtRequestStatus.CLOSED }),
		).rejects.toBeInstanceOf(NotFoundException);
	});
	it.each(
		Object.values(SellYachtRequestStatus).flatMap((from) =>
			Object.values(SellYachtRequestStatus).map((to) => [from, to] as const),
		),
	)('permits %s -> %s with status-only write and retained owner/yacht data', async (from, status) => {
		await service.create(sellRequestFields());
		const row = f.records[0];
		row.status = from;
		await service.updateStatus({ requestId: row._id.toHexString(), status });
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(
			row._id.toHexString(),
			{ status },
			{ new: true, runValidators: true },
		);
		expect(row).toMatchObject({ ...sellRequestFields(), status });
		expect(f.records).toHaveLength(1);
	});
	it.each([
		{ requestId: 'bad' },
		{ status: 'PUBLISHED' },
		{ memberId: sellRequestTestId(2) },
		{ ownerName: 'Change' },
		{ askingPrice: 100 },
	])('rejects broad/invalid status editing %j', async (patch) => {
		await expect(
			service.updateStatus({
				requestId: sellRequestTestId(100),
				status: SellYachtRequestStatus.CLOSED,
				...patch,
			} as never),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
});
