import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { YachtInquiry } from '../../libs/dto/inquiry/yacht-inquiry';
import { InquiryService } from './inquiry.service';
import { charterFields, inquiryFixture, inquiryTestId } from './inquiry-test-fixture';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';

describe('Charter inquiry workflow service (offline)', () => {
	let f: ReturnType<typeof inquiryFixture>;
	let service: InquiryService;
	beforeEach(() => {
		f = inquiryFixture();
		service = new InquiryService(f.model as unknown as Model<YachtInquiry>, f.yachtService);
	});
	it('shares normalization between charter facade and legacy CHARTER, forcing NEW without price snapshot', async () => {
		const input = {
			...charterFields(),
			name: ' Alex Charter ',
			email: ' Alex@Example.COM ',
			phone: ' +998 (90) 123-45-67 ext 2 ',
			message: ' Please send charter particulars. ',
		};
		await service.createCharter(input);
		await service.create({ ...input, type: InquiryType.CHARTER });
		expect(f.model.create.mock.calls[0][0]).toEqual(f.model.create.mock.calls[1][0]);
		expect(f.model.create.mock.calls[0][0]).toMatchObject({
			type: InquiryType.CHARTER,
			status: InquiryStatus.NEW,
			name: 'Alex Charter',
			email: 'alex@example.com',
			phone: '+998 (90) 123-45-67 ext 2',
		});
		expect(f.model.create.mock.calls[0][0]).not.toHaveProperty('memberId');
		expect(f.model.create.mock.calls[0][0]).not.toHaveProperty('charterPrice');
	});
	it.each([10, 11])('accepts public CHARTER-capable yacht %s through real public YachtService', async (n) => {
		await service.createCharter({ ...charterFields(), yachtId: inquiryTestId(n) });
		expect(f.yachtModel.findOne).toHaveBeenCalledWith({ _id: inquiryTestId(n), status: 'PUBLISHED' });
		expect(f.records[0].type).toBe(InquiryType.CHARTER);
	});
	it.each([12, 13, 99])('rejects hidden/missing yacht %s', async (n) => {
		await expect(service.createCharter({ ...charterFields(), yachtId: inquiryTestId(n) })).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it('rejects SALE-only yacht without changing InquiryType.SALES', async () => {
		await expect(service.createCharter({ ...charterFields(), yachtId: inquiryTestId(14) })).rejects.toThrow(
			'not listed for charter',
		);
		const { startDate, endDate, guestCount, ...contact } = charterFields();
		void startDate;
		void endDate;
		void guestCount;
		await service.create({ ...contact, yachtId: inquiryTestId(14), type: InquiryType.SALES });
		expect(f.records[0].type).toBe(InquiryType.SALES);
	});
	it.each([
		{ yachtId: 'bad' },
		{ name: ' ' },
		{ name: 'x'.repeat(121) },
		{ email: 'bad' },
		{ phone: 123 },
		{ phone: 'x'.repeat(41) },
		{ message: 'short' },
		{ message: 'x'.repeat(4001) },
		{ startDate: undefined },
		{ endDate: undefined },
		{ startDate: new Date('invalid') },
		{ endDate: new Date('invalid') },
		{ guestCount: 0 },
		{ guestCount: -1 },
		{ guestCount: 1.5 },
		{ guestCount: 9 },
	])('rejects invalid charter input %j', async (patch) => {
		await expect(service.createCharter({ ...charterFields(), ...patch } as never)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(f.model.create).not.toHaveBeenCalled();
	});
	it.each([new Date('2027-08-01T00:00:00Z'), new Date('2027-07-31T00:00:00Z')])(
		'rejects end date <= start',
		async (endDate) => {
			await expect(service.createCharter({ ...charterFields(), endDate })).rejects.toThrow(
				'End date must be after start date',
			);
		},
	);
	it('preserves historical past-date acceptance and optional phone/guest count', async () => {
		const { guestCount, ...input } = charterFields();
		void guestCount;
		await service.createCharter({ ...input, startDate: new Date('2020-08-01'), endDate: new Date('2020-08-10') });
		expect(f.records[0].guestCount).toBeUndefined();
		expect(f.records[0].phone).toBeUndefined();
	});
	it.each([1, 8])('accepts guest count %s up to capacity', async (guestCount) => {
		await service.createCharter({ ...charterFields(), guestCount });
		expect(f.records).toHaveLength(1);
	});
	it.each([undefined, 0, -1, NaN, 3.5])('does not invent missing/invalid legacy capacity %s', async (guests) => {
		f.yachts.get(inquiryTestId(10))!.guests = guests;
		await service.createCharter({ ...charterFields(), guestCount: 20 });
		expect(f.records).toHaveLength(1);
	});
	it.each(['type', 'status', 'memberId', 'charterPrice'])(
		'rejects client-controlled %s through the charter service boundary',
		async (field) => {
			await expect(service.createCharter({ ...charterFields(), [field]: 'spoof' })).rejects.toBeInstanceOf(
				BadRequestException,
			);
		},
	);
	it.each(Object.values(MemberRole))('attaches verified %s Member from context only', async (role) => {
		const member = {
			_id: inquiryTestId(1),
			email: 'account@example.com',
			role,
			status: MemberStatus.ACTIVE,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		await service.createCharter(charterFields(), member);
		expect(f.model.create.mock.calls[0][0].memberId).toEqual(new Types.ObjectId(inquiryTestId(1)));
		expect(f.records[0].email).toBe('alex@example.com');
	});
	it('allows legitimate repeat submissions without arbitrary cooldown or duplicate-suppression window', async () => {
		await service.createCharter(charterFields());
		await service.createCharter(charterFields());
		expect(f.records).toHaveLength(2);
		expect(f.records[0]._id).not.toEqual(f.records[1]._id);
	});
	it('filters both SALES and CHARTER, status, BSON links, exact contact email and inclusive creation range', async () => {
		const member = {
			_id: inquiryTestId(1),
			email: 'account@example.com',
			role: MemberRole.USER,
			status: MemberStatus.ACTIVE,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		await service.createCharter(charterFields(), member);
		f.records[0].createdAt = new Date('2026-10-06T00:00:00Z');
		const result = await service.catalog({
			type: InquiryType.CHARTER,
			status: InquiryStatus.NEW,
			yachtId: inquiryTestId(10),
			memberId: inquiryTestId(1),
			email: ' ALEX@EXAMPLE.COM ',
			createdFrom: new Date('2026-10-06'),
			createdTo: new Date('2026-10-06'),
			page: 1,
			limit: 20,
		});
		expect(result.total).toBe(1);
		expect(f.model.find.mock.calls[0][0]).toEqual(f.model.countDocuments.mock.calls[0][0]);
		expect(f.model.find.mock.calls[0][0]).toMatchObject({
			yachtId: new Types.ObjectId(inquiryTestId(10)),
			memberId: new Types.ObjectId(inquiryTestId(1)),
			email: 'alex@example.com',
		});
	});
	it('preserves legacy limit-100 clamping while new catalog validates a 50 cap', async () => {
		expect(await service.list({ limit: 200, page: 1 })).toMatchObject({ limit: 100, totalPages: 0 });
		expect(await service.catalog({ limit: 50, page: 1 })).toMatchObject({ limit: 50 });
		await expect(service.catalog({ limit: 51, page: 1 })).rejects.toBeInstanceOf(BadRequestException);
	});
	it.each([
		{ page: 0 },
		{ page: -1 },
		{ page: 1.5 },
		{ limit: 0 },
		{ limit: 1.5 },
		{ yachtId: 'bad' },
		{ memberId: 'bad' },
		{ email: 'bad' },
		{ type: 'SALE' },
		{ status: 'BOOKED' },
		{ createdFrom: new Date('invalid') },
		{ createdFrom: new Date('2026-10-07'), createdTo: new Date('2026-10-06') },
	])('rejects invalid admin input %j', async (patch) => {
		await expect(service.catalog({ page: 1, limit: 20, ...patch } as never)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(f.model.find).not.toHaveBeenCalled();
	});
	it('paginates in MongoDB with stable newest-first ordering and additive metadata', async () => {
		await service.createCharter(charterFields());
		await service.createCharter(charterFields());
		const date = new Date('2026-10-06');
		f.records.forEach((row) => (row.createdAt = date));
		const result = await service.catalog({ page: 2, limit: 1 });
		expect(result).toMatchObject({ total: 2, page: 2, limit: 1, totalPages: 2 });
		expect(result.list[0]._id).toEqual(f.records[0]._id);
		const findResult = f.model.find.mock.results[0];
		if (findResult.type !== 'return') throw new Error('Expected a query builder');
		const query = findResult.value;
		expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
		expect(query.skip).toHaveBeenCalledWith(1);
		expect(query.limit).toHaveBeenCalledWith(1);
	});
	it.each(
		Object.values(InquiryStatus).flatMap((from) => Object.values(InquiryStatus).map((to) => [from, to] as const)),
	)('allows %s -> %s with a narrow status-only write', async (from, status) => {
		await service.createCharter(charterFields());
		f.records[0].status = from;
		const id = f.records[0]._id.toHexString();
		await service.update({ _id: id, status });
		expect(f.model.findByIdAndUpdate).toHaveBeenCalledWith(id, { status }, { new: true, runValidators: true });
		expect(f.records[0].type).toBe(InquiryType.CHARTER);
	});
	it('returns admin detail without needing current Yacht visibility and rejects missing/invalid IDs', async () => {
		await service.createCharter(charterFields());
		f.yachts.delete(inquiryTestId(10));
		expect(await service.getById(f.records[0]._id.toHexString())).toBe(f.records[0]);
		await expect(service.getById('bad')).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.getById(inquiryTestId(99))).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.update({ _id: inquiryTestId(99), status: InquiryStatus.CLOSED })).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
	it.each(['type', 'yachtId', 'memberId'])('rejects ownership/discriminator edit %s', async (field) => {
		await expect(
			service.update({ _id: inquiryTestId(100), status: InquiryStatus.CONTACTED, [field]: 'spoof' }),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(f.model.findByIdAndUpdate).not.toHaveBeenCalled();
	});
});
