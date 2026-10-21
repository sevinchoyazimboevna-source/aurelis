import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	LIKE = 'LIKE',
	COMMENT = 'COMMENT',
}
registerEnumType(NotificationType, {
	name: 'NotificationType',
});

export enum NotificationStatus {
	WAIT = 'WAIT',
	READ = 'READ',
}
registerEnumType(NotificationStatus, {
	name: 'NotificationStatus',
});

export enum NotificationGroup {
	MEMBER = 'MEMBER',
	/** Compatibility name for legacy ARTICLE notifications. */
	JOURNAL = 'ARTICLE',
	ARTICLE = 'ARTICLE',
	/** Compatibility name for legacy PROPERTY notifications. */
	YACHT = 'PROPERTY',
	PROPERTY = 'PROPERTY',
}
registerEnumType(NotificationGroup, {
	name: 'NotificationGroup',
});
