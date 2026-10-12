import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ContentStatus, YachtType } from '../libs/enums/yacht.enum';

export type YachtDocument = HydratedDocument<Yacht>;

@Schema({
	_id: false,
})
export class YachtImage {
	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	url!: string;

	@Prop({
		type: String,
		trim: true,
	})
	alt?: string;

	@Prop({
		type: Number,
		required: true,
		min: 0,
	})
	sortOrder!: number;

	@Prop({
		type: Boolean,
		default: false,
	})
	isCover!: boolean;
}

const YachtImageSchema = SchemaFactory.createForClass(YachtImage);

@Schema({
	collection: 'yachts',
	timestamps: true,
})
export class Yacht {
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
		enum: Object.values(YachtType),
		required: true,
	})
	yachtType!: YachtType;

	@Prop({
		type: String,
		trim: true,
	})
	builder?: string;

	@Prop({
		type: String,
		trim: true,
	})
	model?: string;

	@Prop({
		type: Number,
		required: true,
		min: 1800,
		max: 3000,
	})
	buildYear!: number;

	@Prop({
		type: Number,
		min: 1800,
		max: 3000,
	})
	refitYear?: number;

	@Prop({
		type: Number,
		required: true,
		min: 0,
	})
	lengthM!: number;

	@Prop({
		type: Number,
		min: 0,
	})
	beamM?: number;

	@Prop({
		type: Number,
		min: 0,
	})
	draftM?: number;

	@Prop({
		type: Number,
		min: 0,
	})
	cruiseSpeedKnots?: number;

	@Prop({
		type: Number,
		min: 0,
	})
	maxSpeedKnots?: number;

	@Prop({
		type: Number,
		required: true,
		min: 0,
	})
	cabins!: number;

	@Prop({
		type: Number,
		required: true,
		min: 0,
	})
	guestCapacity!: number;

	@Prop({
		type: Number,
		required: true,
		min: 0,
	})
	crewCapacity!: number;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	description!: string;

	@Prop({
		type: [String],
		default: undefined,
	})
	amenities?: string[];

	@Prop({
		type: [YachtImageSchema],
		required: true,
		default: [],
	})
	images!: YachtImage[];

	@Prop({
		type: String,
		trim: true,
	})
	videoUrl?: string;

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

export const YachtSchema = SchemaFactory.createForClass(Yacht);

YachtSchema.pre('validate', function (this: any) {
	if (typeof this.name === 'string') {
		this.name = this.name.trim();
	}

	if (typeof this.slug === 'string') {
		this.slug = this.slug.trim().toLowerCase();
	}

	if (Array.isArray(this.images)) {
		const coverCount = this.images.filter((image: { isCover?: boolean }) =>
			Boolean(image?.isCover),
		).length;

		if (coverCount > 1) {
			this.invalidate('images', 'Only one cover image is allowed per yacht.');
		}
	}
});

YachtSchema.index({ slug: 1 }, { unique: true, name: 'yacht_slug_unique' });

export default YachtSchema;
