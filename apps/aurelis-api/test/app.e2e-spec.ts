import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
	let controller: AppController;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [AppService],
		}).compile();

		controller = moduleFixture.get(AppController);
  });

	it('returns the API welcome message', () => {
		expect(controller.getHello()).toBe('Welcome to Aurelis API server');
	});
});
