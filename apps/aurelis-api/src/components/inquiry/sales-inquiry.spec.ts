import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { YachtInquiry } from '../../libs/dto/inquiry/yacht-inquiry';
import { InquiryService } from './inquiry.service';
import { charterFields, inquiryFixture, inquiryTestId, salesFields } from './inquiry-test-fixture';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';
import { YachtListingMode } from '../../libs/enums/yacht.enum';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';

describe('Sales inquiry workflow service (offline)', () => {
	let f: ReturnType<typeof inquiryFixture>;
	let service: InquiryService;
	beforeEach(() => {
		f = inquiryFixture();
		service = new InquiryService(f.model as unknown as Model<YachtInquiry>, f.yachtService);
	});
	it('shares contact normalization and SALES/NEW persistence with generic submission without price snapshot', async () => {
		const input = {
			...salesFields(),
			name: ' Alex Buyer ',
			email: ' BUYER@Example.COM ',
			phone: ' +998 (90) 123-45-67 ext 2 ',
			message: ' Please send sale particulars. ',
		};
		const yachtBefore = { ...f.yachts.get(input.yachtId) };
		await service.createSales(input);
		await service.create({ ...input, type: InquiryType.SALES });
		expect(f.model.create.mock.calls[0][0]).toEqual(f.model.create.mock.calls[1][0]);
		expect(f.model.create.mock.calls[0][0]).toEqual({
			...salesFields(),
			phone: '+998 (90) 123-45-67 ext 2',
			type: InquiryType.SALES,
			status: InquiryStatus.NEW,
		});
		expect(f.yachts.get(input.yachtId)).toEqual(yachtBefore);
		expect(f.records[0]).not.toHaveProperty('salePrice');
	});
	it.each([11, 14])('accepts public SALE-capable yacht %s without charter dates or guests', async (n) => {
		await service.createSales({ ...salesFields(), yachtId: inquiryTestId(n) });
		expect(f.yachtModel.findOne).toHaveBeenCalledWith({ _id: inquiryTestId(n), status: 'PUBLISHED' });
		expect(f.records[0]).toMatchObject({ type: InquiryType.SALES, status: InquiryStatus.NEW });
		expect(f.records[0].startDate).toBeUndefined();
		expect(f.records[0].guestCount).toBeUndefined();
	});
	it.each([12, 13, 99])('rejects hidden SALE or missing yacht %s through canonical visibility lookup', async (n) => {
		const yacht = f.yachts.get(inquiryTestId(n));
		if (yacht) yacht.listingModes = [YachtListingMode.SALE];
		for (const create of [
			() => service.createSales({ ...salesFields(), yachtId: inquiryTestId(n) }),
			() => service.create({ ...salesFields(), yachtId: inquiryTestId(n), type: InquiryType.SALES }),
		])
			await expect(create()).rejects.toBeInstanceOf(NotFoundException);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it('rejects CHARTER-only yachts through both sales submission paths', async () => {
		await expect(service.createSales({ ...salesFields(), yachtId: inquiryTestId(10) })).rejects.toThrow(
			'not listed for sales',
		);
		await expect(
			service.create({ ...salesFields(), yachtId: inquiryTestId(10), type: InquiryType.SALES }),
		).rejects.toThrow('not listed for sales');
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it.each([
		{ yachtId: 'bad' },
		{ name: ' ' },
		{ name: 'A' },
		{ name: 'x'.repeat(121) },
		{ name: null },
		{ email: 'bad' },
		{ email: null },
		{ phone: 123 },
		{ phone: 'x'.repeat(41) },
		{ message: 'short' },
		{ message: ' ' },
		{ message: null },
		{ message: 'x'.repeat(4001) },
	])('rejects invalid contact/identity input %j before persistence', async (patch) => {
		for (const create of [
			() => service.createSales({ ...salesFields(), ...patch } as never),
			() => service.create({ ...salesFields(), type: InquiryType.SALES, ...patch } as never),
		])
			await expect(create()).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it.each([undefined, null, '', '+44 (0)20 1234 5678 ext 10'])(
		'preserves optional broad phone contract %s',
		async (phone) => {
			await service.createSales({ ...salesFields(), phone } as never);
			expect(f.records).toHaveLength(1);
		},
	);
	it.each(['type', 'status', 'memberId', 'salePrice', 'budget', 'currency', 'startDate', 'endDate', 'guestCount'])(
		'rejects unsupported or client-controlled facade field %s',
		async (field) => {
			await expect(service.createSales({ ...salesFields(), [field]: 'spoof' })).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(f.model.create).not.toHaveBeenCalled();
		},
	);
	it.each(Object.values(MemberRole))('derives %s member link without overriding buyer contacts', async (role) => {
		await service.createSales(salesFields(), {
			_id: inquiryTestId(1),
			email: 'account@example.com',
			role,
			status: MemberStatus.ACTIVE,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		expect(f.records[0].memberId).toEqual(new Types.ObjectId(inquiryTestId(1)));
		expect(f.records[0]).toMatchObject({ name: 'Alex Buyer', email: 'buyer@example.com' });
	});
	it('keeps SALES/SALE separate from CHARTER and preserves optional generic sales charter fields', async () => {
		await service.createSales({ ...salesFields(), yachtId: inquiryTestId(11) });
		await service.createCharter({ ...charterFields(), yachtId: inquiryTestId(11) });
		await service.create({ ...charterFields(), yachtId: inquiryTestId(11), type: InquiryType.SALES });
		expect(f.records.map((row) => row.type)).toEqual(['SALES', 'CHARTER', 'SALES']);
		expect(f.records[2].startDate).toEqual(charterFields().startDate);
		expect(f.records[2].guestCount).toBe(4);
	});
	it('allows legitimate repeated buyer inquiries', async () => {
		await service.createSales(salesFields());
		await service.createSales(salesFields());
		expect(f.records).toHaveLength(2);
		expect(f.records[0]._id).not.toEqual(f.records[1]._id);
	});
	it('uses shared SALES/CHARTER filters and stable pages while retaining legacy limit 100', async () => {
		await service.createSales(salesFields());
		await service.createCharter(charterFields());
		await service.createSales(salesFields());
		f.records.forEach((row) => (row.createdAt = new Date('2026-10-06')));
		const result = await service.catalog({ type: InquiryType.SALES, page: 2, limit: 1 });
		expect(result).toMatchObject({ total: 2, page: 2, limit: 1, totalPages: 2 });
		expect(result.list[0]._id).toEqual(f.records[0]._id);
		expect((await service.list({ type: InquiryType.SALES, page: 1, limit: 200 })).limit).toBe(100);
		expect((await service.catalog({ type: InquiryType.CHARTER, page: 1, limit: 20 })).total).toBe(1);
	});
	it.each(
		Object.values(InquiryStatus).flatMap((from) => Object.values(InquiryStatus).map((to) => [from, to] as const)),
	)('preserves SALES %s -> %s status-only transitions', async (from, status) => {
		await service.createSales(salesFields());
		const row = f.records[0];
		row.status = from;
		await service.update({ _id: row._id.toHexString(), status });
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(
			row._id.toHexString(),
			{ status },
			{ new: true, runValidators: true },
		);
		expect(row.type).toBe(InquiryType.SALES);
	});
	it('reads historical SALES detail even after Yacht removal and rejects type changes', async () => {
		await service.createSales(salesFields());
		f.yachts.clear();
		const id = f.records[0]._id.toHexString();
		expect(await service.getById(id)).toBe(f.records[0]);
		await expect(
			service.update({ _id: id, status: InquiryStatus.CLOSED, type: InquiryType.CHARTER }),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
});
