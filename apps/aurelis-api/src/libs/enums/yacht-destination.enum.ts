import { registerEnumType } from '@nestjs/graphql';

export enum Season {
	SUMMER = 'SUMMER',
	WINTER = 'WINTER',
	YEAR_ROUND = 'YEAR_ROUND',
}
registerEnumType(Season, { name: 'Season' });
