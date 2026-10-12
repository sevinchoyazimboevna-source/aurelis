import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { ClassConstructor, plainToInstance, instanceToPlain } from 'class-transformer';
import { map, Observable } from 'rxjs';

/** Apply to new handlers with a response DTO decorated with @Expose(). */
@Injectable()
export class SerializeInterceptor<T extends object> implements NestInterceptor {
	constructor(private readonly responseType: ClassConstructor<T>) {}
	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((value: unknown) => {
				if (value === null || value === undefined) return value;
				return instanceToPlain(
					plainToInstance(this.responseType, value, { excludeExtraneousValues: true }),
				);
			}),
		);
	}
}
