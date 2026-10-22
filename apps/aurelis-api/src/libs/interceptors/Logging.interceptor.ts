import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger: Logger = new Logger();

	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const recordTime = Date.now();
		const requestType = context.getType<string>();

		if (requestType === 'graphql') {
			// (1)print request
			const gqlContext = GqlExecutionContext.create(context);
			this.logger.log(` ${this.stringify(gqlContext.getContext().req?.body)}`, 'REQUEST');
		} else if (requestType === 'http') {
			const request = context.switchToHttp().getRequest();
			this.logger.log(`${request.method} ${request.url}`, 'REQUEST');
		}

		// Always return the handler stream. Global interceptors also run for HTTP
		// requests, where returning undefined makes Nest pass it into RxJS.
		return next.handle().pipe(
			tap({
				next: (response) => {
					const responseTime = Date.now() - recordTime;
					this.logger.log(`${this.stringify(response)} - ${responseTime}ms \n\n`, 'RESPONSE');
				},
				error: (error) => {
					const responseTime = Date.now() - recordTime;
					this.logger.error(
						`${this.stringify(error)} - ${responseTime}ms`,
						error instanceof Error ? error.stack : undefined,
						'RESPONSE',
					);
				},
			}),
		);
	}

	private stringify(value: unknown): string {
		try {
			return (JSON.stringify(value) ?? String(value)).slice(0, 75);
		} catch {
			return String(value).slice(0, 75);
		}
	}
}
