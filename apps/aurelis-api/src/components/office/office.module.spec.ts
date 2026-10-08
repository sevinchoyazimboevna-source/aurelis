import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BrokerModule } from '../broker/broker.module';
import { BrokerService } from '../broker/broker.service';
import { OfficeService } from './office.service';
import { OfficeResolver } from './office.resolver';
import { AuthService } from '../auth/auth.service';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';

describe('Office module DI (offline)', () => {
	it('exports OfficeService to the existing Broker module and uses shared auth', async () => {
		const aggregate = jest.fn().mockResolvedValue([]);
		const fixture = await Test.createTestingModule({ imports: [BrokerModule] })
			.overrideProvider(getModelToken('Office'))
			.useValue({ aggregate })
			.overrideProvider(getModelToken('BrokerProfile'))
			.useValue({})
			.overrideProvider(getModelToken('Member'))
			.useValue({})
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(fixture.get(BrokerService)).toBeInstanceOf(BrokerService);
			expect(fixture.get(OfficeService)).toBeInstanceOf(OfficeService);
			expect(await fixture.get(OfficeResolver).getFeaturedOffices()).toMatchObject({ total: 0, page: 1, limit: 20 });
			expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: 'PUBLISHED', featured: true });
		} finally {
			await fixture.close();
		}
	});
});
