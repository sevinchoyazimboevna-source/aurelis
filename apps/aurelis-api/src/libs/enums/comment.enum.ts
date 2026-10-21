import { registerEnumType } from '@nestjs/graphql';

export enum CommentStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(CommentStatus, {
	name: 'CommentStatus',
});

export enum CommentGroup {
	MEMBER = 'MEMBER',
	/** Compatibility name for legacy ARTICLE comments. */
	JOURNAL = 'ARTICLE',
	ARTICLE = 'ARTICLE',
	/** Compatibility name for legacy PROPERTY comments. */
	YACHT = 'PROPERTY',
	PROPERTY = 'PROPERTY',
}
registerEnumType(CommentGroup, {
	name: 'CommentGroup',
});

export enum Direction {
	ASC = 1,
	DESC = -1,
}
registerEnumType(Direction, {
	name: 'Direction',
});
