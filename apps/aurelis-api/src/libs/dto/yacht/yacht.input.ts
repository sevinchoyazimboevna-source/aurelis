import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { Direction } from '../../enums/comment.enum';
import {
	YachtCurrency,
	YachtListingType,
	YachtPricePeriod,
	YachtStatus,
	YachtType,
} from '../../enums/yacht.enum';

/** AURELIS create-listing contract; not yet attached to the legacy resolver. */
@InputType({ isAbstract: true })
export class YachtInput {
	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	yachtName!: string;

	@IsNotEmpty()
	@Length(5, 5000)
	@Field(() => String)
	yachtDescription!: string;

	@IsNotEmpty()
	@Field(() => YachtType)
	yachtType!: YachtType;

	@IsNotEmpty()
	@Length(2, 100)
	@Field(() => String)
	yachtBuilder!: string;

	@IsNotEmpty()
	@Length(1, 100)
	@Field(() => String)
	yachtModel!: string;

	@IsInt()
	@Min(1800)
	@Field(() => Int)
	yachtYear!: number;

	@IsOptional()
	@IsInt()
	@Min(1800)
	@Field(() => Int, { nullable: true })
	yachtRefitYear?: number;

	@Min(0)
	@Field(() => Float)
	yachtLength!: number;

	@Min(0)
	@Field(() => Float)
	yachtBeam!: number;

	@Min(0)
	@Field(() => Float)
	yachtDraft!: number;

	@IsInt()
	@Min(1)
	@Field(() => Int)
	yachtGuests!: number;

	@IsInt()
	@Min(1)
	@Field(() => Int)
	yachtCabins!: number;

	@IsInt()
	@Min(0)
	@Field(() => Int)
	yachtCrew!: number;

	@Min(0)
	@Field(() => Float)
	yachtPrice!: number;

	@IsNotEmpty()
	@Field(() => YachtCurrency)
	yachtCurrency!: YachtCurrency;

	@IsOptional()
	@Field(() => YachtPricePeriod, { nullable: true })
	yachtPricePeriod?: YachtPricePeriod;

	@IsNotEmpty()
	@Field(() => String)
	yachtLocation!: string;

	@IsNotEmpty()
	@Field(() => [String])
	yachtImages!: string[];

	@IsOptional()
	@Field(() => String, { nullable: true })
	yachtVideo?: string;

	@IsNotEmpty()
	@Field(() => YachtListingType)
	yachtListingType!: YachtListingType;

	memberId?: ObjectId;
}

@InputType({ isAbstract: true })
export class YachtPricesRange {
	@Field(() => Float)
	start!: number;

	@Field(() => Float)
	end!: number;
}

@InputType({ isAbstract: true })
export class YachtLengthsRange {
	@Field(() => Float)
	start!: number;

	@Field(() => Float)
	end!: number;
}

@InputType({ isAbstract: true })
export class YachtPeriodsRange {
	@Field(() => Date)
	start!: Date;

	@Field(() => Date)
	end!: Date;
}

@InputType({ isAbstract: true })
export class YachtSearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	memberId?: ObjectId;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	yachtLocationList?: string[];

	@IsOptional()
	@Field(() => [YachtType], { nullable: true })
	yachtTypeList?: YachtType[];

	@IsOptional()
	@Field(() => [YachtListingType], { nullable: true })
	yachtListingTypeList?: YachtListingType[];

	@IsOptional()
	@Field(() => [Int], { nullable: true })
	yachtGuestsList?: number[];

	@IsOptional()
	@Field(() => [Int], { nullable: true })
	yachtCabinsList?: number[];

	@IsOptional()
	@Field(() => YachtPricesRange, { nullable: true })
	yachtPricesRange?: YachtPricesRange;

	@IsOptional()
	@Field(() => YachtLengthsRange, { nullable: true })
	yachtLengthsRange?: YachtLengthsRange;

	@IsOptional()
	@Field(() => YachtPeriodsRange, { nullable: true })
	periodsRange?: YachtPeriodsRange;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

/** Retains the API's page, limit, sort, and direction conventions. */
@InputType({ isAbstract: true })
export class YachtsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => YachtSearch)
	search!: YachtSearch;
}

@InputType({ isAbstract: true })
export class BrokerYachtsSearch {
	@IsOptional()
	@Field(() => YachtStatus, { nullable: true })
	yachtStatus?: YachtStatus;
}

@InputType({ isAbstract: true })
export class BrokerYachtsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => BrokerYachtsSearch)
	search!: BrokerYachtsSearch;
}
