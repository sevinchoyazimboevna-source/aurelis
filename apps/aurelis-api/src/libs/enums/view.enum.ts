import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	/** Compatibility name for legacy ARTICLE views. */
	JOURNAL = 'ARTICLE',
	ARTICLE = 'ARTICLE',
	/** Compatibility name for legacy PROPERTY views. */
	YACHT = 'PROPERTY',
	PROPERTY = 'PROPERTY',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
