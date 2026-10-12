import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { Season } from '../libs/enums/yacht-destination.enum';

export type YachtDestinationDocument = HydratedDocument<YachtDestination>;

@Schema({
	collection: 'yachtDestinations',
	timestamps: true,
})
export class YachtDestination {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Yacht',
	})
	yachtId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Destination',
	})
	destinationId!: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(Season),
		required: true,
	})
	season!: Season;

	createdAt!: Date;
	updatedAt!: Date;
}

export const YachtDestinationSchema = SchemaFactory.createForClass(YachtDestination);

YachtDestinationSchema.index(
	{ yachtId: 1, destinationId: 1, season: 1 },
	{
		unique: true,
		name: 'yacht_destination_season_unique',
	},
);

YachtDestinationSchema.index(
	{ destinationId: 1 },
	{ name: 'yacht_destination_destination_idx' },
);

export default YachtDestinationSchema;
