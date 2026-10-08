import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AddressInfo } from 'node:net';
import { Server as HttpServer } from 'node:http';
import { ChatResolver } from '../src/components/chat/chat.resolver';
import { ChatService } from '../src/components/chat/chat.service';
import { ChatEventsService } from '../src/components/chat/chat-events.service';
import { chatFixture, id } from '../src/components/chat/chat-test-fixture';
import { AuthRequest, AuthService } from '../src/components/auth/auth.service';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';
import { authError, AuthErrorCode, formatGraphQLError } from '../src/components/auth/auth-errors';
import { SocketGateway } from '../src/realtime/socket.gateway';
import { RoomPolicy } from '../src/realtime/room-policy';
import { SocketStateService } from '../src/realtime/socket-state.service';
import { SocketAdapterService } from '../src/realtime/socket-adapter.service';
import { RedisService } from '../src/redis/redis.service';
import { SOCKET_EVENTS as E, conversationRoom } from '../src/realtime/socket.constants';

describe('Private yacht chat GraphQL and Socket.IO (offline persistence/Redis)', () => {
	let app: INestApplication;
	let url: string;
	let f: ReturnType<typeof chatFixture>;
	const clients: Socket[] = [];
	const jwt = new JwtService({ secret: 'offline-chat-secret' });
	let available = true;
	let ready = true;
	const token = (n: number) => jwt.sign({ memberId: id(n) }, { expiresIn: 60 });
	const once = <T>(socket: Socket, event: string) =>
		new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('Missing ' + event)), 2000);
			socket.once(event, (value: T) => {
				clearTimeout(timer);
				resolve(value);
			});
		});
	const client = async (n: number) => {
		const socket = io(url, {
			transports: ['websocket'],
			auth: { token: token(n) },
			autoConnect: false,
			reconnection: false,
		});
		clients.push(socket);
		const started = once(socket, E.READY);
		socket.connect();
		await started;
		return socket;
	};
	const ack = (socket: Socket, event: string, payload: unknown) =>
		new Promise<Record<string, unknown>>((resolve, reject) => {
			socket
				.timeout(2000)
				.emit(event, payload, (error: Error | null, value: Record<string, unknown>) =>
					error ? reject(error) : resolve(value),
				);
		});
	const post = (query: string, n?: number) => {
		const req = request(app.getHttpServer()).post('/graphql');
		if (n) req.set('Authorization', 'Bearer ' + token(n));
		return req.send({ query });
	};
	const start = async () => String((await f.chat.start(id(1), id(10)))._id);
	beforeEach(async () => {
		f = chatFixture();
		available = true;
		ready = true;
		const auth = {
			getMe: (memberId: string) => f.chat.activeMember(memberId).then((m) => ({ ...m, _id: String(m._id) })),
			authenticateRequest: async (req: AuthRequest) => {
				if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
				try {
					const claims = jwt.verify<{ memberId: string }>(req.headers.authorization.replace('Bearer ', ''));
					req.authMember = { ...(await f.chat.activeMember(claims.memberId)), _id: claims.memberId };
					return req.authMember;
				} catch {
					throw authError(AuthErrorCode.INVALID_TOKEN);
				}
			},
		};
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			providers: [
				ChatResolver,
				AuthGuard,
				SocketGateway,
				RoomPolicy,
				{ provide: ChatService, useValue: f.chat },
				{ provide: ChatEventsService, useValue: f.events },
				{ provide: AuthService, useValue: auth },
				{
					provide: RedisService,
					useValue: {
						consumeRateLimit: () => Promise.resolve(available ? { allowed: true, retryAfterSeconds: 60 } : undefined),
					},
				},
				{ provide: SocketAdapterService, useValue: { install: jest.fn(), ready: () => ready } },
				{
					provide: SocketStateService,
					useValue: {
						presence: () => Promise.resolve(available ? true : undefined),
						typing: (_m: string, _c: string, _s: string, active: boolean) =>
							Promise.resolve(available ? active : undefined),
					},
				},
			],
		}).compile();
		app = module.createNestApplication();
		app.useLogger(false);
		app.useGlobalPipes(
			new ValidationPipe({
				transform: true,
				whitelist: true,
				forbidNonWhitelisted: true,
				validationError: { target: false, value: false },
			}),
		);
		await app.listen(0, '127.0.0.1');
		url = 'http://127.0.0.1:' + ((app.getHttpServer() as HttpServer).address() as AddressInfo).port;
	});
	afterEach(async () => {
		for (const socket of clients.splice(0)) socket.disconnect();
		await app.close();
	});
	it('rejects unauthenticated start/history/send/read/list', async () => {
		for (const query of [
			'mutation { startYachtConversation(yachtId:"' + id(10) + '") { _id } }',
			'{ getMyConversations { total } }',
			'{ getConversation(conversationId:"' + id(100) + '") { _id } }',
			'{ getConversationMessages(conversationId:"' + id(100) + '") { total } }',
			'mutation { sendMessage(input:{conversationId:"' + id(100) + '",text:"Hello"}) { _id } }',
			'mutation { markConversationRead(conversationId:"' + id(100) + '") { modifiedCount } }',
		])
			expect((await post(query)).body.errors[0].extensions.code).toBe('AUTH_UNAUTHENTICATED');
	});
	it('creates/reuses through GraphQL with derived IDs, private list and unread field', async () => {
		const query =
			'mutation { startYachtConversation(yachtId:"' +
			id(10) +
			'") { _id customerId brokerId brokerMemberId unreadCount } }';
		const first = await post(query, 1);
		const second = await post(query, 1);
		expect(first.body.errors).toBeUndefined();
		expect(second.body.data).toEqual(first.body.data);
		expect(first.body.data.startYachtConversation).toMatchObject({
			customerId: id(1),
			brokerId: id(20),
			brokerMemberId: id(2),
			unreadCount: 0,
		});
		expect(
			(await post('{ getMyConversations { total page limit totalPages } }', 3)).body.data.getMyConversations,
		).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
	});
	it.each(['DRAFT', 'ARCHIVED'])('rejects %s yacht with clear public error', async (status) => {
		f.yachts[0].status = status;
		expect(
			(await post('mutation { startYachtConversation(yachtId:"' + id(10) + '") { _id } }', 1)).body.errors[0].extensions
				.code,
		).toBe('CHAT_YACHT_NOT_FOUND');
	});
	it('returns clear no-broker business error', async () => {
		delete f.brokers[0].memberId;
		expect(
			(await post('mutation { startYachtConversation(yachtId:"' + id(10) + '") { _id } }', 1)).body.errors[0].message,
		).toContain('no usable assigned broker');
	});
	it.each([3, 5])('denies unrelated GraphQL member %s', async (n) => {
		const cid = await start();
		for (const query of [
			'{ getConversation(conversationId:"' + cid + '") { _id } }',
			'{ getConversationMessages(conversationId:"' + cid + '") { total } }',
			'mutation { markConversationRead(conversationId:"' + cid + '") { modifiedCount } }',
		])
			expect((await post(query, n)).body.errors[0].extensions.code).toBe('CHAT_FORBIDDEN');
	});
	it('ADMIN explicit history access remains read-only and private list remains own', async () => {
		const cid = await start();
		const response = await post(
			'{ getConversation(conversationId:"' +
				cid +
				'") { _id unreadCount } getConversationMessages(conversationId:"' +
				cid +
				'") { total } getMyConversations { total } }',
			4,
		);
		expect(response.body.errors).toBeUndefined();
		expect(response.body.data.getConversation.unreadCount).toBeNull();
		expect(response.body.data.getMyConversations.total).toBe(0);
		expect(
			(await post('mutation { sendMessage(input:{conversationId:"' + cid + '",text:"Hello"}) { _id } }', 4)).body
				.errors[0].extensions.code,
		).toBe('CHAT_FORBIDDEN');
	});
	it('sends/reads through GraphQL and returns derived sender and unread counts', async () => {
		const cid = await start();
		const sent = await post(
			'mutation { sendMessage(input:{conversationId:"' + cid + '",text:" Hello "}) { text senderId readAt } }',
			1,
		);
		expect(sent.body.errors).toBeUndefined();
		expect(sent.body.data.sendMessage).toEqual({ text: 'Hello', senderId: id(1), readAt: null });
		expect(
			(await post('{ getConversation(conversationId:"' + cid + '") { unreadCount } }', 2)).body.data.getConversation
				.unreadCount,
		).toBe(1);
		expect(
			(await post('mutation { markConversationRead(conversationId:"' + cid + '") { modifiedCount } }', 2)).body.data
				.markConversationRead.modifiedCount,
		).toBe(1);
	});
	it.each(['page:0', 'limit:51', 'limit:null'])('rejects invalid pagination %s', async (input) => {
		expect((await post('{ getMyConversations(input:{' + input + '}) { total } }', 1)).body.errors).toBeDefined();
	});
	it('rejects blank text and client identity fields', async () => {
		const cid = await start();
		for (const fields of ['text:" "', 'text:"Hello",senderId:"' + id(2) + '"'])
			expect(
				(await post('mutation { sendMessage(input:{conversationId:"' + cid + '",' + fields + '}) { _id } }', 1)).body
					.errors,
			).toBeDefined();
		expect(f.messages).toHaveLength(0);
	});
	it('authorized room send persists and emits only to joined conversation sockets', async () => {
		const cid = await start();
		const a = await client(1);
		const b = await client(2);
		const stranger = await client(3);
		const unjoined = await client(1);
		const leaked = jest.fn();
		stranger.on(E.MESSAGE_NEW, leaked);
		unjoined.on(E.MESSAGE_NEW, leaked);
		expect(await ack(a, E.JOIN, { conversationId: cid })).toMatchObject({ ok: true });
		expect(await ack(b, E.JOIN, { conversationId: cid })).toMatchObject({ ok: true });
		expect(await ack(stranger, E.JOIN, { conversationId: cid })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
		const received = once<{ senderId: string; text: string }>(b, E.MESSAGE_NEW);
		const sent = await ack(a, E.MESSAGE_SEND, { conversationId: cid, text: ' Private ', senderId: id(3) });
		expect(sent.ok).toBe(true);
		expect(await received).toMatchObject({ senderId: id(1), text: 'Private' });
		expect(f.messages).toHaveLength(1);
		await ack(stranger, E.HEARTBEAT, {});
		expect(leaked).not.toHaveBeenCalled();
		expect(await ack(stranger, E.MESSAGE_SEND, { conversationId: cid, text: 'Intrusion' })).toMatchObject({
			code: 'ROOM_FORBIDDEN',
		});
	});
	it('GraphQL send uses same room emission and socket read updates MongoDB', async () => {
		const cid = await start();
		const b = await client(2);
		await ack(b, E.JOIN, { conversationId: cid });
		const received = once(b, E.MESSAGE_NEW);
		await post('mutation { sendMessage(input:{conversationId:"' + cid + '",text:"Hello"}) { _id } }', 1);
		await received;
		const read = once(b, E.MESSAGE_READ);
		expect(await ack(b, E.MESSAGE_READ, { conversationId: cid })).toMatchObject({ ok: true, modifiedCount: 1 });
		await read;
		expect(f.messages[0].readAt).toBeInstanceOf(Date);
	});
	it('typing and participant presence require authorized membership', async () => {
		const cid = await start();
		const a = await client(1);
		const b = await client(2);
		const outsider = await client(5);
		expect(await ack(a, E.TYPING_START, { conversationId: cid })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
		await ack(a, E.JOIN, { conversationId: cid });
		await ack(b, E.JOIN, { conversationId: cid });
		const typing = once(b, E.TYPING_START);
		expect(await ack(a, E.TYPING_START, { conversationId: cid })).toMatchObject({ ok: true });
		await typing;
		expect(await ack(outsider, E.TYPING_START, { conversationId: cid })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
		expect(await ack(a, E.PRESENCE_GET, { conversationId: cid, memberId: id(3) })).toEqual({
			ok: true,
			conversationId: cid,
			memberId: id(2),
			online: true,
		});
		expect(await ack(outsider, E.PRESENCE_GET, { conversationId: cid })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
	});
	it('reconnect does not autojoin and membership is checked again', async () => {
		const cid = await start();
		const a = await client(1);
		await ack(a, E.JOIN, { conversationId: cid });
		a.disconnect();
		a.auth = { token: token(1) };
		const started = once(a, E.READY);
		a.connect();
		await started;
		expect(app.get(SocketGateway).server.sockets.sockets.get(a.id!)?.rooms.has(conversationRoom(cid))).toBe(false);
		expect(await ack(a, E.JOIN, { conversationId: cid })).toMatchObject({ ok: true });
		const outsider = await client(3);
		expect(await ack(outsider, E.JOIN, { conversationId: cid })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
	});
	it.each([undefined, { allowed: false, retryAfterSeconds: 9 }])(
		'socket message fails closed for dedicated limiter',
		async (result) => {
			const cid = await start();
			const a = await client(1);
			f.redis.consumeRateLimit.mockResolvedValueOnce(result);
			expect(await ack(a, E.MESSAGE_SEND, { conversationId: cid, text: 'Hello' })).toMatchObject({
				ok: false,
				code: result ? 'RATE_LIMITED' : 'RATE_LIMIT_UNAVAILABLE',
			});
			expect(f.messages).toHaveLength(0);
		},
	);
	it('masks persistence errors without leaking stack/body/database details', async () => {
		const cid = await start();
		const a = await client(1);
		f.messageModel.create.mockRejectedValueOnce(new Error('credential secret stack'));
		const response = await ack(a, E.MESSAGE_SEND, { conversationId: cid, text: 'Hello' });
		expect(response).toEqual({ ok: false, code: 'SOCKET_UNAVAILABLE', retryAfterSeconds: 5 });
	});
});
