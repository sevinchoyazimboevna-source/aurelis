import { Schema } from 'mongoose';
import { ConversationStatus } from '../enums/chat.enum';
const ConversationSchema = new Schema(
	{
		yachtId: { type: Schema.Types.ObjectId, ref: 'Yacht', required: true },
		customerId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
		brokerId: { type: Schema.Types.ObjectId, ref: 'BrokerProfile', required: true },
		// Immutable authorization identity; profile relinking never transfers private history.
		brokerMemberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, immutable: true },
		status: {
			type: String,
			enum: Object.values(ConversationStatus),
			default: ConversationStatus.ACTIVE,
			required: true,
		},
		lastMessageAt: { type: Date, required: true },
	},
	{ timestamps: true, collection: 'conversations' },
);
ConversationSchema.index({ customerId: 1, yachtId: 1, brokerId: 1 }, { unique: true });
ConversationSchema.index({ customerId: 1, lastMessageAt: -1, _id: -1 });
ConversationSchema.index({ brokerMemberId: 1, lastMessageAt: -1, _id: -1 });
export default ConversationSchema;
