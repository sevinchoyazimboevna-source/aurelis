import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
@Module({
	imports: [
		HttpModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.getOrThrow<string>('SECRET_TOKEN'),
				signOptions: {
					expiresIn: config.getOrThrow<string>(
						'JWT_EXPIRES_IN',
					) as JwtSignOptions['expiresIn'],
				},
			}),
		}),
	],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
