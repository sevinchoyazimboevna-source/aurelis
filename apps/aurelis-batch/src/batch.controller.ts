import { Controller, Get } from '@nestjs/common';
import { BatchService } from './batch.service';

@Controller()
export class BatchController {
	constructor(private readonly batchService: BatchService) {}

	@Get()
	getStatus(): { service: string; status: string; scheduledJobs: number } {
		return this.batchService.getStatus();
	}
}
