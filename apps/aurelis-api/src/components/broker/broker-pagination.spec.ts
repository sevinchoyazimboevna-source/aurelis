import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { BrokerService } from './broker.service';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { BrokerCatalogInput } from '../../libs/dto/broker/broker.input';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { OfficeService } from '../office/office.service';

describe('bounded Broker catalog', () => {
	const skip = jest.fn();
	const limit = jest.fn();
	const sort = jest.fn();
	const find = jest.fn();
	const countDocuments = jest.fn();
	let service: BrokerService;
	beforeEach(() => {
		jest.clearAllMocks();
		limit.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) });
		skip.mockReturnValue({ limit });
		sort.mockReturnValue({ skip });
		find.mockReturnValue({ sort });
		countDocuments.mockReturnValue({ exec: () => Promise.resolve(41) });
		service = new BrokerService(
			{ find, countDocuments } as unknown as Model<BrokerProfile>,
			{} as OfficeService,
			{} as Model<MemberRecord>,
		);
	});
	it('bounds omitted input and counts all active profiles independently', async () => {
		expect(await service.catalog()).toEqual({ list: [], total: 41, page: 1, limit: 20, totalPages: 3 });
		expect(find).toHaveBeenCalledWith({ isActive: true });
		expect(countDocuments).toHaveBeenCalledWith({ isActive: true });
		expect(sort).toHaveBeenCalledWith({ name: 1, _id: 1 });
		expect(skip).toHaveBeenCalledWith(0);
		expect(limit).toHaveBeenCalledWith(20);
	});
	it('fetches custom pages in MongoDB', async () => {
		expect(await service.catalog({ page: 3, limit: 10 })).toEqual({
			list: [],
			total: 41,
			page: 3,
			limit: 10,
			totalPages: 5,
		});
		expect(skip).toHaveBeenCalledWith(20);
		expect(limit).toHaveBeenCalledWith(10);
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ limit: 0 },
		{ limit: 51 },
		{ limit: null },
		{ page: null },
		{ page: Number.MAX_SAFE_INTEGER, limit: 50 },
	])('rejects invalid bounds before DB reads: %j', async (input) => {
		await expect(service.catalog(input as BrokerCatalogInput)).rejects.toBeInstanceOf(BadRequestException);
		expect(find).not.toHaveBeenCalled();
	});
	it('reports zero pages for an empty catalog', async () => {
		countDocuments.mockReturnValue({ exec: () => Promise.resolve(0) });
		expect((await service.catalog()).totalPages).toBe(0);
	});
});
