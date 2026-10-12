import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ContentStatus } from '../libs/enums/yacht.enum';

export type OfficeDocument = HydratedDocument<Office>;

@Schema({
	collection: 'offices',
	timestamps: true,
})
export class Office {
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
		required: true,
		trim: true,
	})
	country!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	city!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	address!: string;

	@Prop({
		type: Number,
		required: true,
		min: -90,
		max: 90,
	})
	latitude!: number;

	@Prop({
		type: Number,
		required: true,
		min: -180,
		max: 180,
	})
	longitude!: number;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	phone!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
		lowercase: true,
	})
	email!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	timezone!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	coverImage!: string;

	@Prop({
		type: String,
		trim: true,
	})
	description?: string;

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

export const OfficeSchema = SchemaFactory.createForClass(Office);

OfficeSchema.pre('validate', function (this: any) {
	if (typeof this.name === 'string') {
		this.name = this.name.trim();
	}

	if (typeof this.slug === 'string') {
		this.slug = this.slug.trim().toLowerCase();
	}
});

OfficeSchema.index({ slug: 1 }, { unique: true, name: 'office_slug_unique' });

export default OfficeSchema;
