import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PRESENCE_TTL, TYPING_TTL, safeId } from './socket.constants';
// Redis TIME avoids clock skew across API instances. Expired sessions are pruned atomically.
export const SESSION_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
if ARGV[1] == 'touch' then redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]) * 1000, ARGV[2]) end
if ARGV[1] == 'remove' then redis.call('ZREM', KEYS[1], ARGV[2]) end
local count = redis.call('ZCARD', KEYS[1])
if count > 0 then redis.call('EXPIRE', KEYS[1], ARGV[3]) else redis.call('DEL', KEYS[1]) end
return count
`;
@Injectable()
export class SocketStateService {
	constructor(private readonly redis: RedisService) {}
	async presence(memberId: string, sessionId = '', operation = 'read'): Promise<boolean | undefined> {
		const count = await this.redis.evalState(SESSION_SCRIPT, 'aurelis:socket:presence:' + safeId(memberId), [
			operation,
			sessionId,
			PRESENCE_TTL,
		]);
		return typeof count === 'number' ? count > 0 : undefined;
	}
	async typing(
		memberId: string,
		conversationId: string,
		sessionId: string,
		active: boolean,
	): Promise<boolean | undefined> {
		const key = 'aurelis:socket:typing:' + safeId(conversationId) + ':' + safeId(memberId);
		const count = await this.redis.evalState(SESSION_SCRIPT, key, [active ? 'touch' : 'remove', sessionId, TYPING_TTL]);
		return typeof count === 'number' ? count > 0 : undefined;
	}
}
