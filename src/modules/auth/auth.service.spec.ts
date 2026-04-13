import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
    };
    role: {
      upsert: jest.Mock;
    };
    permission: {
      findMany: jest.Mock;
    };
    rolePermission: {
      createMany: jest.Mock;
    };
    userRole: {
      createMany: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };
  let googleTokenVerifierService: {
    verifyIdToken: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      user: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      role: {
        upsert: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      rolePermission: {
        createMany: jest.fn(),
      },
      userRole: {
        createMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.allowedGoogleDomains') {
          return ['garena.vn'];
        }

        if (key === 'app.superAdminEmails') {
          return ['dinhphuc.luu@garena.vn'];
        }

        return undefined;
      }),
    };

    googleTokenVerifierService = {
      verifyIdToken: jest.fn(),
    };

    service = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      googleTokenVerifierService as unknown as GoogleTokenVerifierService,
    );
  });

  it('logs in an allowed Google user and returns a JWT', async () => {
    googleTokenVerifierService.verifyIdToken.mockResolvedValue({
      googleId: 'google-123',
      email: 'admin@garena.vn',
      displayName: 'System Admin',
      avatarUrl: 'https://avatar.test/admin.png',
    });

    prismaService.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'admin@garena.vn',
      displayName: 'System Admin',
      avatarUrl: 'https://avatar.test/admin.png',
      status: UserStatus.ACTIVE,
      team: {
        id: 'team-1',
        code: 'ADM',
        name: 'Administration',
      },
      userRoles: [
        {
          role: {
            id: 'role-1',
            code: 'admin',
            name: 'Admin',
          },
        },
      ],
    });

    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@garena.vn',
      displayName: 'System Admin',
      avatarUrl: 'https://avatar.test/admin.png',
      status: UserStatus.ACTIVE,
      team: {
        id: 'team-1',
        code: 'ADM',
        name: 'Administration',
      },
      userRoles: [
        {
          role: {
            id: 'role-1',
            code: 'admin',
            name: 'Admin',
          },
        },
      ],
    });

    await expect(service.googleLogin({ credential: 'google-id-token' })).resolves.toEqual({
      accessToken: 'signed-jwt',
      tokenType: 'Bearer',
      user: {
        id: 'user-1',
        email: 'admin@garena.vn',
        displayName: 'System Admin',
        avatarUrl: 'https://avatar.test/admin.png',
        status: UserStatus.ACTIVE,
        team: {
          id: 'team-1',
          code: 'ADM',
          name: 'Administration',
        },
        roles: [
          {
            id: 'role-1',
            code: 'admin',
            name: 'Admin',
          },
        ],
      },
    });

    expect(prismaService.user.upsert).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'admin@garena.vn',
    });
  });

  it('rejects users from disallowed domains', async () => {
    googleTokenVerifierService.verifyIdToken.mockResolvedValue({
      googleId: 'google-123',
      email: 'admin@blocked.com',
      displayName: 'Blocked User',
      avatarUrl: null,
    });

    await expect(service.googleLogin({ credential: 'google-id-token' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaService.user.upsert).not.toHaveBeenCalled();
  });

  it('returns the current user profile', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@garena.vn',
      displayName: 'System Admin',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      team: null,
      userRoles: [],
    });

    await expect(service.me('user-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'admin@garena.vn',
        displayName: 'System Admin',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        team: null,
        roles: [],
      },
    });
  });

  it('rejects missing users on /auth/me', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.me('missing-user')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ensures the super_admin role for dinhphuc.luu@garena.vn', async () => {
    googleTokenVerifierService.verifyIdToken.mockResolvedValue({
      googleId: 'google-super-admin',
      email: 'dinhphuc.luu@garena.vn',
      displayName: 'Dinh Phuc Luu',
      avatarUrl: null,
    });

    prismaService.user.upsert.mockResolvedValue({
      id: 'user-super-admin',
      email: 'dinhphuc.luu@garena.vn',
      displayName: 'Dinh Phuc Luu',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      team: null,
      userRoles: [],
    });
    prismaService.role.upsert.mockResolvedValue({
      id: 'role-super-admin',
      code: 'super_admin',
      name: 'Super Admin',
    });
    prismaService.permission.findMany.mockResolvedValue([{ id: 'perm-1' }, { id: 'perm-2' }]);
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-super-admin',
      email: 'dinhphuc.luu@garena.vn',
      displayName: 'Dinh Phuc Luu',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      team: null,
      userRoles: [
        {
          role: {
            id: 'role-super-admin',
            code: 'super_admin',
            name: 'Super Admin',
          },
        },
      ],
    });

    await service.googleLogin({ credential: 'google-id-token' });

    expect(prismaService.role.upsert).toHaveBeenCalled();
    expect(prismaService.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 'role-super-admin', permissionId: 'perm-1' },
        { roleId: 'role-super-admin', permissionId: 'perm-2' },
      ],
      skipDuplicates: true,
    });
    expect(prismaService.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-super-admin', roleId: 'role-super-admin' }],
      skipDuplicates: true,
    });
  });

  it('rejects requests without a Google credential', async () => {
    await expect(service.googleLogin({})).rejects.toThrow('Missing Google credential');
    expect(googleTokenVerifierService.verifyIdToken).not.toHaveBeenCalled();
  });
});
