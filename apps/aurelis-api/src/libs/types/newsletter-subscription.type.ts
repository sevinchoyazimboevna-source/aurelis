import { NewsletterStatus } from '../enums/newsletter-subscription.enum';

/** Persistence shape for the `newsletterSubscriptions` collection in the Aurelis ER model. */
export interface NewsletterSubscriptionRecord {
	_id: string;
	email: string;
	memberId?: string;
	language: string;
	status: NewsletterStatus;
	consentAt: Date;
	confirmedAt?: Date;
	unsubscribedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
