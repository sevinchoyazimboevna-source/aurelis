import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	/** Compatibility name for legacy PROPERTY likes. */
	YACHT = 'PROPERTY',
	PROPERTY = 'PROPERTY',
	/** Compatibility name for legacy ARTICLE likes. */
	JOURNAL = 'ARTICLE',
	ARTICLE = 'ARTICLE',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
