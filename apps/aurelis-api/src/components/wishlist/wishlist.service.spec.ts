import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { WishlistItemRecord } from '../../libs/schemas/WishlistItem.model';
import type { Yacht } from '../../libs/dto/yacht/yacht';
import { YachtStatus } from '../../libs/enums/yacht.enum';
import { MemberRole } from '../../libs/enums/member.enum';
import { WishlistService } from './wishlist.service';
import { testId, testMember, wishlistFixture } from './wishlist-test-fixture';

describe('WishlistService (offline)', () => {
	let f: ReturnType<typeof wishlistFixture>;
	let service: WishlistService;
	beforeEach(() => {
		f = wishlistFixture();
		service = new WishlistService(
			f.model as unknown as Model<WishlistItemRecord>,
			f.yachtModel as unknown as Model<Yacht>,
		);
	});
	it.each(Object.values(MemberRole))('lets %s use their own wishlist', async (role) => {
		const saved = await service.add(testMember(1, role), testId(10));
		expect(saved.yachtId.toHexString()).toBe(testId(10));
		expect(await service.isWishlisted(testMember(1, role), testId(10))).toBe(true);
	});
	it('normalizes BSON identity, adds idempotently and keeps original timestamps', async () => {
		f.yachts.set(testId(0xabcdef), YachtStatus.PUBLISHED);
		const first = await service.add(testMember(), testId(0xabcdef));
		const second = await service.add(testMember(), testId(0xabcdef).toUpperCase());
		expect(second).toBe(first);
		expect(f.items()).toHaveLength(1);
	});
	it('returns one relation under simultaneous add requests', async () => {
		const results = await Promise.all([service.add(testMember(), testId(10)), service.add(testMember(), testId(10))]);
		expect(results[0]._id).toEqual(results[1]._id);
		expect(results[0].createdAt).toEqual(results[1].createdAt);
		expect(f.items()).toHaveLength(1);
		expect(f.model.findOneAndUpdate.mock.calls[0][2]).toEqual({
			upsert: true,
			new: true,
			runValidators: true,
			timestamps: false,
			includeResultMetadata: true,
		});
	});
	it('allows different members on one yacht and one member on different yachts', async () => {
		await service.add(testMember(), testId(10));
		await service.add(testMember(2), testId(10));
		await service.add(testMember(), testId(11));
		expect(f.items()).toHaveLength(3);
	});
	it('handles duplicate-key race by returning its winning relation', async () => {
		const winner = f.seed();
		const error = Object.assign(new Error('private index details'), { code: 11000 });
		f.model.findOneAndUpdate.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.reject(error) }) });
		expect(await service.add(testMember(), testId(10))).toBe(winner);
		expect(f.model.findOne).toHaveBeenCalledWith({
			memberId: new Types.ObjectId(testId(1)),
			yachtId: new Types.ObjectId(testId(10)),
		});
	});
	it('sanitizes a duplicate race whose winner was removed before reread', async () => {
		const error = Object.assign(new Error('private index details'), { code: 11000 });
		f.model.findOneAndUpdate.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.reject(error) }) });
		await expect(service.add(testMember(), testId(10))).rejects.toThrow('Wishlist changed; please retry');
	});
	it('leaves unexpected errors to the shared formatter', async () => {
		const error = new Error('storage failure');
		f.model.findOneAndUpdate.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.reject(error) }) });
		await expect(service.add(testMember(), testId(10))).rejects.toBe(error);
	});
	it.each([testId(12), testId(13), testId(99)])(
		'rejects hidden or missing yacht %s on add/toggle/is',
		async (yachtId) => {
			await expect(service.add(testMember(), yachtId)).rejects.toBeInstanceOf(NotFoundException);
			await expect(service.toggle(testMember(), yachtId)).rejects.toBeInstanceOf(NotFoundException);
			await expect(service.isWishlisted(testMember(), yachtId)).rejects.toBeInstanceOf(NotFoundException);
			expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
		},
	);
	it.each(['bad', '', '123456789012', 'x'.repeat(24)])(
		'rejects invalid ID %s for every yacht operation before querying',
		async (id) => {
			for (const call of [
				() => service.add(testMember(), id),
				() => service.remove(testMember(), id),
				() => service.toggle(testMember(), id),
				() => service.isWishlisted(testMember(), id),
			])
				await expect(call()).rejects.toBeInstanceOf(BadRequestException);
			expect(f.yachtModel.exists).not.toHaveBeenCalled();
			expect(f.model.deleteOne).not.toHaveBeenCalled();
			expect(f.model.findOneAndDelete).not.toHaveBeenCalled();
		},
	);
	it('removes only owner relation, returning true then false', async () => {
		f.seed();
		f.seed(2, 10, 101);
		expect(await service.remove(testMember(), testId(10))).toBe(true);
		expect(await service.remove(testMember(), testId(10))).toBe(false);
		expect(f.items()).toHaveLength(1);
		expect(f.items()[0].memberId.toHexString()).toBe(testId(2));
	});
	it.each([YachtStatus.DRAFT, YachtStatus.ARCHIVED, undefined])(
		'permits explicit removal of saved hidden/broken yachts %s',
		async (status) => {
			f.seed();
			if (status) f.yachts.set(testId(10), status);
			else f.yachts.delete(testId(10));
			expect(await service.remove(testMember(), testId(10))).toBe(true);
			expect(f.yachtModel.exists).not.toHaveBeenCalled();
		},
	);
	it('toggles absent to saved and saved to removed with explicit result', async () => {
		expect(await service.toggle(testMember(), testId(10))).toEqual({ yachtId: testId(10), wishlisted: true });
		expect(await service.toggle(testMember(), testId(10))).toEqual({ yachtId: testId(10), wishlisted: false });
		expect(f.items()).toHaveLength(0);
	});
	it('allows toggle-off a saved hidden yacht without permitting toggle-on', async () => {
		f.seed();
		f.yachts.set(testId(10), YachtStatus.ARCHIVED);
		expect(await service.toggle(testMember(), testId(10))).toEqual({ yachtId: testId(10), wishlisted: false });
		await expect(service.toggle(testMember(), testId(10))).rejects.toBeInstanceOf(NotFoundException);
	});
	it('does not share isWishlisted or items between members', async () => {
		f.seed();
		expect(await service.isWishlisted(testMember(), testId(10))).toBe(true);
		expect(await service.isWishlisted(testMember(2), testId(10))).toBe(false);
		expect((await service.getMine(testMember(2))).total).toBe(0);
	});
	it('orders by saved time before ID and defaults to page 1/limit 20', async () => {
		f.seed(1, 10, 105, new Date('2026-10-01T00:00:00Z'));
		f.seed(1, 11, 100, new Date('2026-10-02T00:00:00Z'));
		const result = await service.getMine(testMember());
		expect(result).toMatchObject({ total: 2, page: 1, limit: 20, totalPages: 1 });
		expect(result.list.map((item) => item._id.toHexString())).toEqual([testId(100), testId(105)]);
	});
	it('keeps concurrent toggle-on requests unique without claiming serialized toggle parity', async () => {
		await Promise.all([service.toggle(testMember(), testId(10)), service.toggle(testMember(), testId(10))]);
		expect(f.items()).toHaveLength(1);
	});
	it('rejects missing authenticated context before any persistence access', async () => {
		const member = undefined as unknown as ReturnType<typeof testMember>;
		for (const call of [
			() => service.getMine(member),
			() => service.add(member, testId(10)),
			() => service.remove(member, testId(10)),
			() => service.toggle(member, testId(10)),
			() => service.isWishlisted(member, testId(10)),
		])
			await expect(call()).rejects.toMatchObject({ authErrorCode: 'AUTH_UNAUTHENTICATED' });
		expect(f.model.aggregate).not.toHaveBeenCalled();
		expect(f.model.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it.each([YachtStatus.DRAFT, YachtStatus.ARCHIVED])(
		'hides %s and broken references, preserves relations and reveals republished saves',
		async (status) => {
			f.seed();
			f.seed(1, 99, 102);
			f.seed(2, 11, 103);
			f.yachts.set(testId(10), status);
			expect(await service.getMine(testMember())).toEqual({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });
			expect(f.items()).toHaveLength(3);
			f.yachts.set(testId(10), YachtStatus.PUBLISHED);
			expect((await service.getMine(testMember())).list.map((item) => item.yachtId.toHexString())).toEqual([
				testId(10),
			]);
			expect(f.model.deleteOne).not.toHaveBeenCalled();
		},
	);
	it('paginates only visible entries, returns useful totals and stable newest-first ties', async () => {
		f.seed(1, 10, 100);
		f.seed(1, 11, 101);
		f.seed(1, 12, 102);
		f.seed(2, 10, 103);
		const result = await service.getMine(testMember(), { page: 2, limit: 1 });
		expect(result).toMatchObject({ total: 2, page: 2, limit: 1, totalPages: 2 });
		expect(result.list[0]._id.toHexString()).toBe(testId(100));
		expect(result.list[0]).not.toHaveProperty('memberId');
		const pipeline = f.model.aggregate.mock.calls[0][0];
		expect(pipeline).toMatchObject([
			{ $match: { memberId: new Types.ObjectId(testId(1)) } },
			{ $sort: { createdAt: -1, _id: -1 } },
			{ $lookup: { from: 'yachts', pipeline: [{ $match: { status: 'PUBLISHED' } }, { $project: { _id: 1 } }] } },
			{ $match: { 'visibleYacht.0': { $exists: true } } },
			{
				$facet: {
					list: [{ $skip: 1 }, { $limit: 1 }, { $project: { _id: 1, yachtId: 1, createdAt: 1, updatedAt: 1 } }],
					meta: [{ $count: 'total' }],
				},
			},
		]);
		expect((await service.getMine(testMember(), { page: 3, limit: 1 })).total).toBe(2);
	});
	it.each([{ page: 0 }, { limit: 51 }, { page: 1.5 }, { limit: -1 }, { memberId: testId(2) }])(
		'rejects invalid/impersonation catalog input %j',
		async (input) => {
			await expect(service.getMine(testMember(), input)).rejects.toBeInstanceOf(BadRequestException);
			expect(f.model.aggregate).not.toHaveBeenCalled();
		},
	);
});
