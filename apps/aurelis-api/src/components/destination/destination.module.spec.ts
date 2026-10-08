import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { YachtModule } from '../yacht/yacht.module';
import { YachtService } from '../yacht/yacht.service';
import { DestinationService } from './destination.service';
import { DestinationResolver } from './destination.resolver';
import { AuthService } from '../auth/auth.service';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';

describe('Destination and Yacht module wiring (offline)', () => {
	it('exports DestinationService into the existing Yacht module with shared auth', async () => {
		const aggregate = jest.fn().mockResolvedValue([]);
		const fixture = await Test.createTestingModule({ imports: [YachtModule] })
			.overrideProvider(getModelToken('Destination'))
			.useValue({ aggregate })
			.overrideProvider(getModelToken('Yacht'))
			.useValue({})
			.overrideProvider(getModelToken('Office'))
			.useValue({})
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
			expect(fixture.get(YachtService)).toBeInstanceOf(YachtService);
			expect(fixture.get(DestinationService)).toBeInstanceOf(DestinationService);
			expect(await fixture.get(DestinationResolver).getFeaturedDestinations()).toMatchObject({
				total: 0,
				page: 1,
				limit: 20,
			});
			expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: 'PUBLISHED', featured: true });
		} finally {
			await fixture.close();
		}
	});
});
