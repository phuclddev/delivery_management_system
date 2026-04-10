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
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.allowedGoogleDomains') {
          return ['example.com'];
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
      email: 'admin@example.com',
      displayName: 'System Admin',
      avatarUrl: 'https://avatar.test/admin.png',
    });

    prismaService.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
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

    await expect(service.googleLogin({ idToken: 'google-id-token' })).resolves.toEqual({
      accessToken: 'signed-jwt',
      tokenType: 'Bearer',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
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
      email: 'admin@example.com',
    });
  });

  it('rejects users from disallowed domains', async () => {
    googleTokenVerifierService.verifyIdToken.mockResolvedValue({
      googleId: 'google-123',
      email: 'admin@blocked.com',
      displayName: 'Blocked User',
      avatarUrl: null,
    });

    await expect(service.googleLogin({ idToken: 'google-id-token' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaService.user.upsert).not.toHaveBeenCalled();
  });

  it('returns the current user profile', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'System Admin',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      team: null,
      userRoles: [],
    });

    await expect(service.me('user-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
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
});

