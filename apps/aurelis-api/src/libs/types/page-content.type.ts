import { PageKey, PageStatus } from '../enums/page-content.enum';
import { JsonValue } from './json.type';

/** Persistence shape for the `pageContents` collection in the Aurelis ER model. */
export interface PageContentRecord {
	_id: string;
	pageKey: PageKey;
	locale: string;
	title: string;
	heroImage?: string;
	heroVideoUrl?: string;
	sections: JsonValue;
	status: PageStatus;
	createdAt: Date;
	updatedAt: Date;
}
