import { BrokerService } from './broker.service';
import { OfficeService } from '../office/office.service';

describe('Broker Office association (offline)', () => {
	const id = '000000000000000000000001';
	let broker: BrokerService;
	let model: any;
	let officeModel: any;
	beforeEach(() => {
		model = {
			findOneAndUpdate: jest.fn((_query, update) => ({ exec: async () => update.$set })),
			find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => [] }) }) })),
		};
		officeModel = { exists: jest.fn().mockResolvedValue({ _id: id }) };
		broker = new BrokerService(model, new OfficeService(officeModel), officeModel);
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
		await expect(broker.upsert({ name: 'Broker', email: 'broker@example.com', officeId } as any)).rejects.toThrow(
			'Invalid office ID',
		);
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
		await broker.listActive();
		expect(model.find).toHaveBeenCalledWith({ isActive: true });
		expect(officeModel.exists).not.toHaveBeenCalled();
	});
});
