import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AddressInfo } from 'node:net';
import { Server as HttpServer } from 'node:http';
import { AuthService } from '../src/components/auth/auth.service';
import { GoogleIdentityService } from '../src/components/auth/google-identity.service';
import { MemberRecord } from '../src/libs/schemas/Member.model';
import { Model } from 'mongoose';
import { MemberRole, MemberStatus } from '../src/libs/enums/member.enum';
import { RedisService } from '../src/redis/redis.service';
import { SocketGateway } from '../src/realtime/socket.gateway';
import { SocketAdapterService } from '../src/realtime/socket-adapter.service';
import { SocketStateService } from '../src/realtime/socket-state.service';
import { SocketHealthController } from '../src/realtime/socket-health.controller';
import { ChatService } from '../src/components/chat/chat.service';
import { ChatEventsService } from '../src/components/chat/chat-events.service';
import { RoomPolicy } from '../src/realtime/room-policy';
import { SOCKET_EVENTS as E, conversationRoom, memberRoom } from '../src/realtime/socket.constants';

describe('Realtime network (real JWT/AuthService, offline Redis/member storage)', () => {
	let app: INestApplication;
	let url: string;
	const id = '000000000000000000000001';
	const conversationId = '000000000000000000000002';
	const jwt = new JwtService({ secret: 'offline-socket-test-secret' });
	let available = true;
	let adapterReady = true;
	let permitRoom = false;
	let memberStatus: MemberStatus | undefined = MemberStatus.ACTIVE;
	let clock = 0;
	const sessions = new Map<string, Map<string, number>>();
	const counts = new Map<string, number>();
	const clients: Socket[] = [];
	const originalSecret = process.env.JWT_SECRET;
	const redis = {
		health: () => Promise.resolve({ status: available ? 'up' : 'down' }),
		consumeRateLimit: jest.fn((scope: string, identity: string, limit: number) => {
			if (!available) return Promise.resolve(undefined);
			const key = scope + ':' + identity;
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);
			return Promise.resolve({ allowed: count <= limit, retryAfterSeconds: 60 });
		}),
		evalState: jest.fn((_script: string, key: string, args: [string, string, number]) => {
			if (!available) return Promise.resolve(undefined);
			const [op, session, ttl] = args;
			const set = sessions.get(key) ?? new Map<string, number>();
			for (const [sid, expires] of set) if (expires <= clock) set.delete(sid);
			if (op === 'touch') set.set(session, clock + ttl * 1000);
			if (op === 'remove') set.delete(session);
			sessions.set(key, set);
			return Promise.resolve(set.size);
		}),
	};
	const once = <T>(socket: Socket, event: string): Promise<T> =>
		new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Missing event: ' + event)), 2000);
			socket.once(event, (value: T) => {
				clearTimeout(timeout);
				resolve(value);
			});
		});
	const token = (memberId = id, expiresIn = 60) => jwt.sign({ memberId }, { expiresIn });
	const client = (accessToken: unknown = token()) => {
		const socket = io(url, {
			transports: ['websocket'],
			auth: { token: accessToken },
			autoConnect: false,
			reconnection: false,
		});
		clients.push(socket);
		return socket;
	};
	const connect = async () => {
		const socket = client();
		const ready = once(socket, E.READY);
		socket.connect();
		await ready;
		return socket;
	};
	const ack = (socket: Socket, event: string, payload: unknown = {}) =>
		new Promise<Record<string, unknown>>((resolve, reject) => {
			socket
				.timeout(2000)
				.emit(event, payload, (error: Error | null, result: Record<string, unknown>) =>
					error ? reject(error) : resolve(result),
				);
		});
	beforeAll(async () => {
		process.env.JWT_SECRET = 'offline-socket-test-secret';
		const model = {
			findById: () => ({
				exec: () =>
					Promise.resolve(
						memberStatus ? { _id: id, email: 'user@example.com', role: MemberRole.USER, status: memberStatus } : null,
					),
			}),
		};
		const auth = new AuthService(model as unknown as Model<MemberRecord>, jwt, {} as GoogleIdentityService);
		const module = await Test.createTestingModule({
			controllers: [SocketHealthController],
			providers: [
				SocketGateway,
				ChatEventsService,
				{ provide: ChatService, useValue: {} },
				SocketStateService,
				{ provide: AuthService, useValue: auth },
				{ provide: RedisService, useValue: redis },
				{ provide: SocketAdapterService, useValue: { install: jest.fn(), ready: () => adapterReady } },
				{ provide: RoomPolicy, useValue: { canAccess: () => Promise.resolve(permitRoom) } },
			],
		}).compile();
		app = module.createNestApplication();
		await app.listen(0, '127.0.0.1');
		url = 'http://127.0.0.1:' + ((app.getHttpServer() as HttpServer).address() as AddressInfo).port;
	});
	beforeEach(() => {
		available = true;
		adapterReady = true;
		permitRoom = false;
		memberStatus = MemberStatus.ACTIVE;
		clock = 0;
		counts.clear();
		sessions.clear();
		jest.clearAllMocks();
	});
	afterEach(async () => {
		for (const socket of clients.splice(0)) socket.disconnect();
		// Let disconnect handlers settle before resetting offline state.
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	afterAll(async () => {
		await app.close();
		if (originalSecret === undefined) delete process.env.JWT_SECRET;
		else process.env.JWT_SECRET = originalSecret;
	});
	it('connects with verified context and autojoins only the private member room', async () => {
		const socket = await connect();
		const server = app.get(SocketGateway).server.sockets.sockets.get(socket.id!);
		expect((server?.data as { member: { memberId: string } } | undefined)?.member.memberId).toBe(id);
		expect(server?.handshake.auth.token).toBeUndefined();
		expect(server?.rooms.has(memberRoom(id))).toBe(true);
		expect(await ack(socket, E.HEARTBEAT)).toEqual({ ok: true, online: true });
	});
	it.each(['invalid', '', null, 'a b'])('rejects malformed/invalid auth token %p safely', async (value) => {
		const socket = client(value);
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('SOCKET_UNAUTHENTICATED');
		expect(socket.connected).toBe(false);
	});
	it.each([MemberStatus.BLOCKED, MemberStatus.DELETED, undefined])(
		'rejects blocked/deleted/missing members %p',
		async (status) => {
			memberStatus = status;
			const socket = client();
			const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
			socket.connect();
			expect((await error).data.code).toBe('SOCKET_UNAUTHENTICATED');
		},
	);
	it('rejects expired JWTs', async () => {
		const socket = client(token(id, -1));
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('SOCKET_UNAUTHENTICATED');
	});
	it('ignores URL query tokens', async () => {
		const socket = client(undefined);
		socket.auth = {};
		socket.io.opts.query = { token: token() };
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('SOCKET_UNAUTHENTICATED');
	});
	it('keeps member online until the last of multiple sockets disconnects', async () => {
		const a = await connect();
		const b = await connect();
		const state = app.get(SocketStateService);
		const changed = once<{ online: boolean }>(b, E.PRESENCE);
		a.disconnect();
		expect((await changed).online).toBe(true);
		expect(await state.presence(id)).toBe(true);
		b.disconnect();
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(await state.presence(id)).toBe(false);
	});
	it('expires orphan sessions and renews presence through heartbeat', async () => {
		const socket = await connect();
		const state = app.get(SocketStateService);
		clock = 59000;
		expect(await ack(socket, E.HEARTBEAT)).toEqual({ ok: true, online: true });
		clock = 61000;
		expect(await state.presence(id)).toBe(true);
		clock = 120000;
		expect(await state.presence(id)).toBe(false);
	});
	it('reconnects with a fresh session and requires fresh auth', async () => {
		const socket = await connect();
		const previous = socket.id;
		socket.disconnect();
		await new Promise((resolve) => setTimeout(resolve, 30));
		socket.auth = { token: token() };
		const ready = once(socket, E.READY);
		socket.connect();
		await ready;
		expect(socket.id).not.toBe(previous);
		expect(await app.get(SocketStateService).presence(id)).toBe(true);
		socket.disconnect();
		memberStatus = MemberStatus.BLOCKED;
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('SOCKET_UNAUTHENTICATED');
	});
	it('denies arbitrary rooms and all conversation access by default', async () => {
		const socket = await connect();
		expect(await ack(socket, E.JOIN, { conversationId })).toMatchObject({ ok: false, code: 'ROOM_FORBIDDEN' });
		expect(await ack(socket, E.JOIN, { conversationId: 'member:' + id })).toMatchObject({
			ok: false,
			code: 'INVALID_ROOM',
		});
		expect(await ack(socket, E.TYPING_START, { conversationId })).toMatchObject({ ok: false, code: 'ROOM_FORBIDDEN' });
	});
	it('supports authorized join/leave and typing stop with TTL', async () => {
		permitRoom = true;
		const a = await connect();
		const b = await connect();
		expect(await ack(a, E.TYPING_START, { conversationId })).toMatchObject({ code: 'ROOM_FORBIDDEN' });
		expect(await ack(a, E.JOIN, { conversationId })).toEqual({ ok: true, room: conversationRoom(conversationId) });
		await ack(b, E.JOIN, { conversationId });
		const typing = once<{ ttlSeconds: number }>(b, E.TYPING_START);
		await ack(a, E.TYPING_START, { conversationId });
		expect((await typing).ttlSeconds).toBe(5);
		clock = 6000;
		const key = 'aurelis:socket:typing:' + conversationId + ':' + id;
		expect(await redis.evalState('', key, ['read', '', 5])).toBe(0);
		await ack(a, E.TYPING_START, { conversationId });
		const stopped = once(b, E.TYPING_STOP);
		expect(await ack(a, E.TYPING_STOP, { conversationId })).toEqual({ ok: true, typing: false });
		await stopped;
		await ack(a, E.TYPING_START, { conversationId });
		await ack(a, E.LEAVE, { conversationId });
		expect(await redis.evalState('', key, ['read', '', 5])).toBe(0);
		expect(app.get(SocketGateway).server.sockets.sockets.get(a.id!)?.rooms.has(conversationRoom(conversationId))).toBe(
			false,
		);
	});
	it('preserves typing from another socket and cleans disconnected typing', async () => {
		permitRoom = true;
		const a = await connect();
		const b = await connect();
		await ack(a, E.JOIN, { conversationId });
		await ack(b, E.JOIN, { conversationId });
		await ack(a, E.TYPING_START, { conversationId });
		await ack(b, E.TYPING_START, { conversationId });
		expect(await ack(a, E.TYPING_STOP, { conversationId })).toEqual({ ok: true, typing: true });
		b.disconnect();
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(await redis.evalState('', 'aurelis:socket:typing:' + conversationId + ':' + id, ['read', '', 5])).toBe(0);
	});
	it('limits all incoming packets across member sockets', async () => {
		const a = await connect();
		const b = await connect();
		counts.set('socket-event:' + id, 120);
		const error = once<{ code: string; retryAfterSeconds: number }>(b, E.ERROR);
		b.emit('unknown:event');
		expect(await error).toEqual({ code: 'RATE_LIMITED', retryAfterSeconds: 60 });
		expect(a.connected).toBe(true);
	});
	it('limits connection attempts by server IP', async () => {
		counts.set('socket-connect:127.0.0.1', 20);
		const socket = client();
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('RATE_LIMITED');
	});
	it('fails closed when command Redis is unavailable', async () => {
		available = false;
		const socket = client();
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('RATE_LIMIT_UNAVAILABLE');
	});
	it('fails closed when adapter is unavailable and reports readiness', async () => {
		adapterReady = false;
		const socket = client();
		const error = once<Error & { data: { code: string } }>(socket, 'connect_error');
		socket.connect();
		expect((await error).data.code).toBe('SOCKET_UNAVAILABLE');
		const health = await request(app.getHttpServer()).get('/health/socket').expect(200);
		expect(health.body).toMatchObject({ status: 'degraded', ready: false, adapter: 'down' });
	});
	it('disconnects on Redis failure for established sockets', async () => {
		const socket = await connect();
		available = false;
		const error = once<{ code: string }>(socket, E.ERROR);
		const closed = once(socket, 'disconnect');
		socket.emit(E.HEARTBEAT);
		expect((await error).code).toBe('RATE_LIMIT_UNAVAILABLE');
		await closed;
	});
	it('rechecks active member status on events', async () => {
		const socket = await connect();
		memberStatus = MemberStatus.DELETED;
		const error = once<{ code: string }>(socket, E.ERROR);
		socket.emit(E.HEARTBEAT);
		expect((await error).code).toBe('SOCKET_UNAUTHENTICATED');
	});
	it('reports healthy socket readiness without secrets', async () => {
		const health = await request(app.getHttpServer()).get('/health/socket').expect(200);
		expect(health.body).toEqual({
			status: 'ok',
			ready: true,
			adapter: 'up',
			redis: { status: 'up' },
			policy: 'fail-closed',
		});
	});
});
