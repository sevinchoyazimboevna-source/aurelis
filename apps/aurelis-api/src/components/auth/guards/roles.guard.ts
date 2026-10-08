import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { MemberRole } from '../../../libs/enums/member.enum';
import { AuthRequest } from '../auth.service';
import { AuthErrorCode, authError } from '../auth-errors';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const roles = this.reflector.getAllAndOverride<MemberRole[]>('roles', [context.getHandler(), context.getClass()]);
		if (!roles?.length) return true;
		const request = GqlExecutionContext.create(context).getContext()?.req as AuthRequest | undefined;
		const member = request?.authMember;
		if (!member) throw authError(AuthErrorCode.UNAUTHENTICATED);
		if (!roles.includes(member.role)) throw authError(AuthErrorCode.FORBIDDEN);
		return true;
	}
}
