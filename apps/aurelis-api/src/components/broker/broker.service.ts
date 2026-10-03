import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { BrokerProfileInput } from '../../libs/dto/broker/broker.input';

@Injectable()
export class BrokerService {
	constructor(@InjectModel('BrokerProfile') private readonly brokerModel: Model<BrokerProfile>) {}

	async listActive(): Promise<BrokerProfile[]> {
		return this.brokerModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
	}

	async getById(id: string): Promise<BrokerProfile> {
		if (!isValidObjectId(id)) throw new BadRequestException('Invalid broker ID');
		const profile = await this.brokerModel.findOne({ _id: id, isActive: true }).lean().exec();
		if (!profile) throw new NotFoundException('Broker profile not found');
		return profile;
	}

	async upsert(input: BrokerProfileInput): Promise<BrokerProfile> {
		const { _id, ...fields } = input;
		const query = _id ? { _id } : { email: fields.email.toLowerCase() };
		return this.brokerModel.findOneAndUpdate(query, { $set: fields }, { new: true, upsert: true, runValidators: true }).exec();
	}
}
