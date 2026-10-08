import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { Model, Types } from 'mongoose';
import { Conversation, ChatMessage } from '../../libs/dto/chat/chat';
import { ChatPageInput } from '../../libs/dto/chat/chat.input';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { Yacht } from '../../libs/dto/yacht/yacht';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';
import { ConversationStatus } from '../../libs/enums/chat.enum';
import { buildPublicYachtVisibilityFilter } from '../yacht/yacht-visibility';
import { RateLimitService } from '../../redis/rate-limit.service';
import { ChatEventsService } from './chat-events.service';
import { SOCKET_EVENTS as E } from '../../realtime/socket.constants';
export function chatError(code: string, message: string): GraphQLError {
	return new GraphQLError(message, { extensions: { code } });
}
export function chatId(value: unknown): Types.ObjectId {
	if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
		throw chatError('BAD_USER_INPUT', 'Invalid chat ID.');
	return new Types.ObjectId(value);
}
export function chatPage(input: ChatPageInput = new ChatPageInput()) {
	const { page = 1, limit = 20 } = input;
	if (
		!Number.isSafeInteger(page) ||
		page < 1 ||
		!Number.isInteger(limit) ||
		limit < 1 ||
		limit > 50 ||
		!Number.isSafeInteger((page - 1) * limit)
	)
		throw chatError('BAD_USER_INPUT', 'Invalid chat pagination.');
	return { page, limit };
}
@Injectable()
export class ChatService {
	constructor(
		@InjectModel('Conversation') private readonly conversations: Model<Conversation>,
		@InjectModel('Message') private readonly messages: Model<ChatMessage>,
		@InjectModel('Yacht') private readonly yachts: Model<Yacht>,
		@InjectModel('BrokerProfile') private readonly brokers: Model<BrokerProfile & { memberId?: Types.ObjectId }>,
		@InjectModel('Member') private readonly members: Model<MemberRecord>,
		private readonly limiter: RateLimitService,
		private readonly events: ChatEventsService,
	) {}
	async activeMember(memberId: string): Promise<MemberRecord> {
		const member = await this.members
			.findOne({ _id: chatId(memberId), status: MemberStatus.ACTIVE })
			.lean()
			.exec();
		if (!member) throw chatError('AUTH_UNAUTHENTICATED', 'Authentication is required.');
		return member;
	}
	private participant(conversation: Conversation, memberId: string): boolean {
		return [conversation.customerId, conversation.brokerMemberId].some((id) => String(id) === memberId.toLowerCase());
	}
	async access(memberId: string, conversationId: string, allowAdmin = false): Promise<Conversation> {
		const member = await this.activeMember(memberId);
		const conversation = await this.conversations.findById(chatId(conversationId)).lean().exec();
		// Missing and unrelated IDs share the same error to avoid existence disclosure.
		if (
			!conversation ||
			(!this.participant(conversation, memberId) && !(allowAdmin && member.role === MemberRole.ADMIN))
		)
			throw chatError('CHAT_FORBIDDEN', 'Conversation access denied.');
		return conversation;
	}
	async start(memberId: string, yachtId: string): Promise<Conversation> {
		await this.activeMember(memberId);
		const yacht = await this.yachts
			.findOne({ _id: chatId(yachtId), ...buildPublicYachtVisibilityFilter() })
			.lean()
			.exec();
		if (!yacht) throw chatError('CHAT_YACHT_NOT_FOUND', 'Public yacht not found.');
		const broker = yacht.brokerId
			? await this.brokers.findOne({ _id: yacht.brokerId, isActive: true }).lean().exec()
			: null;
		if (!broker?.memberId || !(await this.members.exists({ _id: broker.memberId, status: MemberStatus.ACTIVE })))
			throw chatError('CHAT_BROKER_UNAVAILABLE', 'This yacht has no usable assigned broker account.');
		if (String(broker.memberId) === memberId.toLowerCase())
			throw chatError('CHAT_SELF_CONVERSATION', 'You cannot start a conversation with yourself.');
		const relationship = { customerId: chatId(memberId), yachtId: yacht._id, brokerId: broker._id };
		let conversation: Conversation | null;
		try {
			conversation = await this.conversations
				.findOneAndUpdate(
					relationship,
					{
						$setOnInsert: {
							...relationship,
							brokerMemberId: broker.memberId,
							status: ConversationStatus.ACTIVE,
							lastMessageAt: new Date(),
						},
					},
					{ upsert: true, new: true, runValidators: true },
				)
				.lean()
				.exec();
		} catch (error) {
			if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
			conversation = await this.conversations.findOne(relationship).lean().exec();
		}
		if (!conversation) throw chatError('CHAT_UNAVAILABLE', 'Conversation temporarily unavailable.');
		return conversation;
	}
	async mine(memberId: string, input?: ChatPageInput) {
		await this.activeMember(memberId);
		const { page, limit } = chatPage(input);
		const id = chatId(memberId);
		const filter = { $or: [{ customerId: id }, { brokerMemberId: id }] };
		const [list, total] = await Promise.all([
			this.conversations
				.find(filter)
				.sort({ lastMessageAt: -1, _id: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.conversations.countDocuments(filter).exec(),
		]);
		return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
	}
	async history(memberId: string, conversationId: string, input?: ChatPageInput) {
		await this.access(memberId, conversationId, true);
		const { page, limit } = chatPage(input);
		const filter = { conversationId: chatId(conversationId) };
		const [list, total] = await Promise.all([
			this.messages
				.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.messages.countDocuments(filter).exec(),
		]);
		return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
	}
	async unread(memberId: string, conversationId: string): Promise<number> {
		await this.access(memberId, conversationId);
		return this.messages
			.countDocuments({ conversationId: chatId(conversationId), senderId: { $ne: chatId(memberId) }, readAt: null })
			.exec();
	}
	async send(memberId: string, conversationId: string, value: unknown): Promise<ChatMessage> {
		const conversation = await this.access(memberId, conversationId);
		if (conversation.status !== ConversationStatus.ACTIVE) throw chatError('CHAT_CLOSED', 'Conversation is closed.');
		if (typeof value !== 'string' || !value.trim() || value.trim().length > 4000)
			throw chatError('BAD_USER_INPUT', 'Message text must contain 1 to 4000 characters.');
		await this.limiter.message(memberId.toLowerCase());
		const document = await this.messages.create({
			conversationId: chatId(conversationId),
			senderId: chatId(memberId),
			text: value.trim(),
		});
		const saved = document.toObject();
		const message: ChatMessage = {
			_id: saved._id,
			conversationId: saved.conversationId,
			senderId: saved.senderId,
			text: saved.text,
			readAt: saved.readAt ?? null,
			createdAt: saved.createdAt,
			updatedAt: saved.updatedAt,
		};
		// $max prevents concurrent/out-of-order sends from regressing activity.
		await this.conversations
			.updateOne({ _id: conversation._id }, { $max: { lastMessageAt: message.createdAt } })
			.exec();
		this.events.emit(conversationId, E.MESSAGE_NEW, message);
		return message;
	}
	async read(memberId: string, conversationId: string) {
		await this.access(memberId, conversationId);
		const readAt = new Date();
		const result = await this.messages
			.updateMany(
				{
					conversationId: chatId(conversationId),
					senderId: { $ne: chatId(memberId) },
					readAt: null,
					createdAt: { $lte: readAt },
				},
				{ $set: { readAt } },
			)
			.exec();
		const response = { conversationId: conversationId.toLowerCase(), modifiedCount: result.modifiedCount, readAt };
		if (result.modifiedCount)
			this.events.emit(conversationId, E.MESSAGE_READ, { ...response, memberId: memberId.toLowerCase() });
		return response;
	}
}
