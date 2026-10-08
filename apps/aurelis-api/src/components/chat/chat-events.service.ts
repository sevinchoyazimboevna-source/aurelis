import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { conversationRoom } from '../../realtime/socket.constants';
@Injectable()
export class ChatEventsService {
	private server?: Server;
	private ready?: () => boolean;
	attach(server: Server, ready: () => boolean): void {
		this.server = server;
		this.ready = ready;
	}
	emit(conversationId: string, event: string, payload: unknown): void {
		// Persistence succeeds even if realtime delivery is degraded; history is recoverable.
		if (!this.server || !this.ready?.()) return;
		this.server.to(conversationRoom(conversationId)).emit(event, payload);
	}
}
