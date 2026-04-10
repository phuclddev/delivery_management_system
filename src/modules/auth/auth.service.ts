import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type AuthUserProfile = Prisma.UserGetPayload<{
  include: {
    team: true;
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleTokenVerifierService: GoogleTokenVerifierService,
  ) {}

  async googleLogin(payload: GoogleLoginDto) {
    const googleIdentity = await this.googleTokenVerifierService.verifyIdToken(payload.idToken);
    this.ensureAllowedDomain(googleIdentity.email);

    const user = await this.prisma.user.upsert({
      where: {
        email: googleIdentity.email,
      },
      update: {
        googleId: googleIdentity.googleId,
        displayName: googleIdentity.displayName,
        avatarUrl: googleIdentity.avatarUrl,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      create: {
        email: googleIdentity.email,
        googleId: googleIdentity.googleId,
        displayName: googleIdentity.displayName,
        avatarUrl: googleIdentity.avatarUrl,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      include: {
        team: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is inactive.');
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: await this.jwtService.signAsync(jwtPayload),
      tokenType: 'Bearer',
      user: this.toUserProfile(user),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        team: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is inactive.');
    }

    return {
      user: this.toUserProfile(user),
    };
  }

  private ensureAllowedDomain(email: string): void {
    const allowedDomains =
      this.configService.get<string[]>('app.allowedGoogleDomains') ?? [];
    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      throw new ForbiddenException('Email domain is not allowed.');
    }
  }

  private toUserProfile(user: AuthUserProfile) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      team: user.team
        ? {
            id: user.team.id,
            code: user.team.code,
            name: user.team.name,
          }
        : null,
      roles: user.userRoles.map((userRole) => ({
        id: userRole.role.id,
        code: userRole.role.code,
        name: userRole.role.name,
      })),
    };
  }
}
