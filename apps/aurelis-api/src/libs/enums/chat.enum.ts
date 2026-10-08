import { registerEnumType } from '@nestjs/graphql';
export enum ConversationStatus {
	ACTIVE = 'ACTIVE',
	CLOSED = 'CLOSED',
}
registerEnumType(ConversationStatus, { name: 'ConversationStatus' });
