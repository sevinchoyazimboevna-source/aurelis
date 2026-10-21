import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import type { ObjectId } from 'mongoose';
import {
	YachtCurrency,
	YachtListingType,
	YachtPricePeriod,
	YachtStatus,
	YachtType,
} from '../../enums/yacht.enum';

/** Partial update counterpart to YachtInput for the AURELIS migration. */
@InputType({ isAbstract: true })
export class YachtUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id!: ObjectId;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	yachtName?: string;

	@IsOptional()
	@Length(5, 5000)
	@Field(() => String, { nullable: true })
	yachtDescription?: string;

	@IsOptional()
	@Field(() => YachtType, { nullable: true })
	yachtType?: YachtType;

	@IsOptional()
	@Field(() => YachtStatus, { nullable: true })
	yachtStatus?: YachtStatus;

	@IsOptional()
	@Field(() => YachtListingType, { nullable: true })
	yachtListingType?: YachtListingType;

	@IsOptional()
	@Field(() => YachtCurrency, { nullable: true })
	yachtCurrency?: YachtCurrency;

	@IsOptional()
	@Field(() => YachtPricePeriod, { nullable: true })
	yachtPricePeriod?: YachtPricePeriod;

	@IsOptional()
	@Field(() => String, { nullable: true })
	yachtBuilder?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	yachtModel?: string;

	@IsOptional()
	@IsInt()
	@Min(1800)
	@Field(() => Int, { nullable: true })
	yachtYear?: number;

	@IsOptional()
	@IsInt()
	@Min(1800)
	@Field(() => Int, { nullable: true })
	yachtRefitYear?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Float, { nullable: true })
	yachtLength?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Float, { nullable: true })
	yachtBeam?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Float, { nullable: true })
	yachtDraft?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	yachtGuests?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	yachtCabins?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	@Field(() => Int, { nullable: true })
	yachtCrew?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Float, { nullable: true })
	yachtPrice?: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	yachtLocation?: string;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	yachtImages?: string[];

	@IsOptional()
	@Field(() => String, { nullable: true })
	yachtVideo?: string;
}
