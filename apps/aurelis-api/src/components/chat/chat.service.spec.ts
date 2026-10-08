import { chatFixture, id } from './chat-test-fixture';
import { chatPage } from './chat.service';
import { MemberStatus } from '../../libs/enums/member.enum';
import { Types, model } from 'mongoose';
import ConversationSchema from '../../libs/schemas/Conversation.model';
import MessageSchema from '../../libs/schemas/Message.model';
import { SOCKET_EVENTS as E } from '../../realtime/socket.constants';
describe('Yacht private chat (offline MongoDB)', () => {
	let f: ReturnType<typeof chatFixture>;
	beforeEach(() => {
		f = chatFixture();
	});
	const start = async () => String((await f.chat.start(id(1), id(10)))._id);
	it('derives authenticated customer, assigned profile and member and reuses starts', async () => {
		const a = await f.chat.start(id(1), id(10));
		const b = await f.chat.start(id(1), id(10));
		expect(String(a._id)).toBe(String(b._id));
		expect(String(a.customerId)).toBe(id(1));
		expect(String(a.brokerId)).toBe(id(20));
		expect(String(a.brokerMemberId)).toBe(id(2));
		expect(f.conversations).toHaveLength(1);
	});
	it.each(['DRAFT', 'ARCHIVED', 'missing'])('rejects unavailable yacht %s', async (status) => {
		if (status === 'missing') f.yachts.splice(0);
		else f.yachts[0].status = status;
		await expect(f.chat.start(id(1), id(10))).rejects.toMatchObject({ extensions: { code: 'CHAT_YACHT_NOT_FOUND' } });
		expect(f.conversations).toHaveLength(0);
	});
	it.each(['unassigned', 'missing', 'inactive', 'unlinked', 'missing-member', 'blocked-member'])(
		'rejects unusable broker %s',
		async (state) => {
			if (state === 'unassigned') delete f.yachts[0].brokerId;
			if (state === 'missing') f.brokers.splice(0);
			if (state === 'inactive') f.brokers[0].isActive = false;
			if (state === 'unlinked') delete f.brokers[0].memberId;
			if (state === 'missing-member') f.members.splice(1, 1);
			if (state === 'blocked-member') f.members[1].status = MemberStatus.BLOCKED;
			await expect(f.chat.start(id(1), id(10))).rejects.toMatchObject({
				extensions: { code: 'CHAT_BROKER_UNAVAILABLE' },
			});
			expect(f.conversations).toHaveLength(0);
		},
	);
	it('rejects self chat', async () => {
		await expect(f.chat.start(id(2), id(10))).rejects.toMatchObject({ extensions: { code: 'CHAT_SELF_CONVERSATION' } });
	});
	it('fails authentication for missing/blocked member', async () => {
		await expect(f.chat.start(id(99), id(10))).rejects.toMatchObject({ extensions: { code: 'AUTH_UNAUTHENTICATED' } });
		f.members[0].status = MemberStatus.BLOCKED;
		await expect(f.chat.start(id(1), id(10))).rejects.toThrow();
	});
	it('handles duplicate unique-index race by retrieving existing relationship', async () => {
		const cid = await start();
		f.conversationModel.findOneAndUpdate.mockImplementationOnce(() => {
			throw Object.assign(new Error(), { code: 11000 });
		});
		expect(String((await f.chat.start(id(1), id(10)))._id)).toBe(cid);
	});
	it('permits customer and broker and explicit read-only ADMIN access', async () => {
		const cid = await start();
		for (const n of [1, 2]) expect(await f.chat.access(id(n), cid)).toBeDefined();
		expect(await f.chat.access(id(4), cid, true)).toBeDefined();
		for (const method of [
			() => f.chat.access(id(4), cid),
			() => f.chat.send(id(4), cid, 'Hello'),
			() => f.chat.read(id(4), cid),
		])
			await expect(method()).rejects.toMatchObject({ extensions: { code: 'CHAT_FORBIDDEN' } });
	});
	it.each([3, 5])('forbids unrelated member %s from history/send/read', async (n) => {
		const cid = await start();
		for (const method of [
			() => f.chat.access(id(n), cid, true),
			() => f.chat.history(id(n), cid),
			() => f.chat.send(id(n), cid, 'Hello'),
			() => f.chat.read(id(n), cid),
		])
			await expect(method()).rejects.toThrow('Conversation access denied');
	});
	it('preserves history after hiding/deleting yacht and broker or relinking profile', async () => {
		const cid = await start();
		f.yachts[0].status = 'DRAFT';
		f.brokers[0].memberId = new Types.ObjectId(id(3));
		expect(await f.chat.access(id(2), cid)).toBeDefined();
		await expect(f.chat.access(id(3), cid)).rejects.toThrow();
		f.yachts.splice(0);
		f.brokers.splice(0);
		expect(await f.chat.history(id(1), cid)).toMatchObject({ total: 0 });
	});
	it('broker reassignment creates separate relationship without moving old ownership', async () => {
		const old = await start();
		f.brokers.push({ _id: new Types.ObjectId(id(21)), memberId: new Types.ObjectId(id(3)), isActive: true });
		f.yachts[0].brokerId = new Types.ObjectId(id(21));
		const next = await start();
		expect(next).not.toBe(old);
		expect(await f.chat.access(id(2), old)).toBeDefined();
		await expect(f.chat.access(id(3), old)).rejects.toThrow();
	});
	it('persists trimmed message and updates activity with atomic max then emits privately', async () => {
		const cid = await start();
		const message = await f.chat.send(id(1), cid, ' Hello ');
		expect(message.text).toBe('Hello');
		expect(String(message.senderId)).toBe(id(1));
		expect(f.messages).toHaveLength(1);
		expect(message).not.toHaveProperty('__v');
		expect(f.conversationModel.updateOne).toHaveBeenCalledWith(
			{ _id: expect.any(Types.ObjectId) },
			{ $max: { lastMessageAt: message.createdAt } },
		);
		expect(f.emit).toHaveBeenCalledWith(cid, E.MESSAGE_NEW, message);
		expect(f.redis.consumeRateLimit).toHaveBeenCalledWith('chat-message', id(1), 30, 60);
	});
	it.each(['', '   ', 'a'.repeat(4001), null, 42])('rejects invalid message text', async (text) => {
		const cid = await start();
		await expect(f.chat.send(id(1), cid, text)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
		expect(f.messages).toHaveLength(0);
	});
	it('denies sending in closed conversation', async () => {
		const cid = await start();
		f.conversations[0].status = 'CLOSED';
		await expect(f.chat.send(id(1), cid, 'Hi')).rejects.toThrow('Conversation is closed');
	});
	it.each([undefined, { allowed: false, retryAfterSeconds: 12 }])(
		'fails closed on unavailable/exhausted Redis',
		async (result) => {
			const cid = await start();
			f.redis.consumeRateLimit.mockResolvedValueOnce(result);
			await expect(f.chat.send(id(1), cid, 'Hello')).rejects.toMatchObject({
				extensions: { code: result ? 'RATE_LIMITED' : 'RATE_LIMIT_UNAVAILABLE' },
			});
			expect(f.messages).toHaveLength(0);
			expect(f.emit).not.toHaveBeenCalled();
		},
	);
	it('derives unread count for recipient only and read receipts are idempotent', async () => {
		const cid = await start();
		await f.chat.send(id(1), cid, 'First');
		await f.chat.send(id(2), cid, 'Reply');
		expect(await f.chat.unread(id(1), cid)).toBe(1);
		expect(await f.chat.unread(id(2), cid)).toBe(1);
		expect(await f.chat.read(id(2), cid)).toMatchObject({ modifiedCount: 1 });
		expect(f.messages[0].readAt).toBeInstanceOf(Date);
		expect(f.messages[1].readAt).toBeNull();
		expect(await f.chat.unread(id(2), cid)).toBe(0);
		expect(await f.chat.unread(id(1), cid)).toBe(1);
		expect(await f.chat.read(id(2), cid)).toMatchObject({ modifiedCount: 0 });
		expect(f.emit).toHaveBeenCalledWith(
			cid,
			E.MESSAGE_READ,
			expect.objectContaining({ memberId: id(2), modifiedCount: 1 }),
		);
	});
	it('paginates messages newest first with deterministic ID ties and private lists', async () => {
		const cid = await start();
		for (let n = 0; n < 3; n++) await f.chat.send(id(1), cid, String(n));
		f.messages.forEach((row) => {
			row.createdAt = new Date('2026-01-01');
		});
		expect(await f.chat.history(id(2), cid, { page: 2, limit: 2 })).toMatchObject({
			list: [{ text: '0' }],
			total: 3,
			totalPages: 2,
		});
		expect(await f.chat.mine(id(3))).toMatchObject({ total: 0, page: 1, limit: 20 });
		expect(await f.chat.mine(id(2))).toMatchObject({ total: 1 });
		expect(await f.chat.mine(id(4))).toMatchObject({ total: 0 });
	});
	it.each([
		{ page: 0, limit: 20 },
		{ page: 1, limit: 51 },
		{ page: 1, limit: 0 },
		{ page: 1.5, limit: 20 },
		{ page: 1, limit: null },
	])('validates pagination', (input) => {
		expect(() => chatPage(input as { page: number; limit: number })).toThrow();
	});
	it('declares explicit collections, unique relationship, history/unread indexes and validates schemas offline', async () => {
		expect(ConversationSchema.get('collection')).toBe('conversations');
		expect(MessageSchema.get('collection')).toBe('messages');
		expect(ConversationSchema.indexes()).toContainEqual([
			{ customerId: 1, yachtId: 1, brokerId: 1 },
			expect.objectContaining({ unique: true }),
		]);
		const Message = model('OfflineChatMessage', MessageSchema);
		await expect(new Message({ conversationId: id(10), senderId: id(1), text: ' ' }).validate()).rejects.toThrow();
	});
});
