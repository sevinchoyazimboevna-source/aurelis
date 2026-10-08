import { BadRequestException } from '@nestjs/common';

// Explicit slugs normalize spacing/case but never silently discard unsafe URL characters.
export function normalizeArticleSlug(value: string, fromTitle = false): string {
	if (typeof value !== 'string') throw new BadRequestException('Invalid article slug');
	let slug = value
		.trim()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	slug = fromTitle ? slug.replace(/[^a-z0-9]+/g, '-') : slug.replace(/\s+/g, '-');
	slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
	if (slug.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new BadRequestException('Article slug must contain lowercase letters, numbers and separating hyphens');
	}
	return slug;
}
