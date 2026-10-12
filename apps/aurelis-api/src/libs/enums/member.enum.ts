import { registerEnumType } from '@nestjs/graphql';

export enum MemberType {
	CLIENT = 'CLIENT',
	USER = 'CLIENT',
	AGENT = 'AGENT',
	OWNER = 'OWNER',
	ADMIN = 'ADMIN',
}
registerEnumType(MemberType, { name: 'MemberType' });

export enum MemberStatus {
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	BLOCK = 'BLOCK',
	DELETE = 'DELETE',
}
registerEnumType(MemberStatus, { name: 'LegacyMemberStatus' });

export enum MemberAuthType {
	PHONE = 'PHONE',
	EMAIL = 'EMAIL',
	TELEGRAM = 'TELEGRAM',
}
registerEnumType(MemberAuthType, { name: 'MemberAuthType' });
