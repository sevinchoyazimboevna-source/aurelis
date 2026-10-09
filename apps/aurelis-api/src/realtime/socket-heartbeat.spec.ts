import { SocketGateway } from './socket.gateway';
import { AuthService } from '../components/auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { SocketAdapterService } from './socket-adapter.service';
import { SocketStateService } from './socket-state.service';
import { RoomPolicy } from './room-policy';
import { ChatService } from '../components/chat/chat.service';
import { ChatEventsService } from '../components/chat/chat-events.service';
import { Server } from 'socket.io';
describe('Server socket heartbeat lifecycle', () => {
	const memberId = '000000000000000000000001';
	let gateway: SocketGateway;
	const auth = { getMe: jest.fn() };
	const state = { presence: jest.fn(), typing: jest.fn() };
	const policy = { canAccess: jest.fn() };
	const adapter = { install: jest.fn(), ready: jest.fn() };
	const socket = {
		id: 'session',
		rooms: new Set<string>(),
		leave: jest.fn(),
		connected: true,
		data: { member: { memberId, expiresAt: 0 } },
		emit: jest.fn(),
		disconnect: jest.fn(),
	};
	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		auth.getMe.mockResolvedValue({ _id: memberId });
		state.presence.mockResolvedValue(true);
		policy.canAccess.mockResolvedValue(true);
		socket.rooms.clear();
		socket.leave.mockImplementation((room: string) => {
			socket.rooms.delete(room);
			return Promise.resolve();
		});
		adapter.ready.mockReturnValue(true);
		socket.connected = true;
		socket.data.member.expiresAt = Date.now() + 60000;
		gateway = new SocketGateway(
			auth as unknown as AuthService,
			{} as RedisService,
			adapter as unknown as SocketAdapterService,
			state as unknown as SocketStateService,
			policy as unknown as RoomPolicy,
			{} as ChatService,
			{ attach: jest.fn() } as unknown as ChatEventsService,
		);
		gateway.afterInit({ use: jest.fn(), sockets: { sockets: new Map([['session', socket]]) } } as unknown as Server);
	});
	afterEach(() => {
		gateway.onModuleDestroy();
		jest.useRealTimers();
	});
	it('renews TTL for quiet connections and stops its timer on shutdown', async () => {
		await jest.advanceTimersByTimeAsync(20000);
		expect(auth.getMe).toHaveBeenCalledWith(memberId);
		expect(state.presence).toHaveBeenCalledWith(memberId, 'session', 'touch');
		gateway.onModuleDestroy();
		state.presence.mockClear();
		await jest.advanceTimersByTimeAsync(20000);
		expect(state.presence).not.toHaveBeenCalled();
	});
	it.each(['adapter', 'state', 'member', 'expiry'])('disconnects quiet sockets on %s failure', async (failure) => {
		if (failure === 'adapter') adapter.ready.mockReturnValue(false);
		if (failure === 'state') state.presence.mockResolvedValue(undefined);
		if (failure === 'member') auth.getMe.mockRejectedValue(new Error('blocked'));
		if (failure === 'expiry') socket.data.member.expiresAt = Date.now() + 1;
		await jest.advanceTimersByTimeAsync(20000);
		expect(socket.disconnect).toHaveBeenCalledWith(true);
		expect(socket.emit).toHaveBeenCalledWith('socket:error', { code: 'SOCKET_UNAVAILABLE' });
	});
	it('removes revoked conversation rooms during a quiet heartbeat', async () => {
		const room = 'conversation:' + memberId;
		socket.rooms.add(room);
		policy.canAccess.mockResolvedValue(false);
		await jest.advanceTimersByTimeAsync(20000);
		expect(socket.leave).toHaveBeenCalledWith(room);
		expect(state.typing).toHaveBeenCalledWith(memberId, memberId, 'session', false);
		expect(socket.rooms.has(room)).toBe(false);
	});
	it('removes presence if a disconnect races with an in-flight heartbeat', async () => {
		state.presence.mockImplementationOnce(() => {
			socket.connected = false;
			return Promise.resolve(true);
		});
		await jest.advanceTimersByTimeAsync(20000);
		expect(state.presence).toHaveBeenLastCalledWith(memberId, 'session', 'remove');
	});
});
