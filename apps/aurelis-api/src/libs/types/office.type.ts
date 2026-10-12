import { ContentStatus } from '../enums/yacht.enum';

/** Persistence shape for the `offices` collection in the Aurelis ER model. */
export interface OfficeRecord {
	_id: string;
	name: string;
	slug: string;
	region: string;
	country: string;
	city: string;
	address: string;
	latitude: number;
	longitude: number;
	phone: string;
	email: string;
	timezone: string;
	coverImage: string;
	description?: string;
	status: ContentStatus;
	createdAt: Date;
	updatedAt: Date;
}
