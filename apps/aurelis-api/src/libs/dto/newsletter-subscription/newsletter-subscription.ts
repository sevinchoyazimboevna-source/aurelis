import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { NewsletterStatus } from '../../enums/newsletter-subscription.enum';

@ObjectType('NewsletterSubscription')
export class NewsletterSubscription {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => String)
	email!: string;

	@Expose()
	@Field(() => ID, { nullable: true })
	memberId?: string;

	@Expose()
	@Field(() => String)
	language!: string;

	@Expose()
	@Field(() => NewsletterStatus)
	status!: NewsletterStatus;

	@Expose()
	@Field(() => GraphQLISODateTime)
	consentAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	confirmedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime, { nullable: true })
	unsubscribedAt?: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
