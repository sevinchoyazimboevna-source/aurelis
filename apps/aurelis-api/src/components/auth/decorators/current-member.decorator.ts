import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Member } from '../auth.dto';

export const CurrentMember = createParamDecorator((_data: unknown, context: ExecutionContext): Member | undefined => {
	const gqlContext = GqlExecutionContext.create(context);
	return gqlContext.getContext()?.req?.authMember;
});
