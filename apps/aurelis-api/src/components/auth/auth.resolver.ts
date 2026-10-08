import { RateLimit } from '../../redis/rate-limit.guard';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthResponse, GoogleLoginInput, LoginInput, Member, RegisterInput } from './auth.dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import { AuthValidationPipe } from './auth-validation.pipe';
import { CurrentMember } from './decorators/current-member.decorator';

@Resolver()
export class AuthResolver {
	constructor(private readonly authService: AuthService) {}

	@Mutation(() => AuthResponse)
	register(@Args('input', new AuthValidationPipe()) input: RegisterInput): Promise<AuthResponse> {
		return this.authService.register(input);
	}

	@Mutation(() => AuthResponse)
	@RateLimit('login')
	login(@Args('input', new AuthValidationPipe()) input: LoginInput): Promise<AuthResponse> {
		return this.authService.login(input);
	}

	@Mutation(() => AuthResponse)
	@RateLimit('login')
	googleLogin(@Args('input', new AuthValidationPipe()) input: GoogleLoginInput): Promise<AuthResponse> {
		return this.authService.googleLogin(input.credential);
	}

	@UseGuards(AuthGuard)
	@Query(() => Member)
	getMe(@CurrentMember() member: Member): Promise<Member> {
		return this.authService.getMe(member._id);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Boolean)
	logout(): Promise<boolean> {
		return this.authService.logout();
	}
}
