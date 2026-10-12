import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({
	collection: 'conversations',
	timestamps: true,
})
export class Conversation {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Member',
		immutable: true,
	})
	clientId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Member',
		immutable: true,
	})
	brokerMemberId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'TeamMember',
		immutable: true,
	})
	brokerProfileId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'Yacht',
	})
	yachtId?: Types.ObjectId;

	@Prop({ type: Date })
	lastMessageAt?: Date;

	@Prop({
		type: Types.ObjectId,
		ref: 'Message',
	})
	clientLastReadMessageId?: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'Message',
	})
	brokerLastReadMessageId?: Types.ObjectId;

	createdAt!: Date;
	updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.pre('validate', function (this: any) {
	if (this.clientId && this.brokerMemberId && this.clientId.equals(this.brokerMemberId)) {
		this.invalidate('brokerMemberId', 'clientId and brokerMemberId must differ.');
	}
});

ConversationSchema.index(
	{ clientId: 1, lastMessageAt: -1 },
	{ name: 'conversation_client_last_message_at_idx' },
);

ConversationSchema.index(
	{ brokerMemberId: 1, lastMessageAt: -1 },
	{ name: 'conversation_broker_last_message_at_idx' },
);

export default ConversationSchema;
