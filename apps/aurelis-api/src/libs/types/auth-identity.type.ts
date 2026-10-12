import { AuthProvider } from '../enums/account.enum';

/** Persistence shape for the `authIdentities` collection in the Aurelis ER model. */
export interface AuthIdentityRecord {
	_id: string;
	memberId: string;
	provider: AuthProvider;
	providerUserId: string;
	createdAt: Date;
	updatedAt: Date;
}
