import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@InputType()
export class WishlistCatalogInput {
	@Field(() => Int, { nullable: true, defaultValue: 1 }) @IsOptional() @IsInt() @Min(1) page = 1;
	@Field(() => Int, { nullable: true, defaultValue: 20 }) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 20;
}
