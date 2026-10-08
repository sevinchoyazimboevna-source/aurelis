import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const startedAt = Date.now();
		return next.handle().pipe(
			finalize(() => {
				this.logger.log(`GraphQL request completed in ${Date.now() - startedAt}ms`);
			}),
		);
	}
}
