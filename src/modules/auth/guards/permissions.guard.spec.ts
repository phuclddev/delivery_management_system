import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const createContext = (user?: { userId: string; email: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows access when the user has the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue(['roles:view']);
    prisma.user.findUnique.mockResolvedValue({
      userRoles: [
        {
          role: {
            code: 'admin',
            rolePermissions: [
              {
                permission: {
                  code: 'roles:view',
                },
              },
            ],
          },
        },
      ],
    });

    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', email: 'admin@example.com' })),
    ).resolves.toBe(true);
  });

  it('allows access when the user has the super_admin role even without explicit permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['requests:view']);
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );

    await expect(
      guard.canActivate(
        createContext({
          userId: 'user-1',
          email: 'owner@garena.vn',
          roles: ['super_admin'],
          permissions: [],
        } as never),
      ),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects access when the user lacks the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue(['roles:manage']);
    prisma.user.findUnique.mockResolvedValue({
      userRoles: [
        {
          role: {
            code: 'pm',
            rolePermissions: [
              {
                permission: {
                  code: 'roles:view',
                },
              },
            ],
          },
        },
      ],
    });

    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', email: 'pm@example.com' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects access when the authenticated user is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['requests:view']);
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
