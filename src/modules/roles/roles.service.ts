import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const roleDetailInclude = {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
  userRoles: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.RoleInclude;

type RoleDetail = Prisma.RoleGetPayload<{
  include: typeof roleDetailInclude;
}>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: roleDetailInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      data: roles.map((role) => this.toRoleResponse(role)),
    };
  }

  async create(payload: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        isSystem: payload.isSystem ?? false,
      },
      include: roleDetailInclude,
    });

    return {
      data: this.toRoleResponse(role),
    };
  }

  async update(id: string, payload: UpdateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${id} was not found.`);
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        isSystem: payload.isSystem,
      },
      include: roleDetailInclude,
    });

    return {
      data: this.toRoleResponse(role),
    };
  }

  async updatePermissions(id: string, payload: UpdateRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} was not found.`);
    }

    const uniquePermissionIds = Array.from(new Set(payload.permissionIds));

    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: uniquePermissionIds,
        },
      },
    });

    if (permissions.length !== uniquePermissionIds.length) {
      throw new NotFoundException('One or more permissions were not found.');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: {
          roleId: id,
        },
      }),
      ...(uniquePermissionIds.length > 0
        ? [
            this.prisma.rolePermission.createMany({
              data: uniquePermissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            }),
          ]
        : []),
    ]);

    const updatedRole = await this.prisma.role.findUnique({
      where: { id },
      include: roleDetailInclude,
    });

    if (!updatedRole) {
      throw new NotFoundException(`Role ${id} was not found after permission update.`);
    }

    return {
      data: this.toRoleResponse(updatedRole),
    };
  }

  private toRoleResponse(role: RoleDetail) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rolePermission) => ({
        id: rolePermission.permission.id,
        code: rolePermission.permission.code,
        module: rolePermission.permission.module,
        action: rolePermission.permission.action,
        description: rolePermission.permission.description,
      })),
      users: role.userRoles.map((userRole) => ({
        id: userRole.user.id,
        email: userRole.user.email,
        displayName: userRole.user.displayName,
      })),
    };
  }
}
