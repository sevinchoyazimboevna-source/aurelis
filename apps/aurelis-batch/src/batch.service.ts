import { Injectable } from '@nestjs/common';

@Injectable()
export class BatchService {
	getStatus(): { service: string; status: string; scheduledJobs: number } {
		return { service: 'aurelis-batch', status: 'idle', scheduledJobs: 0 };
	}
}
