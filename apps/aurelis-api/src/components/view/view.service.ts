import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';
import { OrdinaryInquery } from '../../libs/dto/property/property.input';
import { Properties } from '../../libs/dto/property/property';
import { ViewGroup } from '../../libs/enums/view.enum';
import { lookupVisited } from '../../libs/config';

@Injectable()
export class ViewService {
	constructor(
		@InjectModel('View')
		private readonly viewModel: Model<View>,
	) {}

	public async recordView(input: ViewInput): Promise<boolean> {
		// A single atomic upsert replaces a read-then-write pair and also avoids
		// duplicate view records when requests arrive at the same time.
		const result = await this.viewModel
			.updateOne(
				{
					memberId: input.memberId,
					viewRefId: input.viewRefId,
					viewGroup: input.viewGroup,
				},
				{ $setOnInsert: input },
				{ upsert: true },
			)
			.exec();

		return result.upsertedCount === 1;
	}

	public async getVisitedProperties(
		memberId: Types.ObjectId,
		input: OrdinaryInquery,
	): Promise<Properties> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.PROPERTY, memberId: memberId };

		const data: T = await this.viewModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'properties',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedProperty',
					},
				},
				{ $unwind: '$visitedProperty' },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupVisited,
							{ $unwind: '$visitedProperty.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Properties = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.visitedProperty);

		return result;
	}
}
