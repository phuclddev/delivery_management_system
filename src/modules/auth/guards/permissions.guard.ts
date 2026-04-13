import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.userId) {
      this.logger.warn(
        `Permission check failed because no authenticated user was attached to the request. Required permissions: ${requiredPermissions.join(', ')}`,
      );
      throw new UnauthorizedException('Authentication is required.');
    }

    const authzUser =
      user.roles && user.permissions
        ? null
        : await this.prisma.user.findUnique({
            where: {
              id: user.userId,
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

    if (!user.roles && !authzUser) {
      this.logger.warn(
        `Permission check failed because authenticated user ${user.userId} no longer exists.`,
      );
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    const roleCodes =
      user.roles ??
      authzUser!.userRoles.map((userRole) => userRole.role.code);

    const userPermissions =
      user.permissions ??
      Array.from(
        new Set(
          authzUser!.userRoles.flatMap((userRole) =>
            userRole.role.rolePermissions.map(
              (rolePermission) => rolePermission.permission.code,
            ),
          ),
        ),
      );

    if (roleCodes.length === 0) {
      this.logger.warn(
        `Permission check failed because user ${user.email} has no assigned roles.`,
      );
    }

    if (roleCodes.includes('super_admin') || roleCodes.includes('admin')) {
      this.logger.debug(
        `Permission check bypassed for elevated role on ${user.email}. Required permissions: ${requiredPermissions.join(', ')}`,
      );
      request.user = {
        ...user,
        roles: roleCodes,
        permissions: userPermissions,
      };

      return true;
    }

    request.user = {
      ...user,
      roles: roleCodes,
      permissions: userPermissions,
    };

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission check failed for ${user.email}. Required: ${requiredPermissions.join(', ')}. Roles: ${roleCodes.join(', ') || 'none'}. Permissions: ${userPermissions.join(', ') || 'none'}.`,
      );
      throw new ForbiddenException(
        `Missing required permission. Expected one of: ${requiredPermissions.join(', ')}`,
      );
    }

    this.logger.debug(
      `Permission check passed for ${user.email}. Required permissions: ${requiredPermissions.join(', ')}`,
    );

    return true;
  }
}
