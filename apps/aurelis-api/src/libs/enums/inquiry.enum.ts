import { registerEnumType } from '@nestjs/graphql';

export enum InquiryType {
	SALES = 'SALES',
	CHARTER = 'CHARTER',
}
registerEnumType(InquiryType, { name: 'InquiryType' });

export enum InquiryStatus {
	NEW = 'NEW',
	CONTACTED = 'CONTACTED',
	CLOSED = 'CLOSED',
}
registerEnumType(InquiryStatus, { name: 'InquiryStatus' });
