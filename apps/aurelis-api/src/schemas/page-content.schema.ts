import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AppLanguage } from '../libs/enums/account.enum';
import { PageKey, PageStatus } from '../libs/enums/page-content.enum';

export type PageContentDocument = HydratedDocument<PageContent>;

export enum PageSectionType {
	TEXT = 'TEXT',
	IMAGE_TEXT = 'IMAGE_TEXT',
	STATS = 'STATS',
	SERVICES = 'SERVICES',
	TESTIMONIALS = 'TESTIMONIALS',
	CTA = 'CTA',
}

@Schema({
	_id: false,
})
export class PageSectionLink {
	@Prop({ type: String, trim: true })
	label?: string;

	@Prop({ type: String, trim: true })
	url?: string;
}

const PageSectionLinkSchema = SchemaFactory.createForClass(PageSectionLink);

@Schema({
	_id: false,
})
export class PageSectionItem {
	@Prop({ type: String, trim: true })
	label?: string;

	@Prop({ type: String, trim: true })
	value?: string;

	@Prop({ type: String, trim: true })
	description?: string;
}

const PageSectionItemSchema = SchemaFactory.createForClass(PageSectionItem);

@Schema({
	_id: false,
})
export class PageSection {
	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	sectionId!: string;

	@Prop({
		type: String,
		enum: Object.values(PageSectionType),
		required: true,
	})
	type!: PageSectionType;

	@Prop({
		type: String,
		trim: true,
	})
	heading?: string;

	@Prop({
		type: String,
		trim: true,
	})
	body?: string;

	@Prop({
		type: [String],
		default: undefined,
	})
	images?: string[];

	@Prop({
		type: [PageSectionItemSchema],
		default: undefined,
	})
	items?: PageSectionItem[];

	@Prop({
		type: [PageSectionLinkSchema],
		default: undefined,
	})
	links?: PageSectionLink[];

	@Prop({
		type: Number,
		min: 0,
	})
	sortOrder?: number;
}

const PageSectionSchema = SchemaFactory.createForClass(PageSection);

@Schema({
	collection: 'pageContents',
	timestamps: true,
})
export class PageContent {
	_id!: Types.ObjectId;

	@Prop({
		type: String,
		enum: Object.values(PageKey),
		required: true,
	})
	pageKey!: PageKey;

	@Prop({
		type: String,
		enum: Object.values(AppLanguage),
		required: true,
		default: AppLanguage.EN,
	})
	locale!: AppLanguage;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	title!: string;

	@Prop({
		type: String,
		trim: true,
	})
	heroImage?: string;

	@Prop({
		type: String,
		trim: true,
	})
	heroVideoUrl?: string;

	@Prop({
		type: [PageSectionSchema],
		required: true,
		default: [],
	})
	sections!: PageSection[];

	@Prop({
		type: String,
		enum: Object.values(PageStatus),
		required: true,
		default: PageStatus.DRAFT,
	})
	status!: PageStatus;

	createdAt!: Date;
	updatedAt!: Date;
}

export const PageContentSchema = SchemaFactory.createForClass(PageContent);

PageContentSchema.pre('validate', function (this: any) {
	if (typeof this.title === 'string') {
		this.title = this.title.trim();
	}

	if (Array.isArray(this.sections)) {
		const seen = new Set<string>();
		for (const section of this.sections) {
			if (!section || !section.sectionId) continue;
			if (seen.has(section.sectionId)) {
				this.invalidate('sections', 'Each sectionId must be unique within a page.');
				break;
			}
			seen.add(section.sectionId);
		}
	}
});

PageContentSchema.index(
	{ pageKey: 1, locale: 1 },
	{
		unique: true,
		name: 'page_content_page_key_locale_unique',
	},
);

export default PageContentSchema;
