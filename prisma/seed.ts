import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const teamSeeds = [
  {
    code: 'ADM',
    name: 'Administration',
    description: 'Administrative team',
  },
  {
    code: 'ENG',
    name: 'Engineering',
    description: 'Engineering delivery team',
  },
];

const roleSeeds = [
  {
    code: 'admin',
    name: 'Admin',
    description: 'Full access to the platform',
  },
  {
    code: 'pm',
    name: 'Project Manager',
    description: 'Can manage delivery planning modules',
  },
  {
    code: 'dev',
    name: 'Developer',
    description: 'Can access assigned delivery data',
  },
];

const permissionModules = [
  'requests',
  'projects',
  'allocations',
  'incidents',
  'artifacts',
  'leaves',
  'users',
  'roles',
  'permissions',
];

const permissionActions = ['view', 'create', 'update', 'delete', 'manage'];

async function main(): Promise<void> {
  const adminTeam = await prisma.team.upsert({
    where: { code: 'ADM' },
    update: {},
    create: teamSeeds[0],
  });

  await Promise.all(
    teamSeeds.slice(1).map((team) =>
      prisma.team.upsert({
        where: { code: team.code },
        update: {},
        create: team,
      }),
    ),
  );

  const permissions = await Promise.all(
    permissionModules.flatMap((module) =>
      permissionActions.map((action) =>
        prisma.permission.upsert({
          where: {
            code: `${module}:${action}`,
          },
          update: {
            description: `${action} access for ${module}`,
          },
          create: {
            module,
            action,
            code: `${module}:${action}`,
            description: `${action} access for ${module}`,
          },
        }),
      ),
    ),
  );

  const roles = await Promise.all(
    roleSeeds.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
        },
        create: role,
      }),
    ),
  );

  const adminRole = roles.find((role) => role.code === 'admin');
  const pmRole = roles.find((role) => role.code === 'pm');
  const devRole = roles.find((role) => role.code === 'dev');

  if (!adminRole || !pmRole || !devRole) {
    throw new Error('Required roles were not created');
  }

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: adminRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const pmPermissionCodes = new Set(
    permissions
      .filter((permission) =>
        ['requests', 'projects', 'allocations', 'incidents', 'artifacts'].includes(
          permission.module,
        ),
      )
      .map((permission) => permission.code),
  );

  const devPermissionCodes = new Set(
    permissions
      .filter((permission) =>
        permission.action === 'view' ||
        (['projects', 'artifacts', 'incidents'].includes(permission.module) &&
          permission.action === 'update'),
      )
      .map((permission) => permission.code),
  );

  await prisma.rolePermission.createMany({
    data: permissions
      .filter((permission) => pmPermissionCodes.has(permission.code))
      .map((permission) => ({
        roleId: pmRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: permissions
      .filter((permission) => devPermissionCodes.has(permission.code))
      .map((permission) => ({
        roleId: devRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      displayName: 'System Admin',
      teamId: adminTeam.id,
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@example.com',
      displayName: 'System Admin',
      teamId: adminTeam.id,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.createMany({
    data: [
      {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

