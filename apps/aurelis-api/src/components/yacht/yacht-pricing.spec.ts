import { BadRequestException } from '@nestjs/common';
import { normalizeYachtPricingInput } from './yacht-pricing';
const { planYachtMigration } = require('../../../../../scripts/migrate-legacy-yachts');

describe('Yacht pricing input boundary', () => {
	it.each([
		[{ charterPrice: 100 }, { charterPrice: 100 }],
		[{ charterRate: 100 }, { charterPrice: 100 }],
		[{ charterPrice: 100, charterRate: 100 }, { charterPrice: 100 }],
		[{ charterRate: 0 }, { charterPrice: 0 }],
	])('normalizes %j to one canonical field', (input, expected) => {
		expect(normalizeYachtPricingInput(input)).toEqual(expected);
	});
	it('rejects conflicting aliases', () => {
		expect(() => normalizeYachtPricingInput({ charterPrice: 100, charterRate: 200 })).toThrow(BadRequestException);
	});
	it('preserves other fields and does not add an omitted update price', () => {
		const input = { name: 'Aurelis', charterRate: 100 };
		expect(normalizeYachtPricingInput(input)).toEqual({ name: 'Aurelis', charterPrice: 100 });
		expect(input).toHaveProperty('charterRate', 100);
		expect(normalizeYachtPricingInput({ name: 'Aurelis' } as typeof input)).toEqual({ name: 'Aurelis' });
	});
});

describe('Legacy yacht migration planning (no database access)', () => {
	it('maps and deduplicates modes and copies only absent canonical prices', () => {
		const plan = planYachtMigration({ _id: 'yacht', listingModes: ['SALES', 'SALE', 'CHARTER'], charterRate: 0 });
		expect(plan.update).toEqual({
			$set: { listingModes: ['SALE', 'CHARTER'], charterPrice: 0 },
			$unset: { charterRate: '' },
		});
		expect(plan.filter.charterPrice).toEqual({ $exists: false });
	});
	it('preserves equal canonical values and removes the redundant legacy alias', () => {
		expect(planYachtMigration({ _id: 'yacht', charterRate: 100, charterPrice: 100 }).update).toEqual({
			$unset: { charterRate: '' },
		});
	});
	it.each([
		{ charterRate: 100, charterPrice: 200 },
		{ charterRate: -1 },
		{ charterRate: null },
		{ charterRate: Infinity },
	])('reports conflicts without proposing writes: %j', (fields) => {
		const plan = planYachtMigration({ _id: 'yacht', ...fields });
		expect(plan.conflict).toBeDefined();
		expect(plan.update).toBeUndefined();
	});
});
