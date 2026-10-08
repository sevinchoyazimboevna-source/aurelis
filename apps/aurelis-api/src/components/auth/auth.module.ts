import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../libs/schemas/Member.model';
import { AuthResolver } from './auth.resolver';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GOOGLE_OAUTH_CLIENT, GoogleIdentityService } from './google-identity.service';
import { OAuth2Client } from 'google-auth-library';
import { AuthValidationPipe } from './auth-validation.pipe';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
    JwtModule.registerAsync({
      useFactory: () => {
        return { secret: process.env.JWT_SECRET, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    AuthGuard,
    RolesGuard,
    GoogleIdentityService,
    AuthValidationPipe,
    { provide: GOOGLE_OAUTH_CLIENT, useFactory: () => new OAuth2Client() },
  ],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
