import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '../../../libs/enums/member.enum';

export const Roles = (...roles: MemberRole[]) => SetMetadata('roles', roles);
