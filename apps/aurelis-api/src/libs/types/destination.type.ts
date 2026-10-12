import { ContentStatus } from '../enums/yacht.enum';

/** Persistence shape for the `destinations` collection in the Aurelis ER model. */
export interface DestinationRecord {
	_id: string;
	name: string;
	slug: string;
	region: string;
	country: string;
	description: string;
	heroImage: string;
	gallery?: string[];
	status: ContentStatus;
	createdAt: Date;
	updatedAt: Date;
}
