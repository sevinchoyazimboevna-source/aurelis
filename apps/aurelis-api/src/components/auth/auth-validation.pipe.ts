import { BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';
import { AuthErrorCode, authError } from './auth-errors';

@Injectable()
export class AuthValidationPipe extends ValidationPipe {
	constructor() {
		super({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
			validationError: { target: false, value: false },
		exceptionFactory: (errors) => {
				if (errors.some((error) => error.property === 'email' && error.constraints?.isEmail)) {
					return authError(AuthErrorCode.INVALID_EMAIL);
				}
				return new BadRequestException(errors.map((error) => Object.values(error.constraints ?? {})).flat());
			},
		});
	}
}
