import { AppLanguage, MemberRole, MemberStatus } from '../enums/account.enum';

/** Persistence shape for the `members` collection in the Aurelis ER model. */
export interface MemberPersistence {
	_id: string;
	name: string;
	nameKey: string;
	fullName?: string;
	phone?: string;
	email?: string;
	passwordHash?: string;
	avatarUrl?: string;
	role: MemberRole;
	status: MemberStatus;
	preferredLanguage: AppLanguage;
	phoneVerifiedAt?: Date;
	emailVerifiedAt?: Date;
	lastLoginAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
