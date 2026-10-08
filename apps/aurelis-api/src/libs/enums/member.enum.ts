import { registerEnumType } from '@nestjs/graphql';

export enum MemberRole {
	ADMIN = 'ADMIN',
	USER = 'USER',
	OWNER = 'OWNER',
	CREW = 'CREW',
}
registerEnumType(MemberRole, { name: 'MemberRole' });

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCKED = 'BLOCKED',
	DELETED = 'DELETED',
}
registerEnumType(MemberStatus, { name: 'MemberStatus' });
