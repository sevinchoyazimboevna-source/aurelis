import { Model } from 'mongoose';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { BrokerProfileInput } from '../../libs/dto/broker/broker.input';
import { Office } from '../../libs/dto/office/office';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { BrokerService } from './broker.service';
import { OfficeService } from '../office/office.service';

describe('Broker Office association (offline)', () => {
	const id = '000000000000000000000001';
	let broker: BrokerService;
	let model: {
		findOneAndUpdate: jest.Mock<unknown, [unknown, { $set: Record<string, unknown> }]>;
		find: jest.Mock;
		countDocuments: jest.Mock;
	};
	let officeModel: { exists: jest.Mock };
	beforeEach(() => {
		model = {
			findOneAndUpdate: jest.fn((_query: unknown, update: { $set: Record<string, unknown> }) => ({
				exec: () => Promise.resolve(update.$set),
			})),
			find: jest.fn(() => ({
				sort: () => ({ skip: () => ({ limit: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }) }) }),
			})),
			countDocuments: jest.fn(() => ({ exec: () => Promise.resolve(0) })),
		};
		officeModel = { exists: jest.fn().mockResolvedValue({ _id: id }) };
		broker = new BrokerService(
			model as unknown as Model<BrokerProfile>,
			new OfficeService(officeModel as unknown as Model<Office>),
			officeModel as unknown as Model<MemberRecord>,
		);
	});
	it('preserves existing unlinked brokers and omitted Office links', async () => {
		await broker.upsert({ name: 'Broker', email: 'broker@example.com', officeId: undefined });
		expect(officeModel.exists).not.toHaveBeenCalled();
		expect(model.findOneAndUpdate.mock.calls[0][1].$set).not.toHaveProperty('officeId');
	});
	it('validates and stores a supplied reference without status restrictions', async () => {
		expect(await broker.upsert({ name: 'Broker', email: 'broker@example.com', officeId: id })).toHaveProperty(
			'officeId',
			id,
		);
		expect(officeModel.exists).toHaveBeenCalledWith({ _id: id });
	});
	it.each(['bad', null])('rejects malformed/null Office links %j', async (officeId) => {
		await expect(
			broker.upsert({ name: 'Broker', email: 'broker@example.com', officeId } as unknown as BrokerProfileInput),
		).rejects.toThrow('Invalid office ID');
		expect(model.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it('rejects nonexistent Office references before writing', async () => {
		officeModel.exists.mockResolvedValue(null);
		await expect(broker.upsert({ name: 'Broker', email: 'broker@example.com', officeId: id })).rejects.toThrow(
			'Office not found',
		);
		expect(model.findOneAndUpdate).not.toHaveBeenCalled();
	});
	it('retains the existing active broker query independently of Office status', async () => {
		await broker.catalog();
		expect(model.find).toHaveBeenCalledWith({ isActive: true });
		expect(officeModel.exists).not.toHaveBeenCalled();
	});
});
