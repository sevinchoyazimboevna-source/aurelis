import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({
	collection: 'messages',
	timestamps: true,
})
export class Message {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Conversation',
	})
	conversationId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Member',
	})
	senderId!: Types.ObjectId;

	@Prop({
		type: String,
		required: true,
		trim: true,
		maxlength: 5000,
	})
	body!: string;

	createdAt!: Date;
	updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.pre('validate', function (this: any) {
	if (typeof this.body === 'string') {
		this.body = this.body.trim();
		if (!this.body) {
			this.invalidate('body', 'body is required and cannot be empty.');
		}
	}
});

MessageSchema.index(
	{ conversationId: 1, createdAt: -1, _id: -1 },
	{ name: 'message_conversation_created_at_id_idx' },
);

export default MessageSchema;
