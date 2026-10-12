import { MemberRole, MemberStatus } from '../enums/account.enum';
export interface JwtPayload {
	sub: string;
	role: MemberRole;
	status: MemberStatus;
	iat?: number;
	exp?: number;
}
export interface AuthenticatedMember {
	_id: string;
	role: MemberRole;
	status: MemberStatus;
}
export interface AuthTokens {
	accessToken: string;
	expiresIn: number;
}
