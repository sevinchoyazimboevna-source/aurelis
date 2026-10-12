import { registerEnumType } from '@nestjs/graphql';

export enum Department {
	SALES = 'SALES',
	CHARTER = 'CHARTER',
	CREW = 'CREW',
	SUPPORT = 'SUPPORT',
	LEADERSHIP = 'LEADERSHIP',
}
registerEnumType(Department, { name: 'Department' });
