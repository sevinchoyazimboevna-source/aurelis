import { ContentStatus } from '../enums/yacht.enum';
import { Department } from '../enums/team-member.enum';

/** Persistence shape for the `teamMembers` collection in the Aurelis ER model. */
export interface TeamMemberRecord {
	_id: string;
	officeId: string;
	memberId?: string;
	slug: string;
	firstName: string;
	lastName: string;
	jobTitle: string;
	department: Department;
	photo: string;
	bio: string;
	languages: string[];
	phone?: string;
	email?: string;
	sortOrder: number;
	status: ContentStatus;
	createdAt: Date;
	updatedAt: Date;
}
