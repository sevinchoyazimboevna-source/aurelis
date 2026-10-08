import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CrewModule } from './crew.module';
import { CrewResolver } from './crew.resolver';
import { CrewService } from './crew.service';
import { CrewCatalogInput } from '../../libs/dto/crew/crew.input';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';

describe('CrewModule dependency wiring (no database connection)', () => {
	it('registers the canonical models, resolver, service and shared auth guards', async () => {
		const aggregate = jest.fn().mockResolvedValue([{ list: [], meta: [] }]);
		const fixture = await Test.createTestingModule({ imports: [CrewModule] })
			.overrideProvider(getModelToken('CrewProfile'))
			.useValue({ aggregate })
			.overrideProvider(getModelToken('Member'))
			.useValue({ exists: jest.fn() })
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(fixture.get(CrewService)).toBeInstanceOf(CrewService);
			expect(fixture.get(AuthGuard)).toBeInstanceOf(AuthGuard);
			expect(fixture.get(RolesGuard)).toBeInstanceOf(RolesGuard);
			expect(await fixture.get(CrewResolver).getCrews(new CrewCatalogInput())).toEqual({
				list: [],
				total: 0,
				page: 1,
				limit: 20,
				totalPages: 0,
			});
			expect(aggregate).toHaveBeenCalled();
		} finally {
			await fixture.close();
		}
	});
});
