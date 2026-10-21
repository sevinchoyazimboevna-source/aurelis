import { registerEnumType } from '@nestjs/graphql';
export enum MemberType {
	USER = 'USER',
	/** Compatibility name: persisted legacy value remains AGENT. */
	BROKER = 'AGENT',
	AGENT = 'AGENT',
	ADMIN = 'ADMIN',
}
registerEnumType(MemberType, { name: 'MemberType' });

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCK = 'BLOCK',
	DELETE = 'DELETE',
}
registerEnumType(MemberStatus, { name: 'MemberStatus' });

export enum MemberAuthType {
	PHONE = 'PHONE',
	EMAIL = 'EMAIL',
	TELEGRAM = 'TELEGRAM',
}
registerEnumType(MemberAuthType, { name: 'MemberAuthType' });
