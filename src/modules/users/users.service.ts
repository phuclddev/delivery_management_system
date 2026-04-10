import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

const userDetailInclude = {
  team: true,
  userRoles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.UserInclude;

type UserDetail = Prisma.UserGetPayload<{
  include: typeof userDetailInclude;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userDetailInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      data: users.map((user) => this.toUserResponse(user)),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userDetailInclude,
    });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    return {
      data: this.toUserResponse(user),
    };
  }

  async updateRoles(id: string, payload: UpdateUserRolesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    const uniqueRoleIds = Array.from(new Set(payload.roleIds));

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: uniqueRoleIds,
        },
      },
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new NotFoundException('One or more roles were not found.');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: {
          userId: id,
        },
      }),
      ...(uniqueRoleIds.length > 0
        ? [
            this.prisma.userRole.createMany({
              data: uniqueRoleIds.map((roleId) => ({
                userId: id,
                roleId,
              })),
            }),
          ]
        : []),
    ]);

    const updatedUser = await this.prisma.user.findUnique({
      where: { id },
      include: userDetailInclude,
    });

    if (!updatedUser) {
      throw new NotFoundException(`User ${id} was not found after role update.`);
    }

    return {
      data: this.toUserResponse(updatedUser),
    };
  }

  private toUserResponse(user: UserDetail) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
        description: userRole.role.description,
        isSystem: userRole.role.isSystem,
      })),
    };
  }
}
