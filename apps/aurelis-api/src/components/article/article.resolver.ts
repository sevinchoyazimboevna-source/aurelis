import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Article, Articles } from '../../libs/dto/article/article';
import { ArticleCatalogInput, CreateArticleInput, UpdateArticleInput } from '../../libs/dto/article/article.input';
import { MemberRole } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ArticleService } from './article.service';

@Resolver(() => Article)
export class ArticleResolver {
	constructor(private readonly articleService: ArticleService) {}

	@Query(() => Articles)
	getArticles(@Args('input') input: ArticleCatalogInput): Promise<Articles> {
		return this.articleService.catalog(input);
	}

	@Query(() => Article)
	getArticle(@Args('slug') slug: string): Promise<Article> {
		return this.articleService.getBySlug(slug);
	}

	@Query(() => Articles)
	getFeaturedArticles(@Args('input', { nullable: true }) input?: ArticleCatalogInput): Promise<Articles> {
		return this.articleService.catalog(input ?? new ArticleCatalogInput(), true);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Query(() => Articles)
	getArticlesForAdmin(@Args('input') input: ArticleCatalogInput): Promise<Articles> {
		return this.articleService.getForAdmin(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Article)
	createArticle(@Args('input') input: CreateArticleInput): Promise<Article> {
		return this.articleService.create(input);
	}

	@Roles(MemberRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Article)
	updateArticle(@Args('input') input: UpdateArticleInput): Promise<Article> {
		return this.articleService.update(input);
	}
}
