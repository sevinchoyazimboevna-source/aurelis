import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { GraphQLResolveInfo } from 'graphql';

/** Logs operation metadata and duration without credentials or personal payloads. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const startedAt = Date.now();
		let operation = context.getHandler().name;
		const transport = context.getType<GqlContextType>();
		if (transport === 'graphql') {
			const info = GqlExecutionContext.create(context).getInfo<GraphQLResolveInfo>();
			operation = `${info.parentType.name}.${info.fieldName}`;
		} else if (transport === 'http') {
			const request = context.switchToHttp().getRequest<Request>();
			operation = `${request.method} ${request.path}`;
		}
		return next.handle().pipe(
			tap({
				next: () =>
					this.logger.log(`${transport} ${operation} ${Date.now() - startedAt}ms`),
				error: () =>
					this.logger.warn(
						`${transport} ${operation} failed ${Date.now() - startedAt}ms`,
					),
			}),
		);
	}
}
