import { Field, InputType, Int, ID } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsString, Max, Min, Length, ValidateIf } from 'class-validator';
@InputType()
export class ChatPageInput {
	@Field(() => Int, { nullable: true, defaultValue: 1 }) @ValidateIf((_o, v) => v !== undefined) @IsInt() @Min(1) page =
		1;
	@Field(() => Int, { nullable: true, defaultValue: 20 })
	@ValidateIf((_o, v) => v !== undefined)
	@IsInt()
	@Min(1)
	@Max(50)
	limit = 20;
}
@InputType()
export class SendMessageInput {
	@Field(() => ID) @IsMongoId() conversationId: string;
	@Field()
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	@IsString()
	@Length(1, 4000)
	text: string;
}
