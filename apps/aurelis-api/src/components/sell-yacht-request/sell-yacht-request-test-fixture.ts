import { Types } from 'mongoose';
import type { CreateSellYachtRequestInput } from '../../libs/dto/sell-yacht-request/sell-yacht-request.input';
import type { SellYachtRequest } from '../../libs/dto/sell-yacht-request/sell-yacht-request';
import { SellYachtRequestStatus } from '../../libs/enums/sell-yacht-request.enum';

export const sellRequestTestId = (n: number): string => n.toString(16).padStart(24, '0');
export const sellRequestFields = (): CreateSellYachtRequestInput => ({
	ownerName: 'Alex Owner',
	email: 'owner@example.com',
	phone: '+44 (0)20 1234 5678',
	yachtName: 'Owner Yacht',
	builder: 'Builder',
	yearBuilt: 2000,
	lengthM: 36.5,
	location: 'Marina',
	country: 'Italy',
});
type Match = Record<string, unknown>;
type ListQuery = {
	sort: jest.Mock<ListQuery, [unknown]>;
	skip: jest.Mock<ListQuery, [number]>;
	limit: jest.Mock<ListQuery, [number]>;
	lean: () => { exec: () => Promise<SellYachtRequest[]> };
};

// Offline persistence adapter, not a real MongoDB/index/query-plan test.
export function sellRequestFixture() {
	const records: SellYachtRequest[] = [];
	let nextId = 100;
	const matches = (row: SellYachtRequest, match: Match) =>
		Object.entries(match).every(([key, value]) => row[key as keyof SellYachtRequest] === value);
	const model = {
		create: jest.fn(
			(fields: CreateSellYachtRequestInput & { status: SellYachtRequestStatus; memberId?: Types.ObjectId }) => {
				const row: SellYachtRequest = {
					...fields,
					_id: new Types.ObjectId(sellRequestTestId(nextId++)),
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				records.push(row);
				return Promise.resolve(row);
			},
		),
		find: jest.fn((match: Match): ListQuery => {
			let skip = 0;
			let limit = 20;
			const query: ListQuery = {
				sort: jest.fn((_value: unknown) => {
					void _value;
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
		findById: jest.fn((id: string) => ({
			lean: () => ({
				exec: () => Promise.resolve(records.find((row) => row._id.toHexString() === id.toLowerCase()) ?? null),
			}),
		})),
		findByIdAndUpdate: jest.fn((id: string, update: { status: SellYachtRequestStatus }, options: unknown) => ({
			exec: () => {
				void options;
				const row = records.find((entry) => entry._id.toHexString() === id.toLowerCase());
				if (row) {
					row.status = update.status;
					row.updatedAt = new Date();
				}
				return Promise.resolve(row ?? null);
			},
		})),
	};
	return { model, records };
}

// Shared service/HTTP acceptance matrix; no coercion of numeric strings.
export const invalidSellRequestPatches: Record<string, unknown>[] = [
	{ ownerName: ' ' },
	{ ownerName: null },
	{ ownerName: 'x'.repeat(121) },
	{ email: 'bad' },
	{ email: null },
	{ phone: undefined },
	{ phone: ' ' },
	{ phone: 'no digits' },
	{ phone: 123 },
	{ phone: '1'.repeat(41) },
	{ yachtName: ' ' },
	{ yachtName: 'x'.repeat(121) },
	{ builder: ' ' },
	{ builder: 'x'.repeat(121) },
	{ model: null },
	{ model: ' ' },
	{ model: 'x'.repeat(121) },
	{ yearBuilt: 1799 },
	{ yearBuilt: 9999 },
	{ yearBuilt: 2000.5 },
	{ yearBuilt: '2000' },
	{ yearBuilt: null },
	{ lengthM: 0 },
	{ lengthM: -1 },
	{ lengthM: '36' },
	{ lengthM: null },
	{ location: ' ' },
	{ location: 'x'.repeat(241) },
	{ country: ' ' },
	{ country: 'x'.repeat(121) },
	{ askingPrice: 0, currency: 'USD' },
	{ askingPrice: -1, currency: 'USD' },
	{ askingPrice: null },
	{ askingPrice: '100', currency: 'USD' },
	{ askingPrice: 100 },
	{ currency: null },
	{ currency: 'US' },
	{ currency: 'USDD' },
	{ currency: 123 },
	{ description: null },
	{ description: 123 },
	{ description: 'x'.repeat(4001) },
];
