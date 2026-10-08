import { model, models } from 'mongoose';
import YachtSchema from '../../libs/schemas/Yacht.model';

const YachtModel = models.Step3YachtValidation ?? model('Step3YachtValidation', YachtSchema);
const base = {
	name: 'Aurelis',
	location: 'Nice',
	country: 'France',
	brokerId: '507f1f77bcf86cd799439011',
	listingModes: ['SALE', 'CHARTER'],
};

describe('Yacht persistence schema (offline validation)', () => {
	it('stores one charter monetary field and preserves defaults and timestamp configuration', () => {
		const document = new YachtModel({ ...base, charterPrice: 0, charterRate: 200 });
		expect(document.validateSync()).toBeUndefined();
		expect(document.toObject()).toMatchObject({ charterPrice: 0, status: 'DRAFT', featured: false, images: [] });
		expect(document.toObject()).not.toHaveProperty('charterRate');
		expect(YachtSchema.options.timestamps).toBe(true);
		expect(YachtSchema.options.collection).toBe('yachts');
		expect(YachtSchema.indexes()).toHaveLength(3);
	});
	it.each([
		{ listingModes: [] },
		{ listingModes: ['SALES'] },
		{ lengthM: 0 },
		{ beamM: -1 },
		{ draftM: 0 },
		{ cabins: 1.5 },
		{ guests: -1 },
		{ crew: 2.5 },
		{ yearBuilt: 1799 },
		{ yearBuilt: new Date().getFullYear() + 1 },
		{ yearBuilt: 2020.5 },
		{ charterPrice: -1 },
		{ salePrice: -1 },
	])('rejects invalid persisted fields %j', (fields) => {
		expect(new YachtModel({ ...base, ...fields }).validateSync()).toBeDefined();
	});
	it('accepts optional specs and sub-centimeter positive dimensions', () => {
		expect(new YachtModel({ ...base, lengthM: 0.001 }).validateSync()).toBeUndefined();
	});
});
