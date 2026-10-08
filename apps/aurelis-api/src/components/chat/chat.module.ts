import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import ConversationSchema from '../../libs/schemas/Conversation.model';
import MessageSchema from '../../libs/schemas/Message.model';
import YachtSchema from '../../libs/schemas/Yacht.model';
import BrokerSchema from '../../libs/schemas/BrokerProfile.model';
import MemberSchema from '../../libs/schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../redis/redis.module';
import { RateLimitService } from '../../redis/rate-limit.service';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { ChatEventsService } from './chat-events.service';
@Module({
	imports: [
		AuthModule,
		RedisModule,
		MongooseModule.forFeature([
			{ name: 'Conversation', schema: ConversationSchema },
			{ name: 'Message', schema: MessageSchema },
			{ name: 'Yacht', schema: YachtSchema },
			{ name: 'BrokerProfile', schema: BrokerSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
	],
	providers: [ChatService, ChatResolver, ChatEventsService, RateLimitService],
	exports: [ChatService, ChatEventsService],
})
export class ChatModule {}
