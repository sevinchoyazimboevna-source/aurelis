import { registerEnumType } from '@nestjs/graphql';

export enum NewsletterStatus {
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	UNSUBSCRIBED = 'UNSUBSCRIBED',
}
registerEnumType(NewsletterStatus, { name: 'NewsletterStatus' });
