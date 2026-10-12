import { Expose } from 'class-transformer';
import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { PageKey, PageStatus } from '../../enums/page-content.enum';
import { JsonValue } from '../../types/json.type';
import { JsonScalar } from '../../types/json.scalar';

@ObjectType('PageContent')
export class PageContent {
	@Expose()
	@Field(() => ID)
	_id!: string;

	@Expose()
	@Field(() => PageKey)
	pageKey!: PageKey;

	@Expose()
	@Field(() => String)
	locale!: string;

	@Expose()
	@Field(() => String)
	title!: string;

	@Expose()
	@Field(() => String, { nullable: true })
	heroImage?: string;

	@Expose()
	@Field(() => String, { nullable: true })
	heroVideoUrl?: string;

	@Expose()
	@Field(() => JsonScalar)
	sections!: JsonValue;

	@Expose()
	@Field(() => PageStatus)
	status!: PageStatus;

	@Expose()
	@Field(() => GraphQLISODateTime)
	createdAt!: Date;

	@Expose()
	@Field(() => GraphQLISODateTime)
	updatedAt!: Date;
}
