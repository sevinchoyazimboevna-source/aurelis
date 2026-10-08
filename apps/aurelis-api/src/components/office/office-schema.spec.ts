import mongoose from 'mongoose';
import OfficeSchema from '../../libs/schemas/Office.model';
import BrokerSchema from '../../libs/schemas/BrokerProfile.model';
import { validOfficeBusinessHours, validOfficeTimezone } from '../../libs/validators/office-business-hours';
import { OfficeService } from './office.service';

describe('Office schema and business hours (offline)', () => {
	const Office = mongoose.model('Step6OfficeSchemaTest', OfficeSchema);
	const Broker = mongoose.model('Step6BrokerSchemaTest', BrokerSchema);
	const valid = {
		name: 'Test Office',
		slug: 'test-office',
		country: 'Country',
		city: 'City',
		addressLine1: 'Street 1',
	};
	const hours = { day: 'MONDAY', openTime: '09:00', closeTime: '18:30', closed: false };
	afterAll(() => {
		mongoose.deleteModel('Step6OfficeSchemaTest');
		mongoose.deleteModel('Step6BrokerSchemaTest');
	});
	it('uses one collection, timestamps, defaults and embedded hours without IDs', () => {
		const record = new Office({ ...valid, businessHours: [hours] });
		expect(record.validateSync()).toBeUndefined();
		expect(record.toObject()).toMatchObject({
			status: 'DRAFT',
			featured: false,
			sortOrder: 0,
			images: [],
			businessHours: [hours],
		});
		expect(record.toObject().businessHours[0]._id).toBeUndefined();
		expect(OfficeSchema.get('collection')).toBe('offices');
		expect(OfficeSchema.get('timestamps')).toBe(true);
	});
	it('stores contact/address/presentation values with path conventions', () => {
		const fields = {
			...valid,
			phone: '+00 (123) 456 ext 7',
			email: ' INFO@EXAMPLE.COM ',
			timezone: 'Europe/London',
			addressLine2: 'Floor 2',
			postalCode: 'AB 12',
			shortDescription: 'Short',
			description: 'Long',
			heroImage: '/uploads/office.jpg',
			images: ['https://example.com/gallery.jpg'],
		};
		const record = new Office(fields);
		expect(record.validateSync()).toBeUndefined();
		expect(record.toObject()).toMatchObject({ ...fields, email: 'info@example.com' });
	});
	it.each([
		{ name: ' ' },
		{ country: '' },
		{ city: ' ' },
		{ addressLine1: '' },
		{ slug: 'a/b' },
		{ status: 'BAD' },
		{ email: 'bad' },
		{ timezone: 'Invalid/Zone' },
		{ sortOrder: -1 },
		{ sortOrder: 0.5 },
	])('rejects invalid persisted values %j', (patch) => {
		expect(new Office({ ...valid, ...patch }).validateSync()).toBeDefined();
	});
	it.each(
		[
			[{ ...hours, day: 'FUNDAY' }],
			[{ ...hours, openTime: '9:00' }],
			[{ ...hours, closeTime: '24:00' }],
			[{ ...hours, closeTime: '09:00' }],
			[{ ...hours, closeTime: '08:00' }],
			[{ ...hours, closed: true }],
			[{ ...hours, openTime: null }],
			[hours, hours],
		].map((schedule) => [schedule]),
	)('rejects invalid schedules %j at service and schema boundaries', async (businessHours) => {
		expect(validOfficeBusinessHours(businessHours)).toBe(false);
		expect(new Office({ ...valid, businessHours }).validateSync()).toBeDefined();
		const service = new OfficeService({ create: jest.fn() } as any);
		await expect(service.create({ ...valid, businessHours } as any)).rejects.toThrow('Invalid office');
	});
	it.each(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])(
		'accepts %s with valid local hours',
		(day) => {
			expect(validOfficeBusinessHours([{ ...hours, day }])).toBe(true);
		},
	);
	it('accepts closed days with absent/null times, complete replacements and empty schedules', () => {
		for (const businessHours of [
			[],
			[{ day: 'SUNDAY', closed: true }],
			[{ day: 'SUNDAY', closed: true, openTime: null, closeTime: null }],
		]) {
			expect(validOfficeBusinessHours(businessHours)).toBe(true);
			expect(new Office({ ...valid, businessHours }).validateSync()).toBeUndefined();
		}
	});
	it('validates timezone through Intl without using local timezone', () => {
		expect(validOfficeTimezone('Asia/Dubai')).toBe(true);
		expect(validOfficeTimezone('')).toBe(false);
		expect(validOfficeTimezone('Invalid/Zone')).toBe(false);
	});
	it('declares slug uniqueness and justified curated query indexes only', () => {
		expect(OfficeSchema.indexes()).toHaveLength(3);
		expect(OfficeSchema.indexes()).toContainEqual([{ slug: 1 }, expect.objectContaining({ unique: true })]);
	});
	it('keeps legacy brokers valid with an optional BSON Office link', () => {
		for (const fields of [{}, { officeId: new mongoose.Types.ObjectId() }]) {
			expect(new Broker({ name: 'Broker', email: 'broker@example.com', ...fields }).validateSync()).toBeUndefined();
		}
		expect(
			new Broker({ name: 'Broker', email: 'broker@example.com', officeId: 'invalid' }).validateSync(),
		).toBeDefined();
		expect(BrokerSchema.path('officeId').options.ref).toBe('Office');
		expect(BrokerSchema.indexes().map(([keys]) => keys)).toEqual([{ email: 1 }]);
	});
});
