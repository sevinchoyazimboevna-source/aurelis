import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AppLanguage } from '../libs/enums/account.enum';
import { NewsletterStatus } from '../libs/enums/newsletter-subscription.enum';

export type NewsletterSubscriptionDocument = HydratedDocument<NewsletterSubscription>;

@Schema({
	collection: 'newsletterSubscriptions',
	timestamps: true,
})
export class NewsletterSubscription {
	_id!: Types.ObjectId;

	@Prop({
		type: String,
		required: true,
		trim: true,
		lowercase: true,
	})
	email!: string;

	@Prop({
		type: Types.ObjectId,
		ref: 'Member',
	})
	memberId?: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(AppLanguage),
		required: true,
		default: AppLanguage.EN,
	})
	language!: AppLanguage;

	@Prop({
		type: String,
		enum: Object.values(NewsletterStatus),
		required: true,
		default: NewsletterStatus.PENDING,
	})
	status!: NewsletterStatus;

	@Prop({
		type: Date,
		required: true,
	})
	consentAt!: Date;

	@Prop({ type: Date })
	confirmedAt?: Date;

	@Prop({ type: Date })
	unsubscribedAt?: Date;

	createdAt!: Date;
	updatedAt!: Date;
}

export const NewsletterSubscriptionSchema =
	SchemaFactory.createForClass(NewsletterSubscription);

NewsletterSubscriptionSchema.pre('validate', function (this: any) {
	if (typeof this.email === 'string') {
		this.email = this.email.trim().toLowerCase();
	}
});

NewsletterSubscriptionSchema.index(
	{ email: 1 },
	{
		unique: true,
		name: 'newsletter_subscription_email_unique',
	},
);

export default NewsletterSubscriptionSchema;
