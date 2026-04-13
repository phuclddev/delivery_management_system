import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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

const REQUIRED_GOOGLE_DOMAIN = 'garena.vn';
const SUPER_ADMIN_ROLE_CODE = 'super_admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleTokenVerifierService: GoogleTokenVerifierService,
  ) {}

  async googleLogin(payload: GoogleLoginDto) {
    const credential = this.extractGoogleCredential(payload);
    const googleIdentity =
      await this.googleTokenVerifierService.verifyIdToken(credential);
    this.logger.log(`Google login attempt received for ${googleIdentity.email}.`);
    this.ensureAllowedDomain(googleIdentity.email);

    const upsertedUser = await this.prisma.user.upsert({
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

    if (this.getSuperAdminEmails().includes(upsertedUser.email.toLowerCase())) {
      this.logger.log(`Ensuring super_admin access for ${upsertedUser.email}.`);
      await this.ensureSuperAdminAccess(upsertedUser.id);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: upsertedUser.id,
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
      this.logger.warn(`Login blocked because user ${user.email} is inactive.`);
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

  private extractGoogleCredential(payload: GoogleLoginDto): string {
    const credential = payload.credential ?? payload.idToken;

    if (!credential) {
      this.logger.warn('Rejected Google login because no credential was provided.');
      throw new UnauthorizedException(
        'Missing Google credential. The frontend must send { "credential": "<google_id_token>" } to /auth/google.',
      );
    }

    return credential;
  }

  private ensureAllowedDomain(email: string): void {
    const allowedDomains =
      this.configService.get<string[]>('app.allowedGoogleDomains') ?? [];
    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (
      !emailDomain ||
      emailDomain !== REQUIRED_GOOGLE_DOMAIN ||
      !allowedDomains.includes(emailDomain)
    ) {
      this.logger.warn(
        `Rejected login for ${email} because domain ${emailDomain ?? 'unknown'} is not allowed. Allowed domains: ${allowedDomains.join(', ') || 'none'}.`,
      );
      throw new ForbiddenException(
        `Email domain is not allowed. Only ${REQUIRED_GOOGLE_DOMAIN} accounts can sign in.`,
      );
    }
  }

  private getSuperAdminEmails(): string[] {
    return this.configService.get<string[]>('app.superAdminEmails') ?? [];
  }

  private async ensureSuperAdminAccess(userId: string): Promise<void> {
    const role = await this.prisma.role.upsert({
      where: {
        code: SUPER_ADMIN_ROLE_CODE,
      },
      update: {
        name: 'Super Admin',
        description: 'Reserved full-access role for the platform owner.',
        isSystem: true,
      },
      create: {
        code: SUPER_ADMIN_ROLE_CODE,
        name: 'Super Admin',
        description: 'Reserved full-access role for the platform owner.',
        isSystem: true,
      },
    });

    const permissions = await this.prisma.permission.findMany({
      select: {
        id: true,
      },
    });

    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    await this.prisma.userRole.createMany({
      data: [
        {
          userId,
          roleId: role.id,
        },
      ],
      skipDuplicates: true,
    });

    this.logger.log(`super_admin role ensured for user ${userId}.`);
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
