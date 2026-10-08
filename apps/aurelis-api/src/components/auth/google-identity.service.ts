import { Inject, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AuthErrorCode, authError, logAuthConfigurationIssue } from './auth-errors';

export interface VerifiedGoogleIdentity {
	email: string;
	googleId: string;
}

export const GOOGLE_OAUTH_CLIENT = 'GOOGLE_OAUTH_CLIENT';

@Injectable()
export class GoogleIdentityService {
	constructor(@Inject(GOOGLE_OAUTH_CLIENT) private readonly client: OAuth2Client) {}

	async verifyCredential(credential: string): Promise<VerifiedGoogleIdentity> {
		const audience = process.env.GOOGLE_CLIENT_ID;
		if (!audience) {
			logAuthConfigurationIssue('GOOGLE_CLIENT_ID');
			throw authError(AuthErrorCode.CONFIGURATION_ERROR);
		}
		try {
			const ticket = await this.client.verifyIdToken({ idToken: credential, audience });
			const payload = ticket.getPayload();
			if (!payload?.email || payload.email_verified !== true || !payload.sub) {
				throw new Error('Verified email, subject, or verified-email claim missing');
			}
			return { email: payload.email.toLowerCase(), googleId: payload.sub };
		} catch {
			throw authError(AuthErrorCode.GOOGLE_INVALID);
		}
	}
}
