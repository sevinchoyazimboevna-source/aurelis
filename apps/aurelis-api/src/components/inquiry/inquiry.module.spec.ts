import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InquiryModule } from './inquiry.module';
import { InquiryResolver } from './inquiry.resolver';
import { InquiryService } from './inquiry.service';
import { OptionalInquiryAuthGuard } from './optional-inquiry-auth.guard';
import { AuthService } from '../auth/auth.service';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';

describe('Inquiry module DI (offline)', () => {
	it('keeps the canonical inquiry module and connects optional/shared authentication', async () => {
		let builder = Test.createTestingModule({ imports: [InquiryModule] });
		for (const name of ['YachtInquiry', 'Yacht', 'Member', 'BrokerProfile', 'Office', 'Destination'])
			builder = builder.overrideProvider(getModelToken(name)).useValue({});
		const fixture = await builder
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(fixture.get(InquiryService)).toBeInstanceOf(InquiryService);
			expect(fixture.get(InquiryResolver)).toBeInstanceOf(InquiryResolver);
			expect(fixture.get(OptionalInquiryAuthGuard)).toBeInstanceOf(OptionalInquiryAuthGuard);
		} finally {
			await fixture.close();
		}
	});
});
