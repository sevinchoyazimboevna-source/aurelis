export const SOCKET_EVENTS = {
	READY: 'socket:ready',
	MESSAGE_SEND: 'message:send',
	MESSAGE_NEW: 'message:new',
	MESSAGE_READ: 'message:read',
	PRESENCE_GET: 'conversation:presence',
	ERROR: 'socket:error',
	JOIN: 'room:join',
	LEAVE: 'room:leave',
	PRESENCE: 'presence:status',
	HEARTBEAT: 'presence:heartbeat',
	TYPING_START: 'typing:start',
	TYPING_STOP: 'typing:stop',
} as const;
export const PRESENCE_TTL = 60;
export const TYPING_TTL = 5;
export function safeId(value: unknown): string {
	if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) throw new Error('INVALID_ROOM');
	return value.toLowerCase();
}
export const conversationRoom = (id: unknown): string => 'conversation:' + safeId(id);
export const memberRoom = (id: unknown): string => 'member:' + safeId(id);
