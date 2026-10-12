import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ContentStatus } from '../libs/enums/yacht.enum';

export type DestinationDocument = HydratedDocument<Destination>;

@Schema({
	collection: 'destinations',
	timestamps: true,
})
export class Destination {
	_id!: Types.ObjectId;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	name!: string;

	@Prop({
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
	})
	slug!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	region!: string;

	@Prop({
		type: String,
		trim: true,
	})
	country?: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	description!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	heroImage!: string;

	@Prop({
		type: [String],
		default: undefined,
	})
	gallery?: string[];

	@Prop({
		type: String,
		enum: Object.values(ContentStatus),
		required: true,
		default: ContentStatus.HIDDEN,
	})
	status!: ContentStatus;

	createdAt!: Date;
	updatedAt!: Date;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);

DestinationSchema.pre('validate', function (this: any) {
	if (typeof this.name === 'string') {
		this.name = this.name.trim();
	}

	if (typeof this.slug === 'string') {
		this.slug = this.slug.trim().toLowerCase();
	}
});

DestinationSchema.index({ slug: 1 }, { unique: true, name: 'destination_slug_unique' });

export default DestinationSchema;
