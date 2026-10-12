import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ContentStatus } from '../libs/enums/yacht.enum';
import { Department } from '../libs/enums/team-member.enum';

export type TeamMemberDocument = HydratedDocument<TeamMember>;

@Schema({
	collection: 'teamMembers',
	timestamps: true,
})
export class TeamMember {
	_id!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		required: true,
		ref: 'Office',
	})
	officeId!: Types.ObjectId;

	@Prop({
		type: Types.ObjectId,
		ref: 'Member',
	})
	memberId?: Types.ObjectId;

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
	firstName!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	lastName!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	jobTitle!: string;

	@Prop({
		type: String,
		enum: Object.values(Department),
		required: true,
	})
	department!: Department;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	photo!: string;

	@Prop({
		type: String,
		required: true,
		trim: true,
	})
	bio!: string;

	@Prop({
		type: [String],
		required: true,
		default: [],
	})
	languages!: string[];

	@Prop({
		type: String,
		trim: true,
	})
	phone?: string;

	@Prop({
		type: String,
		trim: true,
		lowercase: true,
	})
	email?: string;

	@Prop({
		type: Number,
		required: true,
		default: 0,
		min: 0,
	})
	sortOrder!: number;

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

export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);

TeamMemberSchema.pre('validate', function (this: any) {
	if (typeof this.slug === 'string') {
		this.slug = this.slug.trim().toLowerCase();
	}

	if (typeof this.firstName === 'string') {
		this.firstName = this.firstName.trim();
	}

	if (typeof this.lastName === 'string') {
		this.lastName = this.lastName.trim();
	}
});

TeamMemberSchema.index({ slug: 1 }, { unique: true, name: 'team_member_slug_unique' });

TeamMemberSchema.index(
	{ memberId: 1 },
	{
		unique: true,
		partialFilterExpression: { memberId: { $type: 'objectId' } },
		name: 'team_member_memberid_unique',
	},
);

TeamMemberSchema.index(
	{ officeId: 1, department: 1, status: 1 },
	{ name: 'team_member_office_department_status_idx' },
);

export default TeamMemberSchema;
