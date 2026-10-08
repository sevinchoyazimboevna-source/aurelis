import { registerEnumType } from '@nestjs/graphql';

export enum SellYachtRequestStatus {
	NEW = 'NEW',
	CONTACTED = 'CONTACTED',
	REVIEWING = 'REVIEWING',
	CLOSED = 'CLOSED',
}
registerEnumType(SellYachtRequestStatus, { name: 'SellYachtRequestStatus' });
