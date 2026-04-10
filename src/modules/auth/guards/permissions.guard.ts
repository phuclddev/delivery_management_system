import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
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
      throw new UnauthorizedException('Authentication is required.');
    }

    const authzUser = await this.prisma.user.findUnique({
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

    if (!authzUser) {
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    const userPermissions = Array.from(
      new Set(
        authzUser.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    );

    request.user = {
      ...user,
      roles: authzUser.userRoles.map((userRole) => userRole.role.code),
      permissions: userPermissions,
    };

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission. Expected one of: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
