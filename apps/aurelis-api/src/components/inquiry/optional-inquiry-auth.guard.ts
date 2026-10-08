import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth/auth.service';
import type { AuthRequest } from '../auth/auth.service';
import { AuthErrorCode, authError } from '../auth/auth-errors';

// Guests stay public; supplied credentials must pass the existing active-member
// authentication before a verified CurrentMember can be attached to the lead.
@Injectable()
export class OptionalInquiryAuthGuard implements CanActivate {
	constructor(private readonly authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = GqlExecutionContext.create(context).getContext<{ req?: AuthRequest }>()?.req;
		if (!req) throw authError(AuthErrorCode.UNAUTHENTICATED);
		if (!req.headers.authorization) {
			delete req.authMember;
			return true;
		}
		await this.authService.authenticateRequest(req);
		return true;
	}
}
