import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { WishlistModule } from './wishlist.module';
import { WishlistResolver } from './wishlist.resolver';
import { WishlistService } from './wishlist.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';
import { testMember, wishlistFixture } from './wishlist-test-fixture';

describe('Wishlist module DI (offline)', () => {
	it('registers canonical models and shared auth without database/network access', async () => {
		const f = wishlistFixture();
		const fixture = await Test.createTestingModule({ imports: [WishlistModule] })
			.overrideProvider(getModelToken('WishlistItem'))
			.useValue(f.model)
			.overrideProvider(getModelToken('Yacht'))
			.useValue(f.yachtModel)
			.overrideProvider(getModelToken('Member'))
			.useValue({})
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(fixture.get(WishlistService)).toBeInstanceOf(WishlistService);
			expect(fixture.get(AuthGuard)).toBeInstanceOf(AuthGuard);
			expect(await fixture.get(WishlistResolver).getMyWishlist(testMember())).toEqual({
				list: [],
				total: 0,
				page: 1,
				limit: 20,
				totalPages: 0,
			});
		} finally {
			await fixture.close();
		}
	});
});
