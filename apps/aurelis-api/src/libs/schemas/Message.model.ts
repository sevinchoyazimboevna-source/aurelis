import { Schema } from 'mongoose';
const MessageSchema = new Schema(
	{
		conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
		senderId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
		text: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },
		readAt: { type: Date, default: null },
	},
	{ timestamps: true, collection: 'messages' },
);
MessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
MessageSchema.index({ conversationId: 1, readAt: 1, senderId: 1 });
export default MessageSchema;
