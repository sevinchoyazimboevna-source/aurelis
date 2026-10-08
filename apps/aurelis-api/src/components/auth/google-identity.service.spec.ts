import { AuthErrorCode } from './auth-errors';
import { GoogleIdentityService } from './google-identity.service';

describe('GoogleIdentityService', () => {
	const originalClientId = process.env.GOOGLE_CLIENT_ID;
	let verifyIdToken: jest.Mock;
	let service: GoogleIdentityService;

	beforeEach(() => {
		process.env.GOOGLE_CLIENT_ID = 'test-client-id';
		verifyIdToken = jest.fn();
		service = new GoogleIdentityService({ verifyIdToken } as any);
	});

	afterAll(() => {
		if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
		else process.env.GOOGLE_CLIENT_ID = originalClientId;
	});

	it('verifies credential audience and requires a verified email and subject', async () => {
		verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'Sailor@example.com', email_verified: true, sub: 'google-subject' }) });
		await expect(service.verifyCredential('credential')).resolves.toEqual({ email: 'sailor@example.com', googleId: 'google-subject' });
		expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'credential', audience: 'test-client-id' });
	});

	it.each([
		new Error('Google verification details'),
		{ getPayload: () => ({ email: 'sailor@example.com', email_verified: false, sub: 'google-subject' }) },
		{ getPayload: () => ({ email: 'sailor@example.com', email_verified: true }) },
	])('maps unverifiable Google identity to AUTH_GOOGLE_INVALID', async (result) => {
		if (result instanceof Error) verifyIdToken.mockRejectedValue(result);
		else verifyIdToken.mockResolvedValue(result);
		await expect(service.verifyCredential('sensitive-token')).rejects.toMatchObject({ authErrorCode: AuthErrorCode.GOOGLE_INVALID, status: 401 });
	});

	it('returns generic configuration error if GOOGLE_CLIENT_ID is missing', async () => {
		delete process.env.GOOGLE_CLIENT_ID;
		await expect(service.verifyCredential('sensitive-token')).rejects.toMatchObject({ authErrorCode: AuthErrorCode.CONFIGURATION_ERROR, status: 500 });
		expect(verifyIdToken).not.toHaveBeenCalled();
	});
});
