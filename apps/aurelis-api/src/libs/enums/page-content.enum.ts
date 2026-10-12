import { registerEnumType } from '@nestjs/graphql';

export enum PageKey {
	HOME = 'HOME',
	ABOUT = 'ABOUT',
	SELL = 'SELL',
	CREW = 'CREW',
	CONTACT = 'CONTACT',
	CHARTER = 'CHARTER',
	BUY = 'BUY',
}
registerEnumType(PageKey, { name: 'PageKey' });

export enum PageStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
}
registerEnumType(PageStatus, { name: 'PageStatus' });
