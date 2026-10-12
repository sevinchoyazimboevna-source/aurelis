import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { Season } from '../enums/yacht-destination.enum';

/** ER collection: yachtDestinations. String IDs use UUIDs. */
export const YachtDestinationSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		yachtId: { type: String, required: true, ref: 'Yacht', index: true },
		destinationId: { type: String, required: true, ref: 'Destination', index: true },
		season: { type: String, required: true, enum: Object.values(Season) },
	},
	{ timestamps: true, collection: 'yachtDestinations' },
);
YachtDestinationSchema.index(
	{ yachtId: 1, destinationId: 1, season: 1 },
	{ unique: true },
);

export default YachtDestinationSchema;
