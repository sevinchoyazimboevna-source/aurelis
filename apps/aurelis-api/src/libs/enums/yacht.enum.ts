import { registerEnumType } from '@nestjs/graphql';

export enum YachtType {
	MOTOR = 'MOTOR',
	SAILING = 'SAILING',
	CATAMARAN = 'CATAMARAN',
	EXPLORER = 'EXPLORER',
	OTHER = 'OTHER',
}
registerEnumType(YachtType, { name: 'YachtType' });

export enum ContentStatus {
	ACTIVE = 'ACTIVE',
	HIDDEN = 'HIDDEN',
	ARCHIVED = 'ARCHIVED',
}
registerEnumType(ContentStatus, { name: 'ContentStatus' });
