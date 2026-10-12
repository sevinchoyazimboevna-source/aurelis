import { Season } from '../enums/yacht-destination.enum';

/** Persistence shape for the `yachtDestinations` collection in the Aurelis ER model. */
export interface YachtDestinationRecord {
	_id: string;
	yachtId: string;
	destinationId: string;
	season: Season;
	createdAt: Date;
	updatedAt: Date;
}
