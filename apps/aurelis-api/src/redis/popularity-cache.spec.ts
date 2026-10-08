import { YachtService } from '../components/yacht/yacht.service';
import { WishlistService } from '../components/wishlist/wishlist.service';
import { wishlistFixture, testId, testMember } from '../components/wishlist/wishlist-test-fixture';
import { RedisService } from './redis.service';
import { YachtSortBy } from '../libs/enums/yacht.enum';

describe('Popularity cache integration (offline MongoDB)', () => {
	const id = testId(10);
	const redis = { popularityKey: jest.fn(), getJson: jest.fn(), setJson: jest.fn(), invalidatePopularity: jest.fn() };
	const row = { _id: id, name: 'Fresh MongoDB title', createdAt: new Date(), status: 'PUBLISHED' };
	const aggregate = jest.fn<Promise<unknown[]>, [unknown[]]>();
	let service: YachtService;
	beforeEach(() => {
		jest.resetAllMocks();
		redis.popularityKey.mockResolvedValue('cache-key');
		redis.invalidatePopularity.mockResolvedValue(undefined);
		aggregate.mockResolvedValue([{ list: [row], meta: [{ total: 1 }] }]);
		service = new YachtService({ aggregate } as never, {} as never, {} as never, redis as unknown as RedisService);
	});
	it.each([YachtSortBy.MOST_VIEWED, YachtSortBy.MOST_LIKED, YachtSortBy.POPULAR])(
		'fills only ranked IDs and count for %s with a 30s TTL',
		async (sortBy) => {
			expect((await service.catalog({ sortBy })).total).toBe(1);
			expect(redis.setJson).toHaveBeenCalledWith('cache-key', { ids: [id], total: 1 }, 30);
		},
	);
	it('hydrates cached order from fresh MongoDB values and preserves Date objects', async () => {
		redis.getJson.mockResolvedValue({ ids: [id], total: 1 });
		aggregate.mockResolvedValue([row]);
		const result = await service.catalog({ sortBy: YachtSortBy.POPULAR });
		expect(result.list[0].name).toBe('Fresh MongoDB title');
		expect(result.list[0].createdAt).toBeInstanceOf(Date);
		expect(aggregate.mock.calls[0][0][0]).toMatchObject({
			$match: { $and: [{ status: 'PUBLISHED' }, { _id: { $in: expect.any(Array) as unknown } }] },
		});
		expect(redis.setJson).not.toHaveBeenCalled();
	});
	it('rejects stale hidden/deleted pages and recomputes counts', async () => {
		redis.getJson.mockResolvedValue({ ids: [id], total: 1 });
		aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([{ list: [], meta: [] }]);
		expect(await service.catalog({ sortBy: YachtSortBy.POPULAR })).toMatchObject({ list: [], total: 0 });
		expect(aggregate).toHaveBeenCalledTimes(2);
	});
	it.each([
		{ ids: ['invalid'], total: 1 },
		{ ids: [id], total: -1 },
	])('bypasses invalid cache values %j', async (cached) => {
		redis.getJson.mockResolvedValue(cached);
		expect((await service.catalog({ sortBy: YachtSortBy.POPULAR })).total).toBe(1);
	});
	it('does not cache staff, featured default or ordinary catalog sorts', async () => {
		await service.getForStaff({ sortBy: YachtSortBy.POPULAR });
		await service.catalog({});
		await service.catalog({ sortBy: YachtSortBy.NEWEST });
		expect(redis.popularityKey).not.toHaveBeenCalled();
	});
	it('bypasses Redis when no key is available', async () => {
		redis.popularityKey.mockResolvedValue(undefined);
		expect((await service.catalog({ sortBy: YachtSortBy.POPULAR })).total).toBe(1);
		expect(redis.getJson).not.toHaveBeenCalled();
		expect(redis.setJson).not.toHaveBeenCalled();
	});
	it('invalidates accepted views only', async () => {
		const findOneAndUpdate = jest.fn(() => ({ lean: () => ({ exec: () => Promise.resolve({ viewsCount: 2 }) }) }));
		service = new YachtService(
			{ findOneAndUpdate } as never,
			{} as never,
			{} as never,
			redis as unknown as RedisService,
		);
		expect(await service.recordView(id)).toBe(2);
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(1);
		await expect(service.recordView('invalid')).rejects.toThrow();
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(1);
	});
	it('invalidates actual add/remove/toggle changes but not duplicate adds or absent removals', async () => {
		const f = wishlistFixture();
		const wishlist = new WishlistService(f.model as never, f.yachtModel as never, redis as unknown as RedisService);
		await wishlist.add(testMember(), id);
		await wishlist.add(testMember(), id);
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(1);
		await wishlist.remove(testMember(), id);
		await wishlist.remove(testMember(), id);
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(2);
		await wishlist.toggle(testMember(), id);
		await wishlist.toggle(testMember(), id);
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(4);
	});
	it('invalidates even if a post-relation counter update fails', async () => {
		const f = wishlistFixture();
		f.yachtModel.updateOne.mockReturnValueOnce({ exec: () => Promise.reject(new Error('MongoDB counter failure')) });
		const wishlist = new WishlistService(f.model as never, f.yachtModel as never, redis as unknown as RedisService);
		await expect(wishlist.add(testMember(), id)).rejects.toThrow('MongoDB counter failure');
		expect(redis.invalidatePopularity).toHaveBeenCalledTimes(1);
	});
});
