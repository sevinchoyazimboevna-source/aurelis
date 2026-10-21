import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BatchController } from '../src/batch.controller';
import { BatchService } from '../src/batch.service';

describe('AurelisBatchController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			controllers: [BatchController],
			providers: [
				{
					provide: BatchService,
					useValue: {
						batchRollback: jest.fn(),
						batchTopProperties: jest.fn(),
						batchTopAgents: jest.fn(),
					},
				},
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	it('initializes the batch controller', () => {
		expect(app.get(BatchController)).toBeDefined();
	});
});
