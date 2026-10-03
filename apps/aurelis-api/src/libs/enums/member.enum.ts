import { registerEnumType } from '@nestjs/graphql';

export enum MemberType {
	ADMIN = 'ADMIN',
}
registerEnumType(MemberType, { name: 'MemberType' });

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCK = 'BLOCK',
}
registerEnumType(MemberStatus, { name: 'MemberStatus' });
