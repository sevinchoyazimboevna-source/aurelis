import { BadRequestException } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { InquiryType } from '../../libs/enums/inquiry.enum';
import { YachtListingMode } from '../../libs/enums/yacht.enum';

describe('InquiryService', () => {
	const create = jest.fn();
	const model = { create };
	const yachtService = { getById: jest.fn() };
	let service: InquiryService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new InquiryService(model as never, yachtService as never);
	});

	it('persists a valid public sales inquiry without requiring authentication', async () => {
		yachtService.getById.mockResolvedValue({ listingModes: [YachtListingMode.SALES] });
		create.mockResolvedValue({ _id: 'inquiry-1' });
		const input = {
			type: InquiryType.SALES,
			yachtId: 'yacht-1',
			name: 'Alex Buyer',
			email: 'alex@example.com',
			message: 'Please send the full particulars for this yacht.',
		};

		await expect(service.create(input)).resolves.toEqual({ _id: 'inquiry-1' });
		expect(create).toHaveBeenCalledWith(input);
	});

	it('rejects an inquiry for a listing that does not support the requested mode', async () => {
		yachtService.getById.mockResolvedValue({ listingModes: [YachtListingMode.SALES] });
		await expect(service.create({ type: InquiryType.CHARTER, yachtId: 'yacht-1' } as any)).rejects.toBeInstanceOf(BadRequestException);
		expect(create).not.toHaveBeenCalled();
	});

	it('requires charter dates and rejects reversed date ranges', async () => {
		yachtService.getById.mockResolvedValue({ listingModes: [YachtListingMode.CHARTER] });
		const base = { type: InquiryType.CHARTER, yachtId: 'yacht-1' };
		await expect(service.create(base as any)).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.create({
			...base,
			startDate: new Date('2027-08-10'),
			endDate: new Date('2027-08-01'),
		} as any)).rejects.toBeInstanceOf(BadRequestException);
	});
});
