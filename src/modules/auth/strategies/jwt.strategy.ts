import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    this.logger.debug(`Validating JWT for subject ${payload.sub} (${payload.email}).`);

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`JWT rejected because user ${payload.sub} no longer exists.`);
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`JWT rejected because user ${user.email} is inactive.`);
      throw new ForbiddenException('User account is inactive.');
    }

    const roles = user.userRoles.map((userRole) => userRole.role.code);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    );

    if (roles.length === 0) {
      this.logger.warn(`User ${user.email} authenticated without any assigned roles.`);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles,
      permissions,
    };
  }
}
