import { Injectable } from '@nestjs/common';
import { ChatService } from '../components/chat/chat.service';
@Injectable()
export class RoomPolicy {
	constructor(private readonly chat: ChatService) {}
	async canAccess(memberId: string, conversationId: string): Promise<boolean> {
		try {
			await this.chat.access(memberId, conversationId);
			return true;
		} catch {
			return false;
		}
	}
}
