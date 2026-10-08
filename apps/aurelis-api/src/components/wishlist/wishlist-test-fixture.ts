import { Types } from 'mongoose';
import type { PipelineStage } from 'mongoose';
import type { WishlistItemRecord } from '../../libs/schemas/WishlistItem.model';
import { Member } from '../auth/auth.dto';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';
import { YachtStatus } from '../../libs/enums/yacht.enum';

// Offline persistence adapter shared by service and HTTP tests. It does not
// establish live MongoDB aggregation/index or concurrent deployment behavior.
export const testId = (n: number): string => n.toString(16).padStart(24, '0');
export const testMember = (n = 1, role = MemberRole.USER): Member => ({
	_id: testId(n),
	email: `member${n}@example.com`,
	role,
	status: MemberStatus.ACTIVE,
	createdAt: new Date('2026-10-06T00:00:00Z'),
	updatedAt: new Date('2026-10-06T00:00:00Z'),
});
type Relation = { memberId: Types.ObjectId; yachtId: Types.ObjectId };
type Insert = { $setOnInsert: Relation & { createdAt: Date; updatedAt: Date } };

export function wishlistFixture() {
	let items: WishlistItemRecord[] = [];
	let nextId = 100;
	const yachts = new Map<string, YachtStatus>([
		[testId(10), YachtStatus.PUBLISHED],
		[testId(11), YachtStatus.PUBLISHED],
		[testId(12), YachtStatus.DRAFT],
		[testId(13), YachtStatus.ARCHIVED],
	]);
	const matching = (relation: Relation) =>
		items.find((item) => item.memberId.equals(relation.memberId) && item.yachtId.equals(relation.yachtId));
	const read = <T>(fetch: () => T) => ({ lean: () => ({ exec: () => Promise.resolve(fetch()) }) });
	const model = {
		findOneAndUpdate: jest.fn((relation: Relation, update: Insert, options: { upsert: boolean }) =>
			read(() => {
				const existing = matching(relation);
				if (existing) return { value: existing, lastErrorObject: { updatedExisting: true } };
				if (!options.upsert) return null;
				const item = { _id: new Types.ObjectId(testId(nextId++)), ...update.$setOnInsert };
				items.push(item);
				return { value: item, lastErrorObject: { upserted: item._id } };
			}),
		),
		findOne: jest.fn((relation: Relation) => read(() => matching(relation) ?? null)),
		findOneAndDelete: jest.fn((relation: Relation) =>
			read(() => {
				const item = matching(relation);
				if (item) items = items.filter((row) => row !== item);
				return item ?? null;
			}),
		),
		deleteOne: jest.fn((relation: Relation) => ({
			exec: () => {
				const item = matching(relation);
				if (item) items = items.filter((row) => row !== item);
				return Promise.resolve({ deletedCount: item ? 1 : 0 });
			},
		})),
		exists: jest.fn((relation: Relation) => Promise.resolve(matching(relation) ?? null)),
		aggregate: jest.fn((pipeline: PipelineStage[]) => {
			const memberId = (pipeline[0] as PipelineStage.Match).$match.memberId as Types.ObjectId;
			const lookup = (pipeline[2] as PipelineStage.Lookup).$lookup;
			const status = (lookup.pipeline![0] as PipelineStage.Match).$match.status as YachtStatus;
			const eligible = items.filter(
				(item) => item.memberId.equals(memberId) && yachts.get(item.yachtId.toHexString()) === status,
			);
			eligible.sort(
				(a, b) =>
					b.createdAt.getTime() - a.createdAt.getTime() || b._id.toHexString().localeCompare(a._id.toHexString()),
			);
			const facet = (pipeline[4] as PipelineStage.Facet).$facet;
			const skip = (facet.list[0] as PipelineStage.Skip).$skip;
			const limit = (facet.list[1] as PipelineStage.Limit).$limit;
			const list = eligible
				.slice(skip, skip + limit)
				.map(({ _id, yachtId, createdAt, updatedAt }) => ({ _id, yachtId, createdAt, updatedAt }));
			return Promise.resolve([{ list, meta: eligible.length ? [{ total: eligible.length }] : [] }]);
		}),
	};
	const likes = new Map<string, number>();
	const yachtModel = {
		updateOne: jest.fn(
			(match: { _id: Types.ObjectId; likesCount?: { $gt: number } }, update: { $inc: { likesCount: number } }) => ({
				exec: () => {
					const id = match._id.toHexString();
					const count = likes.get(id) ?? 0;
					if (yachts.has(id) && (!match.likesCount || count > match.likesCount.$gt))
						likes.set(id, count + update.$inc.likesCount);
					return Promise.resolve({ modifiedCount: 1 });
				},
			}),
		),
		exists: jest.fn((match: { _id: Types.ObjectId; status: YachtStatus }) =>
			Promise.resolve(yachts.get(match._id.toHexString()) === match.status ? { _id: match._id } : null),
		),
	};
	return {
		likes,
		model,
		yachtModel,
		yachts,
		items: () => items,
		seed: (member = 1, yacht = 10, itemId = 100, date = new Date('2026-10-06T00:00:00Z')) => {
			const item: WishlistItemRecord = {
				_id: new Types.ObjectId(testId(itemId)),
				memberId: new Types.ObjectId(testId(member)),
				yachtId: new Types.ObjectId(testId(yacht)),
				createdAt: date,
				updatedAt: date,
			};
			items.push(item);
			nextId = Math.max(nextId, itemId + 1);
			return item;
		},
	};
}
