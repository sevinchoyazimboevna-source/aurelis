import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, Types } from 'mongoose';
import type { ModifyResult } from 'mongodb';
import { WishlistCatalogInput } from '../../libs/dto/wishlist/wishlist.input';
import { WishlistItem, WishlistItems, WishlistToggleResult } from '../../libs/dto/wishlist/wishlist';
import type { WishlistItemRecord } from '../../libs/schemas/WishlistItem.model';
import type { Yacht } from '../../libs/dto/yacht/yacht';
import type { Member } from '../auth/auth.dto';
import { AuthErrorCode, authError } from '../auth/auth-errors';
import { buildPublicYachtVisibilityFilter } from '../yacht/yacht-visibility';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class WishlistService {
	constructor(
		@InjectModel('WishlistItem') private readonly wishlistModel: Model<WishlistItemRecord>,
		@InjectModel('Yacht') private readonly yachtModel: Model<Yacht>,
		@Optional() private readonly redis?: RedisService,
	) {}

	async getMine(member: Member, input: WishlistCatalogInput = new WishlistCatalogInput()): Promise<WishlistItems> {
		const memberId = currentMemberId(member);
		const query = plainToInstance(WishlistCatalogInput, input);
		if (validateSync(query, { whitelist: true, forbidNonWhitelisted: true }).length)
			throw new BadRequestException('Invalid wishlist query input');
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		// Filter joined availability before the facet so total and pages describe
		// visible entries, including when hidden/broken relations remain stored.
		const result = await this.wishlistModel.aggregate<{ list: WishlistItem[]; meta: { total: number }[] }>([
			{ $match: { memberId } },
			{ $sort: { createdAt: -1, _id: -1 } },
			{
				$lookup: {
					from: 'yachts',
					localField: 'yachtId',
					foreignField: '_id',
					pipeline: [{ $match: buildPublicYachtVisibilityFilter() }, { $project: { _id: 1 } }],
					as: 'visibleYacht',
				},
			},
			{ $match: { 'visibleYacht.0': { $exists: true } } },
			{
				$facet: {
					list: [
						{ $skip: (page - 1) * limit },
						{ $limit: limit },
						{ $project: { _id: 1, yachtId: 1, createdAt: 1, updatedAt: 1 } },
					],
					meta: [{ $count: 'total' }],
				},
			},
		]);
		const total = result[0]?.meta?.[0]?.total ?? 0;
		return { list: result[0]?.list ?? [], total, page, limit, totalPages: Math.ceil(total / limit) };
	}

	async add(member: Member, yachtId: string): Promise<WishlistItem> {
		const relation = relationFor(member, yachtId);
		await this.requirePublicYacht(relation.yachtId);
		const now = new Date();
		try {
			const result = await this.wishlistModel
				.findOneAndUpdate(
					relation,
					{ $setOnInsert: { ...relation, createdAt: now, updatedAt: now } },
					{ upsert: true, new: true, runValidators: true, timestamps: false, includeResultMetadata: true },
				)
				.lean<ModifyResult<WishlistItemRecord>>()
				.exec();
			const item = result.value;
			if (!item) throw new BadRequestException('Unable to save yacht to wishlist');
			if (result.lastErrorObject?.upserted) await this.changeLikes(relation.yachtId, 1);
			return item;
		} catch (error) {
			if (!isDuplicateKey(error)) throw error;
			// The deployed unique index arbitrates competing upserts. Return the
			// winner without changing original saved timestamps or leaking errors.
			const existing = await this.wishlistModel.findOne(relation).lean().exec();
			if (!existing) throw new BadRequestException('Wishlist changed; please retry');
			return existing;
		}
	}

	async remove(member: Member, yachtId: string): Promise<boolean> {
		const relation = relationFor(member, yachtId);
		// Removal is allowed for hidden/missing yachts so owners can clear stale saves.
		const result = await this.wishlistModel.deleteOne(relation).exec();
		if (result.deletedCount > 0) await this.changeLikes(relation.yachtId, -1);
		return result.deletedCount > 0;
	}

	async toggle(member: Member, yachtId: string): Promise<WishlistToggleResult> {
		const relation = relationFor(member, yachtId);
		const removed = await this.wishlistModel.findOneAndDelete(relation).lean().exec();
		if (removed) {
			await this.changeLikes(relation.yachtId, -1);
			return { yachtId: relation.yachtId.toHexString(), wishlisted: false };
		}
		await this.add(member, yachtId);
		return { yachtId: relation.yachtId.toHexString(), wishlisted: true };
	}

	async isWishlisted(member: Member, yachtId: string): Promise<boolean> {
		const relation = relationFor(member, yachtId);
		await this.requirePublicYacht(relation.yachtId);
		return Boolean(await this.wishlistModel.exists(relation));
	}

	private async changeLikes(yachtId: Types.ObjectId, delta: 1 | -1): Promise<void> {
		try {
			// Atomic per-document updates; relations remain authoritative. Cross-document
			// failures and interleaved add/remove can drift without transactions.
			await this.yachtModel
				.updateOne(
					{ _id: yachtId, ...(delta === -1 ? { likesCount: { $gt: 0 } } : {}) },
					{ $inc: { likesCount: delta } },
					{ timestamps: false },
				)
				.exec();
		} finally {
			await this.redis?.invalidatePopularity();
		}
	}

	private async requirePublicYacht(yachtId: Types.ObjectId): Promise<void> {
		if (!(await this.yachtModel.exists({ _id: yachtId, ...buildPublicYachtVisibilityFilter() })))
			throw new NotFoundException('Yacht not found');
	}
}

function currentMemberId(member: Member): Types.ObjectId {
	if (!member || typeof member._id !== 'string' || !/^[a-f0-9]{24}$/i.test(member._id))
		throw authError(AuthErrorCode.UNAUTHENTICATED);
	return new Types.ObjectId(member._id);
}

function relationFor(member: Member, yachtId: string): { memberId: Types.ObjectId; yachtId: Types.ObjectId } {
	const memberId = currentMemberId(member);
	if (typeof yachtId !== 'string' || !/^[a-f0-9]{24}$/i.test(yachtId))
		throw new BadRequestException('Invalid yacht ID');
	return { memberId, yachtId: new Types.ObjectId(yachtId) };
}

function isDuplicateKey(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
