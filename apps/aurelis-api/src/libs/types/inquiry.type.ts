import {
	InquiryType,
	InquirySource,
	InquiryStatus,
	PreferredContact,
} from '../enums/inquiry.enum';
import { JsonValue } from './json.type';

/** Persistence shape for the `inquiries` collection in the Aurelis ER model. */
export interface InquiryRecord {
	_id: string;
	memberId?: string;
	type: InquiryType;
	source: InquirySource;
	listingId?: string;
	officeId?: string;
	recipientStaffId?: string;
	assignedStaffId?: string;
	title?: string;
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	preferredContact?: PreferredContact;
	preferredLanguage?: string;
	message: string;
	charterDetails?: JsonValue;
	saleDetails?: JsonValue;
	consentAt: Date;
	privacyPolicyVersion: string;
	status: InquiryStatus;
	createdAt: Date;
	updatedAt: Date;
}
