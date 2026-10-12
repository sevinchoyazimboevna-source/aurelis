import { registerEnumType } from '@nestjs/graphql';

export enum InquiryType {
	GENERAL = 'GENERAL',
	BUY = 'BUY',
	SELL = 'SELL',
	CHARTER = 'CHARTER',
	CREW = 'CREW',
}
registerEnumType(InquiryType, { name: 'InquiryType' });

export enum InquirySource {
	CONTACT_PAGE = 'CONTACT_PAGE',
	BROKER_PANEL = 'BROKER_PANEL',
	OFFICE_PANEL = 'OFFICE_PANEL',
	YACHT_PAGE = 'YACHT_PAGE',
	CREW_PAGE = 'CREW_PAGE',
	SELL_PAGE = 'SELL_PAGE',
}
registerEnumType(InquirySource, { name: 'InquirySource' });

export enum InquiryStatus {
	NEW = 'NEW',
	IN_PROGRESS = 'IN_PROGRESS',
	RESOLVED = 'RESOLVED',
	CLOSED = 'CLOSED',
}
registerEnumType(InquiryStatus, { name: 'InquiryStatus' });

export enum PreferredContact {
	ANY = 'ANY',
	EMAIL = 'EMAIL',
	PHONE = 'PHONE',
}
registerEnumType(PreferredContact, { name: 'PreferredContact' });
