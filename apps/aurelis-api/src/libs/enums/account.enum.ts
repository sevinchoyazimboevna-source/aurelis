import { registerEnumType } from '@nestjs/graphql';

export enum AppLanguage {
	EN = 'en',
	UZ = 'uz',
	RU = 'ru',
	KO = 'ko',
	IT = 'it',
	ES = 'es',
	AR_MA = 'ar-MA',
	AR = 'ar',
}
registerEnumType(AppLanguage, { name: 'AppLanguage' });

export enum MemberRole {
	USER = 'USER',
	BROKER = 'BROKER',
	ADMIN = 'ADMIN',
}
registerEnumType(MemberRole, { name: 'MemberRole' });

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCKED = 'BLOCKED',
	DELETED = 'DELETED',
}
registerEnumType(MemberStatus, { name: 'MemberStatus' });

export enum AuthProvider {
	GOOGLE = 'GOOGLE',
}
registerEnumType(AuthProvider, { name: 'AuthProvider' });
