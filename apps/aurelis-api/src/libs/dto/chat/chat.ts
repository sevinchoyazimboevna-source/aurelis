import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ConversationStatus } from '../../enums/chat.enum';
@ObjectType()
export class Conversation {
	@Field(() => ID) _id: Types.ObjectId;
	@Field(() => ID) yachtId: Types.ObjectId;
	@Field(() => ID) customerId: Types.ObjectId;
	@Field(() => ID) brokerId: Types.ObjectId;
	@Field(() => ID) brokerMemberId: Types.ObjectId;
	@Field(() => ConversationStatus) status: ConversationStatus;
	@Field(() => Date) lastMessageAt: Date;
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}
@ObjectType()
export class ChatMessage {
	@Field(() => ID) _id: Types.ObjectId;
	@Field(() => ID) conversationId: Types.ObjectId;
	@Field(() => ID) senderId: Types.ObjectId;
	@Field() text: string;
	@Field(() => Date, { nullable: true }) readAt?: Date | null;
	@Field(() => Date) createdAt: Date;
	@Field(() => Date) updatedAt: Date;
}
@ObjectType()
export class Conversations {
	@Field(() => [Conversation]) list: Conversation[];
	@Field(() => Int) total: number;
	@Field(() => Int) page: number;
	@Field(() => Int) limit: number;
	@Field(() => Int) totalPages: number;
}
@ObjectType()
export class ConversationMessages {
	@Field(() => [ChatMessage]) list: ChatMessage[];
	@Field(() => Int) total: number;
	@Field(() => Int) page: number;
	@Field(() => Int) limit: number;
	@Field(() => Int) totalPages: number;
}
@ObjectType()
export class ConversationReadResult {
	@Field(() => ID) conversationId: string;
	@Field(() => Int) modifiedCount: number;
	@Field(() => Date) readAt: Date;
}
