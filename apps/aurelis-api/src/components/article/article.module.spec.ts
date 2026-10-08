import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ArticleModule } from './article.module';
import { ArticleResolver } from './article.resolver';
import { ArticleService } from './article.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GOOGLE_OAUTH_CLIENT } from '../auth/google-identity.service';

describe('Article module DI (offline)', () => {
	it('connects canonical Article and reference models with the shared authentication guards', async () => {
		const aggregate = jest.fn<Promise<never[]>, [unknown]>().mockResolvedValue([]);
		const fixture = await Test.createTestingModule({ imports: [ArticleModule] })
			.overrideProvider(getModelToken('Article'))
			.useValue({ aggregate })
			.overrideProvider(getModelToken('Member'))
			.useValue({})
			.overrideProvider(getModelToken('Yacht'))
			.useValue({})
			.overrideProvider(getModelToken('Destination'))
			.useValue({})
			.overrideProvider(AuthService)
			.useValue({ authenticateRequest: jest.fn() })
			.overrideProvider(GOOGLE_OAUTH_CLIENT)
			.useValue({})
			.compile();
		try {
			expect(fixture.get(ArticleService)).toBeInstanceOf(ArticleService);
			expect(fixture.get(ArticleResolver)).toBeInstanceOf(ArticleResolver);
			expect(fixture.get(AuthGuard)).toBeInstanceOf(AuthGuard);
			expect(fixture.get(RolesGuard)).toBeInstanceOf(RolesGuard);
			expect(await fixture.get(ArticleResolver).getFeaturedArticles()).toEqual({
				list: [],
				total: 0,
				page: 1,
				limit: 20,
				totalPages: 0,
			});
			const pipeline = aggregate.mock.calls[0][0] as { $match?: Record<string, unknown> }[];
			expect(pipeline[0].$match).toMatchObject({ status: 'PUBLISHED', featured: true });
			expect(pipeline[0].$match).toHaveProperty('$or');
		} finally {
			await fixture.close();
		}
	});
});
