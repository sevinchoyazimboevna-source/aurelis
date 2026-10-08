import mongoose from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import WishlistItemSchema from '../../libs/schemas/WishlistItem.model';
import { WishlistCatalogInput } from '../../libs/dto/wishlist/wishlist.input';
import { testId } from './wishlist-test-fixture';

describe('Wishlist schema and inputs (offline)', () => {
	const Model = mongoose.model('Step8WishlistSchemaTest', WishlistItemSchema);
	afterAll(() => mongoose.deleteModel('Step8WishlistSchemaTest'));
	it('stores only the relation in one timestamped collection', () => {
		const item = new Model({ memberId: testId(1), yachtId: testId(10), name: 'Not stored', price: 100 });
		expect(item.validateSync()).toBeUndefined();
		expect(Object.keys(item.toObject()).sort()).toEqual(['_id', 'memberId', 'yachtId']);
		expect(item.memberId).toBeInstanceOf(mongoose.Types.ObjectId);
		expect(item.yachtId).toBeInstanceOf(mongoose.Types.ObjectId);
		expect(WishlistItemSchema.get('timestamps')).toBe(true);
		expect(WishlistItemSchema.get('collection')).toBe('wishlistItems');
	});
	it.each([
		{ yachtId: testId(10) },
		{ memberId: testId(1) },
		{ memberId: 'bad', yachtId: testId(10) },
		{ memberId: testId(1), yachtId: 'bad' },
	])('rejects missing/invalid required reference %j', (fields) => {
		expect(new Model(fields).validateSync()).toBeDefined();
	});
	it('declares unique member+yacht identity and newest-saved index without a redundant yacht-only index', () => {
		expect(WishlistItemSchema.indexes()).toEqual([
			[{ memberId: 1, yachtId: 1 }, expect.objectContaining({ unique: true })],
			[{ memberId: 1, createdAt: -1, _id: -1 }, expect.any(Object)],
		]);
		expect(WishlistItemSchema.path('memberId').options).toMatchObject({ ref: 'Member', required: true });
		expect(WishlistItemSchema.path('yachtId').options).toMatchObject({ ref: 'Yacht', required: true });
	});
	it('uses established defaults and accepts custom maximum pagination', () => {
		const input = plainToInstance(WishlistCatalogInput, {});
		expect(input).toEqual({ page: 1, limit: 20 });
		expect(validateSync(input)).toEqual([]);
		expect(validateSync(plainToInstance(WishlistCatalogInput, { page: 2, limit: 50 }))).toEqual([]);
	});
	it.each([{ page: 0 }, { page: -1 }, { page: 1.5 }, { limit: 0 }, { limit: 51 }, { limit: 1.5 }, { page: '1' }])(
		'rejects pagination %j',
		(input) => {
			expect(validateSync(plainToInstance(WishlistCatalogInput, input))).not.toEqual([]);
		},
	);
});
