import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
	Conversation,
	Conversations,
	ChatMessage,
	ConversationMessages,
	ConversationReadResult,
} from '../../libs/dto/chat/chat';
import { ChatPageInput, SendMessageInput } from '../../libs/dto/chat/chat.input';
import { Member } from '../auth/auth.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentMember } from '../auth/decorators/current-member.decorator';
import { MemberRole } from '../../libs/enums/member.enum';
import { ChatService } from './chat.service';
@UseGuards(AuthGuard)
@Resolver(() => Conversation)
export class ChatResolver {
	constructor(private readonly chat: ChatService) {}
	@Mutation(() => Conversation)
	startYachtConversation(@CurrentMember() member: Member, @Args('yachtId', { type: () => ID }) id: string) {
		return this.chat.start(member._id, id);
	}
	@Query(() => Conversations)
	getMyConversations(@CurrentMember() member: Member, @Args('input', { nullable: true }) input?: ChatPageInput) {
		return this.chat.mine(member._id, input);
	}
	@Query(() => Conversation)
	getConversation(@CurrentMember() member: Member, @Args('conversationId', { type: () => ID }) id: string) {
		return this.chat.access(member._id, id, true);
	}
	@Query(() => ConversationMessages)
	getConversationMessages(
		@CurrentMember() member: Member,
		@Args('conversationId', { type: () => ID }) id: string,
		@Args('input', { nullable: true }) input?: ChatPageInput,
	) {
		return this.chat.history(member._id, id, input);
	}
	@Mutation(() => ChatMessage)
	sendMessage(@CurrentMember() member: Member, @Args('input') input: SendMessageInput) {
		return this.chat.send(member._id, input.conversationId, input.text);
	}
	@Mutation(() => ConversationReadResult)
	markConversationRead(@CurrentMember() member: Member, @Args('conversationId', { type: () => ID }) id: string) {
		return this.chat.read(member._id, id);
	}
	@ResolveField(() => Int, { nullable: true })
	unreadCount(@Parent() conversation: Conversation, @CurrentMember() member: Member) {
		if (member.role === MemberRole.ADMIN) return null;
		if (![conversation.customerId, conversation.brokerMemberId].some((id) => String(id) === member._id)) return null;
		return this.chat.unread(member._id, String(conversation._id));
	}
}
