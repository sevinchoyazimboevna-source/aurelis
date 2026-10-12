import { YachtType, ContentStatus } from '../enums/yacht.enum';

/** Persistence shape for the `yachts` collection in the Aurelis ER model. */
export interface YachtRecord {
	_id: string;
	name: string;
	slug: string;
	yachtType: YachtType;
	builder?: string;
	model?: string;
	buildYear: number;
	refitYear?: number;
	lengthM: number;
	beamM?: number;
	draftM?: number;
	cruiseSpeedKnots?: number;
	maxSpeedKnots?: number;
	cabins: number;
	guestCapacity: number;
	crewCapacity: number;
	description: string;
	amenities?: string[];
	images: string[];
	videoUrl?: string;
	status: ContentStatus;
	createdAt: Date;
	updatedAt: Date;
}
