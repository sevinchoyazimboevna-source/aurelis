import { Model, Types } from 'mongoose';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { YachtListingMode, YachtStatus } from '../../libs/enums/yacht.enum';
import type { CreateYachtInquiryInput } from '../../libs/dto/inquiry/yacht-inquiry.input';
import type { Yacht } from '../../libs/dto/yacht/yacht';
import { YachtService } from '../yacht/yacht.service';
import type { BrokerService } from '../broker/broker.service';
import type { DestinationService } from '../destination/destination.service';

export const inquiryTestId = (n: number): string => n.toString(16).padStart(24, '0');
export const salesFields = () => ({
	yachtId: inquiryTestId(14),
	name: 'Alex Buyer',
	email: 'buyer@example.com',
	message: 'Please send sale particulars.',
});
export const charterFields = () => ({
	yachtId: inquiryTestId(10),
	name: 'Alex Charter',
	email: 'alex@example.com',
	message: 'Please send charter particulars.',
	startDate: new Date('2027-08-01T00:00:00Z'),
	endDate: new Date('2027-08-10T00:00:00Z'),
	guestCount: 4,
});
export type InquiryFixtureRecord = CreateYachtInquiryInput & {
	_id: Types.ObjectId;
	status: InquiryStatus;
	memberId?: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
};
type Match = Record<string, unknown>;
type ListQuery = {
	sort: jest.Mock<ListQuery, [unknown]>;
	skip: jest.Mock<ListQuery, [number]>;
	limit: jest.Mock<ListQuery, [number]>;
	lean: () => { exec: () => Promise<InquiryFixtureRecord[]> };
};
type YachtFixture = {
	_id: Types.ObjectId;
	brokerId: Types.ObjectId;
	listingModes: YachtListingMode[];
	status: YachtStatus;
	guests?: number;
};

// Offline adapter, not a live MongoDB/index/concurrency acceptance test.
export function inquiryFixture() {
	const records: InquiryFixtureRecord[] = [];
	let nextId = 100;
	const yachts = new Map<string, YachtFixture>();
	for (const [n, status, modes] of [
		[10, YachtStatus.PUBLISHED, [YachtListingMode.CHARTER]],
		[11, YachtStatus.PUBLISHED, [YachtListingMode.SALE, YachtListingMode.CHARTER]],
		[12, YachtStatus.DRAFT, [YachtListingMode.CHARTER]],
		[13, YachtStatus.ARCHIVED, [YachtListingMode.CHARTER]],
		[14, YachtStatus.PUBLISHED, [YachtListingMode.SALE]],
	] as const)
		yachts.set(inquiryTestId(n), {
			_id: new Types.ObjectId(inquiryTestId(n)),
			brokerId: new Types.ObjectId(inquiryTestId(70)),
			listingModes: [...modes],
			status,
			guests: 8,
		});
	const eq = (a: unknown, b: unknown): boolean => {
		if (a instanceof Types.ObjectId) return a.toHexString() === (b instanceof Types.ObjectId ? b.toHexString() : b);
		if (b instanceof Types.ObjectId) return b.toHexString() === a;
		return a === b;
	};
	const matches = (row: InquiryFixtureRecord, match: Match): boolean =>
		Object.entries(match).every(([key, expected]) => {
			const actual = row[key as keyof InquiryFixtureRecord];
			if (key === 'createdAt' && typeof expected === 'object' && expected !== null) {
				const dates = expected as { $gte?: Date; $lte?: Date };
				return (!dates.$gte || row.createdAt >= dates.$gte) && (!dates.$lte || row.createdAt <= dates.$lte);
			}
			return eq(actual, expected);
		});
	const read = (fetch: () => InquiryFixtureRecord | null) => ({
		lean: () => ({ exec: () => Promise.resolve(fetch()) }),
	});
	const model = {
		create: jest.fn((fields: CreateYachtInquiryInput & { status?: InquiryStatus; memberId?: Types.ObjectId }) => {
			const now = new Date();
			const row = {
				...fields,
				_id: new Types.ObjectId(inquiryTestId(nextId++)),
				status: fields.status ?? InquiryStatus.NEW,
				createdAt: now,
				updatedAt: now,
			};
			records.push(row);
			return Promise.resolve(row);
		}),
		find: jest.fn((match: Match): ListQuery => {
			let skip = 0;
			let limit = 20;
			const query: ListQuery = {
				sort: jest.fn((_sort: unknown) => {
					void _sort;
					return query;
				}),
				skip: jest.fn((value: number) => {
					skip = value;
					return query;
				}),
				limit: jest.fn((value: number) => {
					limit = value;
					return query;
				}),
				lean: () => ({
					exec: () =>
						Promise.resolve(
							records
								.filter((row) => matches(row, match))
								.sort(
									(a, b) =>
										b.createdAt.getTime() - a.createdAt.getTime() ||
										b._id.toHexString().localeCompare(a._id.toHexString()),
								)
								.slice(skip, skip + limit),
						),
				}),
			};
			return query;
		}),
		countDocuments: jest.fn((match: Match) => Promise.resolve(records.filter((row) => matches(row, match)).length)),
		findById: jest.fn((id: string) => read(() => records.find((row) => eq(row._id, id)) ?? null)),
		findByIdAndUpdate: jest.fn((id: string, update: { status: InquiryStatus }, options: unknown) => ({
			exec: () => {
				void options;
				const row = records.find((item) => eq(item._id, id));
				if (row) {
					row.status = update.status;
					row.updatedAt = new Date();
				}
				return Promise.resolve(row ?? null);
			},
		})),
	};
	const yachtModel = {
		findOne: jest.fn((match: { _id: string; status: YachtStatus }) => ({
			populate: () => ({
				lean: () => ({
					exec: () => {
						const yacht = yachts.get(match._id);
						return Promise.resolve(yacht?.status === match.status ? yacht : null);
					},
				}),
			}),
		})),
	};
	const yachtService = new YachtService(
		yachtModel as unknown as Model<Yacht>,
		{} as BrokerService,
		{} as DestinationService,
	);
	return { model, records, yachts, yachtModel, yachtService };
}
