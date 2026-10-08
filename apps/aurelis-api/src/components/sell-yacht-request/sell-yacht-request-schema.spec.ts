import mongoose from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import SellYachtRequestSchema from '../../libs/schemas/SellYachtRequest.model';
import { CreateSellYachtRequestInput } from '../../libs/dto/sell-yacht-request/sell-yacht-request.input';
import { validSellYachtBuildYear } from '../../libs/validators/sell-yacht-request';
import { SellYachtRequestStatus } from '../../libs/enums/sell-yacht-request.enum';
import { sellRequestFields, sellRequestTestId } from './sell-yacht-request-test-fixture';

describe('Sell yacht request schema/input (offline)', () => {
	const Model = mongoose.model('Step11SellYachtRequestSchemaTest', SellYachtRequestSchema);
	afterAll(() => mongoose.deleteModel('Step11SellYachtRequestSchemaTest'));
	it('has independent collection, timestamps, defaults and optional BSON Member link', () => {
		const row = new Model(sellRequestFields());
		expect(row.validateSync()).toBeUndefined();
		expect(row.status).toBe('NEW');
		expect(row.memberId).toBeUndefined();
		expect(SellYachtRequestSchema.get('collection')).toBe('sellYachtRequests');
		expect(SellYachtRequestSchema.get('timestamps')).toBe(true);
		row.memberId = new mongoose.Types.ObjectId(sellRequestTestId(1));
		expect(row.validateSync()).toBeUndefined();
		expect(SellYachtRequestSchema.path('memberId').options.ref).toBe('Member');
		for (const field of ['yachtId', 'brokerId', 'destinationIds', 'salePrice', 'listingModes', 'type', 'images'])
			expect(SellYachtRequestSchema.path(field)).toBeUndefined();
	});
	it.each(Object.values(SellYachtRequestStatus))('supports persisted %s without deleting contact data', (status) => {
		const row = new Model({ ...sellRequestFields(), status });
		expect(row.validateSync()).toBeUndefined();
		expect(row.ownerName).toBe('Alex Owner');
	});
	it('stores owner asking amount separately, normalizes currency and requires it with an amount', () => {
		expect(new Model({ ...sellRequestFields(), askingPrice: 1 }).validateSync()?.errors.currency).toBeDefined();
		const row = new Model({ ...sellRequestFields(), askingPrice: 100.25, currency: ' usd ' });
		expect(row.validateSync()).toBeUndefined();
		expect(row.currency).toBe('USD');
		expect(row.askingPrice).toBe(100.25);
	});
	it.each([
		{ ownerName: ' ' },
		{ yachtName: '' },
		{ builder: '' },
		{ phone: 'letters' },
		{ yearBuilt: 1799 },
		{ yearBuilt: 9999 },
		{ yearBuilt: 2000.5 },
		{ lengthM: 0 },
		{ lengthM: -1 },
		{ askingPrice: 0, currency: 'USD' },
		{ askingPrice: -1, currency: 'USD' },
		{ currency: 'USDD' },
		{ status: 'PUBLISHED' },
	])('rejects invalid persisted fields %j', (patch) => {
		expect(new Model({ ...sellRequestFields(), ...patch }).validateSync()).toBeDefined();
	});
	it('validates 1800/current UTC year inclusively with a deterministic clock, rejecting next year', () => {
		for (const [value, expected] of [
			[1800, true],
			[2026, true],
			[1799, false],
			[2027, false],
			[2000.5, false],
			['2000', false],
		] as const)
			expect(validSellYachtBuildYear(value, 2026)).toBe(expected);
		const currentYear = new Date().getUTCFullYear();
		for (const yearBuilt of [1800, currentYear]) {
			expect(new Model({ ...sellRequestFields(), yearBuilt }).validateSync()).toBeUndefined();
			expect(validateSync(plainToInstance(CreateSellYachtRequestInput, { ...sellRequestFields(), yearBuilt }))).toEqual(
				[],
			);
		}
		expect(
			validateSync(
				plainToInstance(CreateSellYachtRequestInput, { ...sellRequestFields(), yearBuilt: currentYear + 1 }),
			),
		).not.toEqual([]);
	});
	it('declares only chronological and status-queue indexes without unique/spam constraints', () => {
		expect(SellYachtRequestSchema.indexes().map(([index]) => index)).toEqual([
			{ createdAt: -1, _id: -1 },
			{ status: 1, createdAt: -1, _id: -1 },
		]);
	});
});
