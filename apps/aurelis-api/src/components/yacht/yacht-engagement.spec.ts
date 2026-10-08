import { Model, Types, PipelineStage } from 'mongoose';
import YachtSchema from '../../libs/schemas/Yacht.model';
import { model } from 'mongoose';
import { Yacht } from '../../libs/dto/yacht/yacht';
import { YachtSortBy, YachtStatus } from '../../libs/enums/yacht.enum';
import { YachtService } from './yacht.service';
import { YachtResolver } from './yacht.resolver';
import { WishlistService } from '../wishlist/wishlist.service';
import { wishlistFixture, testId, testMember } from '../wishlist/wishlist-test-fixture';
import { WishlistItemRecord } from '../../libs/schemas/WishlistItem.model';

describe('Yacht engagement (offline persistence)', () => {
	it('defaults counters and rejects fractional/negative values', () => {
		const YachtModel = model('EngagementSchemaTest', YachtSchema);
		const yacht = new YachtModel();
		expect(yacht.viewsCount).toBe(0);
		expect(yacht.likesCount).toBe(0);
		yacht.viewsCount = -1;
		yacht.likesCount = 1.5;
		expect(yacht.validateSync()?.errors).toHaveProperty('viewsCount');
		expect(yacht.validateSync()?.errors).toHaveProperty('likesCount');
	});
	it('resolves missing legacy counters without persistence queries', () => {
		const resolver = new YachtResolver({} as never, {} as never);
		expect(resolver.resolveViewsCount({} as Yacht)).toBe(0);
		expect(resolver.resolveLikesCount({} as Yacht)).toBe(0);
	});
	it('records raw repeated public events with atomic updates and leaves reads separate', async () => {
		let count = 0;
		const findOneAndUpdate = jest.fn(() => ({
			lean: () => ({ exec: () => Promise.resolve({ viewsCount: ++count }) }),
		}));
		const service = new YachtService({ findOneAndUpdate } as never, {} as never, {} as never);
		expect(await service.recordView(testId(10))).toBe(1);
		expect(await service.recordView(testId(10))).toBe(2);
		expect(findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: testId(10), status: 'PUBLISHED' },
			{ $inc: { viewsCount: 1 } },
			{ new: true, timestamps: false },
		);
		await expect(service.recordView('invalid')).rejects.toThrow('Invalid yacht ID');
		expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
	});
	it.each(['DRAFT', 'ARCHIVED', 'missing'])('rejects %s targets using public not-found behavior', async () => {
		const findOneAndUpdate = jest.fn(() => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }));
		const service = new YachtService({ findOneAndUpdate } as never, {} as never, {} as never);
		await expect(service.recordView(testId(12))).rejects.toThrow('Yacht not found');
		expect(findOneAndUpdate.mock.calls[0]).toBeDefined();
	});
	it.each([
		[YachtSortBy.MOST_VIEWED, { viewsCount: -1, createdAt: -1, _id: -1 }],
		[YachtSortBy.MOST_LIKED, { likesCount: -1, createdAt: -1, _id: -1 }],
		[YachtSortBy.POPULAR, { likesCount: -1, viewsCount: -1, createdAt: -1, _id: -1 }],
	])('uses deterministic %s descending order and zero-normalizes legacy values', async (sortBy, sort) => {
		const aggregate = jest
			.fn<Promise<{ list: Yacht[]; meta: { total: number }[] }[]>, [PipelineStage[]]>()
			.mockResolvedValue([{ list: [], meta: [] }]);
		const service = new YachtService({ aggregate } as never, {} as never, {} as never);
		await service.catalog({ sortBy, descending: false });
		expect(aggregate.mock.calls[0][0][0]).toEqual({ $match: { status: 'PUBLISHED' } });
		expect(aggregate.mock.calls[0][0][1]).toEqual({
			$addFields: { viewsCount: { $ifNull: ['$viewsCount', 0] }, likesCount: { $ifNull: ['$likesCount', 0] } },
		});
		expect(aggregate.mock.calls[0][0][2]).toEqual({ $sort: sort });
	});
	it('synchronizes distinct members, duplicate adds, remove races and toggles', async () => {
		const f = wishlistFixture();
		const service = new WishlistService(
			f.model as unknown as Model<WishlistItemRecord>,
			f.yachtModel as unknown as Model<Yacht>,
		);
		await Promise.all([service.add(testMember(), testId(10)), service.add(testMember(), testId(10))]);
		expect(f.likes.get(testId(10))).toBe(1);
		await service.add(testMember(2), testId(10));
		expect(f.likes.get(testId(10))).toBe(2);
		const results = await Promise.all([
			service.remove(testMember(), testId(10)),
			service.remove(testMember(), testId(10)),
		]);
		expect(results.sort()).toEqual([false, true]);
		expect(f.likes.get(testId(10))).toBe(1);
		expect(await service.toggle(testMember(2), testId(10))).toMatchObject({ wishlisted: false });
		expect(f.likes.get(testId(10))).toBe(0);
		expect(await service.toggle(testMember(), testId(10))).toMatchObject({ wishlisted: true });
		expect(f.likes.get(testId(10))).toBe(1);
	});
	it('does not increment a duplicate-key loser and clamps legacy zero removal', async () => {
		const f = wishlistFixture();
		f.seed();
		f.model.findOneAndUpdate.mockReturnValueOnce({
			lean: () => ({ exec: () => Promise.reject(Object.assign(new Error(), { code: 11000 })) }),
		});
		const service = new WishlistService(
			f.model as unknown as Model<WishlistItemRecord>,
			f.yachtModel as unknown as Model<Yacht>,
		);
		await service.add(testMember(), testId(10));
		expect(f.yachtModel.updateOne).not.toHaveBeenCalled();
		await service.remove(testMember(), testId(10));
		expect(f.likes.get(testId(10)) ?? 0).toBe(0);
		expect(f.yachtModel.updateOne).toHaveBeenCalledWith(
			{ _id: new Types.ObjectId(testId(10)), likesCount: { $gt: 0 } },
			{ $inc: { likesCount: -1 } },
			{ timestamps: false },
		);
	});
	it('retains likes and relations across unpublication and republication', async () => {
		const f = wishlistFixture();
		const service = new WishlistService(
			f.model as unknown as Model<WishlistItemRecord>,
			f.yachtModel as unknown as Model<Yacht>,
		);
		await service.add(testMember(), testId(10));
		f.yachts.set(testId(10), YachtStatus.DRAFT);
		expect((await service.getMine(testMember())).total).toBe(0);
		expect(f.likes.get(testId(10))).toBe(1);
		expect(f.items()).toHaveLength(1);
		f.yachts.set(testId(10), YachtStatus.PUBLISHED);
		expect((await service.getMine(testMember())).total).toBe(1);
		expect(f.likes.get(testId(10))).toBe(1);
	});
});
