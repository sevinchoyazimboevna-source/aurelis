import { BadRequestException } from '@nestjs/common';

// Explicit slugs allow case/spacing normalization, but never silently discard unsafe URL characters.
export function normalizeDestinationSlug(value: string, fromName = false): string {
	if (typeof value !== 'string') throw new BadRequestException('Invalid destination slug');
	let slug = value
		.trim()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	slug = fromName ? slug.replace(/[^a-z0-9]+/g, '-') : slug.replace(/\s+/g, '-');
	slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
	if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new BadRequestException('Destination slug must contain lowercase letters, numbers and separating hyphens');
	}
	return slug;
}
