import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getModelToken } from '@nestjs/mongoose';
import { SellYachtRequestModule } from './sell-yacht-request.module';
import { SellYachtRequestService } from './sell-yacht-request.service';
import { SellYachtRequestResolver } from './sell-yacht-request.resolver';
import { ComponentsModule } from '../components.module';
import { AuthService } from '../auth/auth.service';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';
import { OptionalInquiryAuthGuard } from '../inquiry/optional-inquiry-auth.guard';

describe('Sell yacht request module DI (offline)', () => {
	it('is registered and resolves shared auth without importing inventory/broker/inquiry models', async () => {
		const module = await Test.createTestingModule({ imports: [SellYachtRequestModule] })
			.overrideProvider(getModelToken('SellYachtRequest'))
			.useValue({})
			.overrideProvider(getModelToken('Member'))
			.useValue({})
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(module.get(SellYachtRequestService)).toBeInstanceOf(SellYachtRequestService);
			expect(module.get(SellYachtRequestResolver)).toBeInstanceOf(SellYachtRequestResolver);
			expect(module.get(OptionalInquiryAuthGuard)).toBeInstanceOf(OptionalInquiryAuthGuard);
			for (const model of ['Yacht', 'BrokerProfile', 'Destination', 'YachtInquiry'])
				expect(() => module.get<unknown>(getModelToken(model))).toThrow();
			const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ComponentsModule) as unknown[];
			expect(imports).toContain(SellYachtRequestModule);
		} finally {
			await module.close();
		}
	});
});
