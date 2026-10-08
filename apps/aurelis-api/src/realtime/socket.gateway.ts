import { ChatService } from '../components/chat/chat.service';
import { ChatEventsService } from '../components/chat/chat-events.service';
import { GraphQLError } from 'graphql';
import { OnModuleDestroy } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../components/auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { SocketAdapterService } from './socket-adapter.service';
import { SocketStateService } from './socket-state.service';
import { RoomPolicy } from './room-policy';
import { conversationRoom, memberRoom, safeId, SOCKET_EVENTS as E } from './socket.constants';
interface Context {
	memberId: string;
	role: string;
	expiresAt: number;
	ready?: boolean;
}
type Events = Record<string, (...args: unknown[]) => void>;
type Client = Socket<Events, Events, Events, { member?: Context }>;
class SocketFailure extends Error {
	constructor(
		readonly code: string,
		readonly retryAfterSeconds?: number,
	) {
		super(code);
	}
}
function failure(error: unknown) {
	return {
		code:
			error instanceof SocketFailure
				? error.code
				: error instanceof GraphQLError && typeof error.extensions.code === 'string'
					? error.extensions.code
					: 'SOCKET_UNAVAILABLE',
		retryAfterSeconds:
			error instanceof SocketFailure
				? error.retryAfterSeconds
				: error instanceof GraphQLError
					? error.extensions.retryAfterSeconds
					: 5,
	};
}
@WebSocketGateway({ transports: ['websocket'], maxHttpBufferSize: 16384 })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
	@WebSocketServer() server!: Server;
	private timer?: ReturnType<typeof setInterval>;
	constructor(
		private readonly auth: AuthService,
		private readonly redis: RedisService,
		private readonly adapter: SocketAdapterService,
		private readonly state: SocketStateService,
		private readonly policy: RoomPolicy,
		private readonly chat: ChatService,
		private readonly chatEvents: ChatEventsService,
	) {}
	afterInit(server: Server): void {
		this.adapter.install(server);
		this.chatEvents.attach(server, () => this.adapter.ready());
		server.use((socket: Client, next) => {
			void this.authenticate(socket)
				.then(() => next())
				.catch((error: unknown) => {
					const data = failure(error);
					next(Object.assign(new Error(data.code), { data }));
				});
		});
		this.timer = setInterval(() => {
			for (const socket of server.sockets.sockets.values()) void this.refresh(socket as Client);
		}, 20000);
		this.timer.unref();
	}
	private async quota(scope: string, identity: string, limit: number): Promise<void> {
		const result = await this.redis.consumeRateLimit(scope, identity, limit, 60);
		if (!result) throw new SocketFailure('RATE_LIMIT_UNAVAILABLE', 5);
		if (!result.allowed) throw new SocketFailure('RATE_LIMITED', result.retryAfterSeconds);
	}
	private async authenticate(socket: Client): Promise<void> {
		await this.quota('socket-connect', socket.handshake.address, 20);
		if (!this.adapter.ready()) throw new SocketFailure('SOCKET_UNAVAILABLE', 5);
		const token: unknown = (socket.handshake.auth as { token?: unknown }).token;
		if (typeof token !== 'string' || token.length > 8192 || !token || /\s/.test(token))
			throw new SocketFailure('SOCKET_UNAUTHENTICATED');
		try {
			const member = await this.auth.authenticateRequest({ headers: { authorization: 'Bearer ' + token } });
			const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp?: number };
			if (!Number.isFinite(claims.exp) || claims.exp! * 1000 <= Date.now()) throw new Error();
			socket.data.member = { memberId: safeId(member._id), role: member.role, expiresAt: claims.exp! * 1000 };
		} catch {
			throw new SocketFailure('SOCKET_UNAUTHENTICATED');
		}
		// The framework/adapter never needs to retain credentials after verification.
		delete socket.handshake.auth.token;
	}
	async handleConnection(socket: Client): Promise<void> {
		socket.on('error', () => undefined);
		socket.use((_packet, next) => {
			void this.check(socket)
				.then(() => next())
				.catch((error: unknown) => {
					socket.emit(E.ERROR, failure(error));
					next(new Error('Socket request rejected'));
					if (!(error instanceof SocketFailure) || error.code !== 'RATE_LIMITED') socket.disconnect(true);
				});
		});
		socket.on('disconnecting', () => {
			const member = socket.data.member;
			if (!member) return;
			for (const room of socket.rooms) {
				if (room.startsWith('conversation:'))
					void this.state.typing(member.memberId, room.slice(13), socket.id, false).catch(() => undefined);
			}
		});
		try {
			const member = this.context(socket);
			await socket.join(memberRoom(member.memberId));
			const online = await this.state.presence(member.memberId, socket.id, 'touch');
			if (online === undefined) throw new SocketFailure('SOCKET_UNAVAILABLE');
			if (!socket.connected) {
				await this.state.presence(member.memberId, socket.id, 'remove');
				return;
			}
			member.ready = true;
			socket.emit(E.READY, { memberId: member.memberId, sessionId: socket.id });
			this.server.to(memberRoom(member.memberId)).emit(E.PRESENCE, { memberId: member.memberId, online });
		} catch {
			socket.emit(E.ERROR, { code: 'SOCKET_UNAVAILABLE' });
			socket.disconnect(true);
		}
	}
	private context(socket: Client): Context {
		const member = socket.data.member;
		if (!member || member.expiresAt <= Date.now()) throw new SocketFailure('SOCKET_UNAUTHENTICATED');
		return member;
	}
	private async check(socket: Client): Promise<void> {
		const member = this.context(socket);
		if (!member.ready) throw new SocketFailure('SOCKET_UNAVAILABLE');
		await this.quota('socket-event', member.memberId, 120);
		if (!this.adapter.ready()) throw new SocketFailure('SOCKET_UNAVAILABLE');
		try {
			await this.auth.getMe(member.memberId);
		} catch {
			throw new SocketFailure('SOCKET_UNAUTHENTICATED');
		}
	}
	private async refresh(socket: Client): Promise<void> {
		try {
			const member = this.context(socket);
			if (!this.adapter.ready()) throw new Error();
			await this.auth.getMe(member.memberId);
			if ((await this.state.presence(member.memberId, socket.id, 'touch')) === undefined) throw new Error();
			if (!socket.connected) await this.state.presence(member.memberId, socket.id, 'remove');
		} catch {
			socket.emit(E.ERROR, { code: 'SOCKET_UNAVAILABLE' });
			socket.disconnect(true);
		}
	}
	async handleDisconnect(socket: Client): Promise<void> {
		const member = socket.data.member;
		if (!member) return;
		// Conversation typing entries expire within five seconds, including crashes/outages.
		const online = await this.state.presence(member.memberId, socket.id, 'remove');
		if (online !== undefined && this.adapter.ready())
			this.server.to(memberRoom(member.memberId)).emit(E.PRESENCE, { memberId: member.memberId, online });
	}
	private async room(socket: Client, payload: unknown): Promise<string> {
		const id =
			payload && typeof payload === 'object' ? (payload as { conversationId?: unknown }).conversationId : undefined;
		let room: string;
		try {
			room = conversationRoom(id);
		} catch {
			throw new SocketFailure('INVALID_ROOM');
		}
		if (!(await this.policy.canAccess(this.context(socket).memberId, room.slice(13))))
			throw new SocketFailure('ROOM_FORBIDDEN');
		return room;
	}
	@SubscribeMessage(E.JOIN)
	async join(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		try {
			const room = await this.room(socket, payload);
			await socket.join(room);
			return { ok: true, room };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	@SubscribeMessage(E.LEAVE)
	async leave(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		try {
			const room = await this.room(socket, payload);
			await this.typing(socket, payload, false);
			await socket.leave(room);
			return { ok: true };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	@SubscribeMessage(E.HEARTBEAT)
	async heartbeat(@ConnectedSocket() socket: Client) {
		const memberId = this.context(socket).memberId;
		const online = await this.state.presence(memberId, socket.id, 'touch');
		if (!socket.connected) await this.state.presence(memberId, socket.id, 'remove');
		return online === undefined ? { ok: false, code: 'SOCKET_UNAVAILABLE' } : { ok: true, online };
	}
	private async typing(socket: Client, payload: unknown, active: boolean) {
		try {
			const room = await this.room(socket, payload);
			if (!socket.rooms.has(room)) throw new SocketFailure('ROOM_FORBIDDEN');
			const memberId = this.context(socket).memberId;
			const typing = await this.state.typing(memberId, room.slice(13), socket.id, active);
			if (typing === undefined || !this.adapter.ready()) throw new SocketFailure('SOCKET_UNAVAILABLE');
			socket.to(room).emit(typing ? E.TYPING_START : E.TYPING_STOP, {
				conversationId: room.slice(13),
				memberId,
				ttlSeconds: typing ? 5 : 0,
			});
			return { ok: true, typing };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	@SubscribeMessage(E.TYPING_START)
	start(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		return this.typing(socket, payload, true);
	}
	@SubscribeMessage(E.TYPING_STOP)
	stop(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		return this.typing(socket, payload, false);
	}

	@SubscribeMessage(E.MESSAGE_SEND)
	async sendMessage(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		try {
			const room = await this.room(socket, payload);
			const text = (payload as { text?: unknown }).text;
			const message = await this.chat.send(this.context(socket).memberId, room.slice(13), text);
			return { ok: true, message };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	@SubscribeMessage(E.MESSAGE_READ)
	async readMessages(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		try {
			const room = await this.room(socket, payload);
			return { ok: true, ...(await this.chat.read(this.context(socket).memberId, room.slice(13))) };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	@SubscribeMessage(E.PRESENCE_GET)
	async participantPresence(@ConnectedSocket() socket: Client, @MessageBody() payload: unknown) {
		try {
			const room = await this.room(socket, payload);
			const memberId = this.context(socket).memberId;
			const conversation = await this.chat.access(memberId, room.slice(13));
			const otherId =
				String(conversation.customerId) === memberId
					? String(conversation.brokerMemberId)
					: String(conversation.customerId);
			const online = await this.state.presence(otherId);
			if (online === undefined) throw new SocketFailure('SOCKET_UNAVAILABLE');
			return { ok: true, conversationId: room.slice(13), memberId: otherId, online };
		} catch (error) {
			return { ok: false, ...failure(error) };
		}
	}
	onModuleDestroy(): void {
		if (this.timer) clearInterval(this.timer);
	}
}
