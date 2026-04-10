import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwtExpiresIn', '1d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleTokenVerifierService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    Reflector,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
