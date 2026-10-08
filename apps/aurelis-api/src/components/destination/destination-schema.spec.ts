import mongoose, { Types } from 'mongoose';
import DestinationSchema from '../../libs/schemas/Destination.model';
import YachtSchema from '../../libs/schemas/Yacht.model';

describe('Destination persistence schema (offline)', () => {
	const DestinationModel = mongoose.model('Step5DestinationSchemaTest', DestinationSchema);
	const valid = { name: 'Riviera', slug: 'riviera', type: 'AREA' };
	afterAll(() => mongoose.deleteModel('Step5DestinationSchemaTest'));
	it.each(['REGION', 'COUNTRY', 'AREA'])('accepts the canonical %s type', (type) => {
		expect(new DestinationModel({ ...valid, type }).validateSync()).toBeUndefined();
	});
	it('uses one timestamps-enabled self-referencing collection with safe defaults', () => {
		const record = new DestinationModel(valid);
		expect(record.validateSync()).toBeUndefined();
		expect(record.toObject()).toMatchObject({
			status: 'DRAFT',
			featured: false,
			parentId: null,
			images: [],
			sortOrder: 0,
		});
		expect(DestinationSchema.get('collection')).toBe('destinations');
		expect(DestinationSchema.get('timestamps')).toBe(true);
		expect(DestinationSchema.path('parentId').options.ref).toBe('Destination');
	});
	it.each([
		{ name: ' ' },
		{ slug: 'UPPER' },
		{ slug: 'a/b' },
		{ type: 'CITY' },
		{ status: 'HIDDEN' },
		{ sortOrder: -1 },
		{ sortOrder: 0.5 },
		{ parentId: 'bad' },
	])('rejects invalid stored values %j', (patch) => {
		expect(new DestinationModel({ ...valid, ...patch }).validateSync()).toBeDefined();
	});
	it('stores optional presentation fields and BSON parent references', () => {
		const parentId = new Types.ObjectId();
		const record = new DestinationModel({
			...valid,
			parentId,
			country: ' France ',
			region: 'Europe',
			shortDescription: 'Short',
			description: 'Long',
			heroImage: '/hero.jpg',
			images: ['/gallery.jpg'],
			featured: true,
			sortOrder: 2,
		});
		expect(record.validateSync()).toBeUndefined();
		expect(record.toObject()).toMatchObject({
			parentId,
			country: 'France',
			region: 'Europe',
			featured: true,
			sortOrder: 2,
		});
	});
	it('declares global slug uniqueness and the two curated browsing indexes', () => {
		const indexes = DestinationSchema.indexes();
		expect(indexes).toHaveLength(3);
		expect(indexes).toContainEqual([{ slug: 1 }, expect.objectContaining({ unique: true })]);
		expect(indexes.map(([keys]) => keys)).toContainEqual({ status: 1, parentId: 1, sortOrder: 1, name: 1, _id: 1 });
		expect(indexes.map(([keys]) => keys)).toContainEqual({ status: 1, featured: -1, sortOrder: 1, name: 1, _id: 1 });
	});
	it('adds an optional Yacht reference array and index without removing existing indexes', () => {
		const path = YachtSchema.path('destinationIds') as mongoose.Schema.Types.Array;
		expect(path.options.required).toBeUndefined();
		expect(path.caster.options.ref).toBe('Destination');
		expect(YachtSchema.indexes().map(([keys]) => keys)).toEqual([
			{ status: 1, listingModes: 1, featured: -1, createdAt: -1 },
			{ builder: 1, model: 1, location: 1, country: 1 },
			{ status: 1, destinationIds: 1, createdAt: -1 },
		]);
	});
});
