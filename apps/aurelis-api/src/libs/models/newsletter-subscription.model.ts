import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { NewsletterStatus } from '../enums/newsletter-subscription.enum';

/** ER collection: newsletterSubscriptions. String IDs use UUIDs. */
export const NewsletterSubscriptionSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		email: { type: String, required: true },
		memberId: { type: String, ref: 'MemberRecord', index: true },
		language: { type: String, required: true, default: 'en' },
		status: {
			type: String,
			required: true,
			enum: Object.values(NewsletterStatus),
			default: NewsletterStatus.PENDING,
		},
		consentAt: { type: Date, required: true },
		confirmedAt: { type: Date },
		unsubscribedAt: { type: Date },
	},
	{ timestamps: true, collection: 'newsletterSubscriptions' },
);
NewsletterSubscriptionSchema.index({ email: 1 }, { unique: true });

export default NewsletterSubscriptionSchema;
