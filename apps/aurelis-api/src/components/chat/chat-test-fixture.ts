import { Model, Types } from 'mongoose';
import { ChatService } from './chat.service';
import { ChatEventsService } from './chat-events.service';
import { RateLimitService } from '../../redis/rate-limit.service';
import { RedisService } from '../../redis/redis.service';
import { Conversation, ChatMessage } from '../../libs/dto/chat/chat';
import { Yacht } from '../../libs/dto/yacht/yacht';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';
export const id = (n: number) => n.toString(16).padStart(24, '0');
type Row = Record<string, unknown>;
function eq(a: unknown, b: unknown) {
	return String(a) === String(b);
}
function matches(row: Row, filter: Row): boolean {
	return Object.entries(filter).every(([key, value]) => {
		if (key === '$or') return (value as Row[]).some((part) => matches(row, part));
		if (value && typeof value === 'object' && !(value instanceof Types.ObjectId) && !(value instanceof Date)) {
			const op = value as Row;
			if ('$ne' in op) return !eq(row[key], op.$ne);
			if ('$lte' in op) return Number(row[key]) <= Number(op.$lte);
		}
		return value === null ? row[key] == null : eq(row[key], value);
	});
}
export function chatFixture() {
	const conversations: Row[] = [];
	const messages: Row[] = [];
	const yachts: Row[] = [
		{ _id: new Types.ObjectId(id(10)), status: 'PUBLISHED', brokerId: new Types.ObjectId(id(20)) },
	];
	const brokers: Row[] = [{ _id: new Types.ObjectId(id(20)), memberId: new Types.ObjectId(id(2)), isActive: true }];
	const members: Row[] = [1, 2, 3, 4, 5].map((n) => ({
		_id: new Types.ObjectId(id(n)),
		role: n === 4 ? MemberRole.ADMIN : n === 5 ? MemberRole.CREW : MemberRole.USER,
		status: MemberStatus.ACTIVE,
	}));
	let sequence = 100;
	const query = (fetch: () => Row[]) => {
		let sort: Record<string, number> = {};
		let skip = 0;
		let limit = Infinity;
		const q = {
			sort: (value: Record<string, number>) => {
				sort = value;
				return q;
			},
			skip: (value: number) => {
				skip = value;
				return q;
			},
			limit: (value: number) => {
				limit = value;
				return q;
			},
			lean: () => q,
			exec: () =>
				Promise.resolve(
					fetch()
						.slice()
						.sort((a, b) => {
							for (const [key, direction] of Object.entries(sort)) {
								const av = a[key] instanceof Date ? Number(a[key]) : String(a[key]);
								const bv = b[key] instanceof Date ? Number(b[key]) : String(b[key]);
								if (av < bv) return -direction;
								if (av > bv) return direction;
							}
							return 0;
						})
						.slice(skip, skip + limit),
				),
		};
		return q;
	};
	const single = (fetch: () => Row | null) => {
		const q = { lean: () => q, exec: () => Promise.resolve(fetch()) };
		return q;
	};
	const model = (rows: Row[]) => ({
		find: jest.fn((filter: Row) => query(() => rows.filter((row) => matches(row, filter)))),
		findOne: jest.fn((filter: Row) => single(() => rows.find((row) => matches(row, filter)) ?? null)),
		findById: jest.fn((value: unknown) => single(() => rows.find((row) => eq(row._id, value)) ?? null)),
		exists: jest.fn((filter: Row) => Promise.resolve(rows.find((row) => matches(row, filter)) ?? null)),
		countDocuments: jest.fn((filter: Row) => ({
			exec: () => Promise.resolve(rows.filter((row) => matches(row, filter)).length),
		})),
		findOneAndUpdate: jest.fn((filter: Row, update: { $setOnInsert: Row }) =>
			single(() => {
				let row = rows.find((row) => matches(row, filter));
				if (!row) {
					row = {
						_id: new Types.ObjectId(id(sequence++)),
						createdAt: new Date(),
						updatedAt: new Date(),
						...update.$setOnInsert,
					};
					rows.push(row);
				}
				return row;
			}),
		),
		create: jest.fn((fields: Row) => {
			const row = {
				_id: new Types.ObjectId(id(sequence++)),
				createdAt: new Date(),
				updatedAt: new Date(),
				readAt: null,
				__v: 0,
				...fields,
			};
			rows.push(row);
			return Promise.resolve({ toObject: () => row });
		}),
		updateOne: jest.fn((filter: Row, update: { $max: Row }) => ({
			exec: () => {
				const row = rows.find((row) => matches(row, filter));
				if (row)
					for (const [key, value] of Object.entries(update.$max))
						if (Number(value) > Number(row[key])) row[key] = value;
				return Promise.resolve({ modifiedCount: row ? 1 : 0 });
			},
		})),
		updateMany: jest.fn((filter: Row, update: { $set: Row }) => ({
			exec: () => {
				const targets = rows.filter((row) => matches(row, filter));
				targets.forEach((row) => Object.assign(row, update.$set));
				return Promise.resolve({ modifiedCount: targets.length });
			},
		})),
	});
	const conversationModel = model(conversations);
	const messageModel = model(messages);
	const yachtModel = model(yachts);
	const brokerModel = model(brokers);
	const memberModel = model(members);
	const redis = { consumeRateLimit: jest.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 60 }) };
	const events = new ChatEventsService();
	const emit = jest.spyOn(events, 'emit');
	const chat = new ChatService(
		conversationModel as unknown as Model<Conversation>,
		messageModel as unknown as Model<ChatMessage>,
		yachtModel as unknown as Model<Yacht>,
		brokerModel as unknown as Model<BrokerProfile & { memberId?: Types.ObjectId }>,
		memberModel as unknown as Model<MemberRecord>,
		new RateLimitService(redis as unknown as RedisService),
		events,
	);
	return {
		chat,
		events,
		emit,
		redis,
		conversations,
		messages,
		yachts,
		brokers,
		members,
		conversationModel,
		messageModel,
		memberModel,
		brokerModel,
	};
}
