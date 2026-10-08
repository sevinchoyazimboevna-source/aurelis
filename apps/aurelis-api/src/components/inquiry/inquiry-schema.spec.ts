import mongoose from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import YachtInquirySchema from '../../libs/schemas/YachtInquiry.model';
import { CreateCharterInquiryInput, CreateYachtInquiryInput } from '../../libs/dto/inquiry/yacht-inquiry.input';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';
import { charterFields, inquiryTestId } from './inquiry-test-fixture';

describe('Canonical YachtInquiry schema/input (offline)', () => {
	const Model = mongoose.model('Step9InquirySchemaTest', YachtInquirySchema);
	afterAll(() => mongoose.deleteModel('Step9InquirySchemaTest'));
	it.each(Object.values(InquiryType))(
		'preserves %s records in one timestamped collection with optional member link',
		(type) => {
			const row = new Model({ ...charterFields(), type });
			expect(row.validateSync()).toBeUndefined();
			expect(row.status).toBe(InquiryStatus.NEW);
			expect(row.memberId).toBeUndefined();
			expect(YachtInquirySchema.get('collection')).toBe('yachtInquiries');
			expect(YachtInquirySchema.get('timestamps')).toBe(true);
		},
	);
	it('adds Member reference without replacing dates, price fields or existing indexes', () => {
		const row = new Model({ ...charterFields(), type: InquiryType.CHARTER, memberId: inquiryTestId(1) });
		expect(row.memberId).toBeInstanceOf(mongoose.Types.ObjectId);
		expect(row.startDate).toEqual(charterFields().startDate);
		expect(row.toObject()).not.toHaveProperty('charterPrice');
		expect(YachtInquirySchema.indexes().map(([index]) => index)).toEqual([
			{ status: 1, createdAt: -1 },
			{ yachtId: 1, createdAt: -1 },
			{ type: 1, status: 1, createdAt: -1, _id: -1 },
		]);
	});
	it.each([0, -1, 1.5])('rejects invalid persisted guest count %s', (guestCount) => {
		expect(new Model({ ...charterFields(), type: InquiryType.CHARTER, guestCount }).validateSync()).toBeDefined();
	});
	it('preserves legacy SALES without dates, phone, member or guest count', () => {
		const row = new Model({
			type: InquiryType.SALES,
			yachtId: inquiryTestId(14),
			name: 'Buyer',
			email: 'buyer@example.com',
			message: 'Please provide details.',
		});
		expect(row.validateSync()).toBeUndefined();
		row.set('guestCount', null);
		expect(row.validateSync()).toBeUndefined();
		expect(
			validateSync(plainToInstance(CreateYachtInquiryInput, row.toObject()), { whitelist: false }).map(
				(error) => error.property,
			),
		).not.toContain('startDate');
	});
	it('requires charter facade dates but keeps generic date nullability', () => {
		const { startDate, endDate, ...input } = charterFields();
		void startDate;
		void endDate;
		expect(
			validateSync(plainToInstance(CreateCharterInquiryInput, input))
				.map((error) => error.property)
				.sort(),
		).toEqual(['endDate', 'startDate']);
		expect(validateSync(plainToInstance(CreateYachtInquiryInput, { ...input, type: InquiryType.SALES }))).toEqual([]);
	});
});
