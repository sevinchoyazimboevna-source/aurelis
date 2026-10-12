import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { PageKey, PageStatus } from '../enums/page-content.enum';

/** ER collection: pageContents. String IDs use UUIDs. */
export const PageContentSchema = new Schema(
	{
		_id: { type: String, default: randomUUID, required: true },
		pageKey: { type: String, required: true, enum: Object.values(PageKey) },
		locale: { type: String, required: true, default: 'en' },
		title: { type: String, required: true },
		heroImage: { type: String },
		heroVideoUrl: { type: String },
		sections: { type: Schema.Types.Mixed, required: true },
		status: {
			type: String,
			required: true,
			enum: Object.values(PageStatus),
			default: PageStatus.DRAFT,
		},
	},
	{ timestamps: true, collection: 'pageContents' },
);
PageContentSchema.index({ pageKey: 1, locale: 1 }, { unique: true });

export default PageContentSchema;
