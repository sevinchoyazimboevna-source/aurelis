import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

export interface AuthMemberClaims {
	_id: string;
	memberNick: string;
	memberType: MemberType;
	memberStatus: MemberStatus;
}

@Injectable()
export class AuthService {
	constructor(private jwtService: JwtService) {}

	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(payload: AuthMemberClaims): Promise<string> {
		return this.jwtService.signAsync(payload);
	}
	public async verifyToken(token: string): Promise<AuthMemberClaims> {
		const member = await this.jwtService.verifyAsync(token);
		return member;
	}
}
