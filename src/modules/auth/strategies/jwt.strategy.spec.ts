import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    configService = {
      get: jest.fn().mockReturnValue('change-me'),
    };

    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('returns an authenticated user with roles and permissions', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@garena.vn',
      status: UserStatus.ACTIVE,
      userRoles: [
        {
          role: {
            code: 'admin',
            rolePermissions: [
              {
                permission: {
                  code: 'requests:view',
                },
              },
            ],
          },
        },
      ],
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'admin@garena.vn',
        is_impersonation: true,
        impersonated_by: 'admin-user',
        impersonated_by_email: 'dinhphuc.luu@garena.vn',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      email: 'admin@garena.vn',
      roles: ['admin'],
      permissions: ['requests:view'],
      isImpersonation: true,
      impersonatedBy: 'admin-user',
      impersonatedByEmail: 'dinhphuc.luu@garena.vn',
    });
  });

  it('rejects missing users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'missing-user',
        email: 'missing@garena.vn',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'inactive@garena.vn',
      status: UserStatus.INACTIVE,
      userRoles: [],
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'inactive@garena.vn',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
