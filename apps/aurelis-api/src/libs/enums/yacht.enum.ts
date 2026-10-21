import { registerEnumType } from '@nestjs/graphql';

/** Yacht classification used by the AURELIS contract. */
export enum YachtType {
	MOTOR_YACHT = 'MOTOR_YACHT',
	SAILING_YACHT = 'SAILING_YACHT',
	CATAMARAN = 'CATAMARAN',
	SPORT_YACHT = 'SPORT_YACHT',
	EXPLORER_YACHT = 'EXPLORER_YACHT',
	SUPERYACHT = 'SUPERYACHT',
}
registerEnumType(YachtType, { name: 'YachtType' });

/** Publication and lifecycle state for a yacht listing. */
export enum YachtStatus {
	DRAFT = 'DRAFT',
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	CHARTERED = 'CHARTERED',
	UNAVAILABLE = 'UNAVAILABLE',
	DELETE = 'DELETE',
}
registerEnumType(YachtStatus, { name: 'YachtStatus' });

export enum YachtListingType {
	SALE = 'SALE',
	CHARTER = 'CHARTER',
}
registerEnumType(YachtListingType, { name: 'YachtListingType' });

export enum YachtCurrency {
	EUR = 'EUR',
	USD = 'USD',
	GBP = 'GBP',
}
registerEnumType(YachtCurrency, { name: 'YachtCurrency' });

export enum YachtPricePeriod {
	DAY = 'DAY',
	WEEK = 'WEEK',
}
registerEnumType(YachtPricePeriod, { name: 'YachtPricePeriod' });
