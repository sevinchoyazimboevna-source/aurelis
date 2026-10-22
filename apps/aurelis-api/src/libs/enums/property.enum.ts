import { registerEnumType } from '@nestjs/graphql';

export enum PropertyType {
	MOTOR_YACHT = 'MOTOR_YACHT',
	SAILING_YACHT = 'SAILING_YACHT',
	CATAMARAN = 'CATAMARAN',
	SUPERYACHT = 'SUPERYACHT',
	// Retained so historic real-estate records remain valid.
	APARTMENT = 'APARTMENT',
	VILLA = 'VILLA',
	HOUSE = 'HOUSE',
}
registerEnumType(PropertyType, {
	name: 'PropertyType',
});

export enum PropertyStatus {
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(PropertyStatus, {
	name: 'PropertyStatus',
});

export enum PropertyLocation {
	MONACO = 'MONACO',
	FRENCH_RIVIERA = 'FRENCH_RIVIERA',
	GREECE = 'GREECE',
	CROATIA = 'CROATIA',
	BAHAMAS = 'BAHAMAS',
	DUBAI = 'DUBAI',
	// Keep legacy destinations valid for persisted records and existing clients.
	SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	DAEJON = 'DAEJON',
	JEJU = 'JEJU',
}
registerEnumType(PropertyLocation, {
	name: 'PropertyLocation',
});
