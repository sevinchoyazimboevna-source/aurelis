import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthRequest, AuthService } from '../auth.service';
import { AuthErrorCode, authError } from '../auth-errors';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (context.getType<string>() !== 'graphql') return true;
		const request = GqlExecutionContext.create(context).getContext()?.req as AuthRequest | undefined;
		if (!request) throw authError(AuthErrorCode.UNAUTHENTICATED);
		await this.authService.authenticateRequest(request);
		return true;
	}
}
