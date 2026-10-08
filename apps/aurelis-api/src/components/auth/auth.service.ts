import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { isValidObjectId, Model } from 'mongoose';
import { MemberRole, MemberStatus } from '../../libs/enums/member.enum';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { AuthErrorCode, authError, logAuthConfigurationIssue } from './auth-errors';
import { GoogleIdentityService } from './google-identity.service';
import { LoginInput, Member, RegisterInput } from './auth.dto';

export interface AuthMemberClaims {
	memberId: string;
	email: string;
	role: MemberRole;
	status: MemberStatus;
}

export interface AuthRequest {
	headers: { authorization?: string };
	authMember?: Member;
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		@InjectModel('Member') private readonly memberModel: Model<MemberRecord>,
		private readonly jwtService: JwtService,
		private readonly googleIdentityService: GoogleIdentityService,
	) {}

	async register(input: RegisterInput): Promise<{ accessToken: string; member: Member }> {
		const email = this.normalizeEmail(input.email);
		if (input.password !== input.confirmPassword) throw authError(AuthErrorCode.PASSWORD_MISMATCH);
		this.assertJwtConfigured();
		const existing = await this.memberModel.exists({ email });
		if (existing) throw authError(AuthErrorCode.EMAIL_ALREADY_EXISTS);

		let member: MemberRecord;
		try {
			member = await this.memberModel.create({
				email,
				password: await this.hashPassword(input.password),
				role: MemberRole.USER,
				status: MemberStatus.ACTIVE,
			});
		} catch (error) {
			if (duplicateKeyField(error) === 'email') throw authError(AuthErrorCode.EMAIL_ALREADY_EXISTS);
			throw error;
		}
		return this.createAuthResponse(member);
	}

	async login(input: LoginInput): Promise<{ accessToken: string; member: Member }> {
		const email = this.normalizeEmail(input.email);
		this.assertJwtConfigured();
		const member = await this.memberModel.findOne({ email }).select('+password').exec();
		if (!member || !member.password || !(await this.comparePasswords(input.password, member.password))) {
			throw authError(AuthErrorCode.INVALID_CREDENTIALS);
		}
		this.assertCanAuthenticate(member.status);
		return this.createAuthResponse(member);
	}

	async googleLogin(credential: string): Promise<{ accessToken: string; member: Member }> {
		const identity = await this.googleIdentityService.verifyCredential(credential);
		this.assertJwtConfigured();
		const member = await this.memberModel.findOne({ email: identity.email }).exec();
		if (member) {
			this.assertCanAuthenticate(member.status);
			if (member.googleId && member.googleId !== identity.googleId) {
				throw authError(AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT);
			}
			if (!member.googleId) {
				member.googleId = identity.googleId;
				await member.save();
			}
			return this.createAuthResponse(member);
		}

		const linkedMember = await this.memberModel.findOne({ googleId: identity.googleId }).exec();
		if (linkedMember) {
			this.assertCanAuthenticate(linkedMember.status);
			if (linkedMember.email !== identity.email) throw authError(AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT);
			return this.createAuthResponse(linkedMember);
		}

		const newMember = await this.memberModel.create({
			email: identity.email,
			googleId: identity.googleId,
			role: MemberRole.USER,
			status: MemberStatus.ACTIVE,
		});
		return this.createAuthResponse(newMember);
	}

	async authenticateRequest(request: AuthRequest): Promise<Member> {
		const header = request.headers?.authorization?.trim();
		if (!header) throw authError(AuthErrorCode.UNAUTHENTICATED);
		const parts = header.split(/\s+/);
		if (parts[0].toLowerCase() !== 'bearer' || !parts[1]) throw authError(AuthErrorCode.UNAUTHENTICATED);
		if (parts.length !== 2) throw authError(AuthErrorCode.INVALID_TOKEN);
		this.assertJwtConfigured();

		let claims: AuthMemberClaims;
		try {
			claims = await this.jwtService.verifyAsync<AuthMemberClaims>(parts[1]);
		} catch {
			throw authError(AuthErrorCode.INVALID_TOKEN);
		}
		if (!claims?.memberId || !isValidObjectId(claims.memberId)) throw authError(AuthErrorCode.INVALID_TOKEN);

		const member = await this.memberModel.findById(claims.memberId).exec();
		if (!member) throw authError(AuthErrorCode.UNAUTHENTICATED);
		this.assertCanAuthenticate(member.status);
		request.authMember = this.toMember(member);
		return request.authMember;
	}

	async getMe(memberId: string): Promise<Member> {
		const member = await this.memberModel.findById(memberId).exec();
		if (!member) throw authError(AuthErrorCode.UNAUTHENTICATED);
		this.assertCanAuthenticate(member.status);
		return this.toMember(member);
	}

	async logout(): Promise<boolean> {
		return true;
	}

	async hashPassword(password: string): Promise<string> {
		return bcrypt.hash(password, await bcrypt.genSalt());
	}

	async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		return bcrypt.compare(password, hashedPassword);
	}

	private normalizeEmail(email: string): string {
		const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
		if (!isEmail(normalizedEmail)) throw authError(AuthErrorCode.INVALID_EMAIL);
		return normalizedEmail;
	}

	private assertCanAuthenticate(status: MemberStatus): void {
		if (status === MemberStatus.BLOCKED) throw authError(AuthErrorCode.ACCOUNT_BLOCKED);
		if (status === MemberStatus.DELETED) throw authError(AuthErrorCode.ACCOUNT_DELETED);
		if (status !== MemberStatus.ACTIVE) throw authError(AuthErrorCode.UNAUTHENTICATED);
	}

	private async createAuthResponse(record: MemberRecord): Promise<{ accessToken: string; member: Member }> {
		this.assertJwtConfigured();
		const member = this.toMember(record);
		const payload: AuthMemberClaims = {
			memberId: member._id,
			email: member.email,
			role: member.role,
			status: member.status,
		};
		try {
			return { accessToken: await this.jwtService.signAsync(payload), member };
		} catch {
			this.logger.error('Authentication token signing failed');
			throw authError(AuthErrorCode.CONFIGURATION_ERROR);
		}
	}

	private assertJwtConfigured(): void {
		if (!process.env.JWT_SECRET) {
			logAuthConfigurationIssue('JWT_SECRET');
			throw authError(AuthErrorCode.CONFIGURATION_ERROR);
		}
	}

	private toMember(record: MemberRecord): Member {
		return {
			_id: record._id.toString(),
			email: record.email,
			googleId: record.googleId ?? null,
			role: record.role,
			status: record.status,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		};
	}
}

function duplicateKeyField(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null || !('code' in error) || (error as { code?: number }).code !== 11000) return undefined;
	const mongoError = error as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };
	return Object.keys(mongoError.keyPattern ?? mongoError.keyValue ?? {})[0];
}
