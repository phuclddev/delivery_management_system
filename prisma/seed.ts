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
  {
    code: 'PMO',
    name: 'Project Management',
    description: 'Project managers and coordinators',
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
  'teams',
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
  const teams = await Promise.all(
    teamSeeds.map((team) =>
      prisma.team.upsert({
        where: { code: team.code },
        update: {
          name: team.name,
          description: team.description,
        },
        create: team,
      }),
    ),
  );

  const adminTeam = teams.find((team) => team.code === 'ADM');
  const engineeringTeam = teams.find((team) => team.code === 'ENG');
  const pmoTeam = teams.find((team) => team.code === 'PMO');

  if (!adminTeam || !engineeringTeam || !pmoTeam) {
    throw new Error('Required teams were not created');
  }

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

  const pmUser = await prisma.user.upsert({
    where: { email: 'pm@example.com' },
    update: {
      displayName: 'Delivery PM',
      teamId: pmoTeam.id,
      status: 'ACTIVE',
    },
    create: {
      email: 'pm@example.com',
      displayName: 'Delivery PM',
      teamId: pmoTeam.id,
      status: 'ACTIVE',
    },
  });

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {
      displayName: 'Delivery Developer',
      teamId: engineeringTeam.id,
      status: 'ACTIVE',
    },
    create: {
      email: 'dev@example.com',
      displayName: 'Delivery Developer',
      teamId: engineeringTeam.id,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.createMany({
    data: [
      {
        userId: pmUser.id,
        roleId: pmRole.id,
      },
      {
        userId: devUser.id,
        roleId: devRole.id,
      },
      {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    ],
    skipDuplicates: true,
  });

  const sampleRequest = await prisma.request.upsert({
    where: { requestCode: 'REQ-001' },
    update: {
      title: 'Delivery dashboard improvements',
      requesterTeamId: pmoTeam.id,
      requestType: 'feature',
      scopeType: 'full',
      priority: 'high',
      status: 'approved',
    },
    create: {
      requestCode: 'REQ-001',
      title: 'Delivery dashboard improvements',
      requesterTeamId: pmoTeam.id,
      campaignName: 'Ops Visibility',
      requestType: 'feature',
      scopeType: 'full',
      priority: 'high',
      desiredLiveDate: new Date('2026-05-15T00:00:00.000Z'),
      brief: 'Improve visibility into workload, incidents, and release status.',
      status: 'approved',
      backendStartDate: new Date('2026-04-15T00:00:00.000Z'),
      backendEndDate: new Date('2026-05-01T00:00:00.000Z'),
      frontendStartDate: new Date('2026-05-02T00:00:00.000Z'),
      frontendEndDate: new Date('2026-05-12T00:00:00.000Z'),
      businessValueScore: 9,
      userImpactScore: 8,
      urgencyScore: 7,
      valueNote: 'Improves planning cadence and stakeholder reporting.',
      comment: 'Seeded sample request.',
    },
  });

  const sampleProject = await prisma.project.upsert({
    where: { projectCode: 'PRJ-001' },
    update: {
      requestId: sampleRequest.id,
      requesterTeamId: pmoTeam.id,
      pmOwnerId: pmUser.id,
      status: 'in_progress',
      businessPriority: 'high',
    },
    create: {
      projectCode: 'PRJ-001',
      requestId: sampleRequest.id,
      name: 'Delivery Dashboard Revamp',
      requesterTeamId: pmoTeam.id,
      pmOwnerId: pmUser.id,
      projectType: 'feature',
      scopeType: 'full',
      status: 'in_progress',
      businessPriority: 'high',
      riskLevel: 'medium',
      requestedLiveDate: new Date('2026-05-15T00:00:00.000Z'),
      plannedStartDate: new Date('2026-04-15T00:00:00.000Z'),
      plannedLiveDate: new Date('2026-05-20T00:00:00.000Z'),
      backendStartDate: new Date('2026-04-15T00:00:00.000Z'),
      backendEndDate: new Date('2026-05-01T00:00:00.000Z'),
      frontendStartDate: new Date('2026-05-02T00:00:00.000Z'),
      frontendEndDate: new Date('2026-05-12T00:00:00.000Z'),
      currentScopeVersion: 'v1',
      scopeChangeCount: 1,
      blockerCount: 0,
      incidentCount: 0,
      chatGroupUrl: 'https://chat.example.com/delivery-dashboard',
      repoUrl: 'https://github.com/example/delivery-dashboard',
      notes: 'Seeded sample project.',
    },
  });

  await prisma.projectAllocation.upsert({
    where: {
      id: 'seed-allocation-dev-primary',
    },
    update: {
      memberId: devUser.id,
      projectId: sampleProject.id,
      allocationPct: 70,
      startDate: new Date('2026-04-15T00:00:00.000Z'),
      endDate: new Date('2026-05-10T00:00:00.000Z'),
    },
    create: {
      id: 'seed-allocation-dev-primary',
      memberId: devUser.id,
      projectId: sampleProject.id,
      roleType: 'backend_dev',
      allocationPct: 70,
      plannedMd: 15,
      actualMd: 6,
      startDate: new Date('2026-04-15T00:00:00.000Z'),
      endDate: new Date('2026-05-10T00:00:00.000Z'),
      priorityWeight: 5,
      isPrimary: true,
      note: 'Primary delivery engineer for seed project.',
    },
  });

  await prisma.incident.upsert({
    where: { incidentCode: 'INC-001' },
    update: {
      projectId: sampleProject.id,
      ownerMemberId: devUser.id,
      status: 'resolved',
    },
    create: {
      incidentCode: 'INC-001',
      projectId: sampleProject.id,
      foundAt: new Date('2026-04-18T08:00:00.000Z'),
      severity: 'medium',
      domain: 'backend',
      impactDescription: 'Intermittent API timeout on workload summary endpoint.',
      resolvers: 'Delivery Developer',
      background: 'Cold cache plus inefficient aggregation query.',
      solution: 'Added query index and cache warm-up.',
      processingMinutes: 55,
      tag: 'seed',
      status: 'resolved',
      ownerMemberId: devUser.id,
    },
  });

  await prisma.projectArtifact.upsert({
    where: { id: 'seed-artifact-release-note' },
    update: {
      projectId: sampleProject.id,
      uploadedBy: pmUser.id,
    },
    create: {
      id: 'seed-artifact-release-note',
      projectId: sampleProject.id,
      artifactType: 'release_note',
      title: 'Initial Release Note',
      contentText: 'Initial delivery dashboard release note.',
      uploadedBy: pmUser.id,
      isFinal: false,
    },
  });

  await prisma.memberLeave.upsert({
    where: { id: 'seed-leave-dev-1' },
    update: {
      memberId: devUser.id,
    },
    create: {
      id: 'seed-leave-dev-1',
      memberId: devUser.id,
      leaveType: 'annual_leave',
      startDate: new Date('2026-05-05T00:00:00.000Z'),
      endDate: new Date('2026-05-06T00:00:00.000Z'),
      note: 'Seed sample leave.',
    },
  });

  const incidentCount = await prisma.incident.count({
    where: {
      projectId: sampleProject.id,
    },
  });

  await prisma.project.update({
    where: { id: sampleProject.id },
    data: {
      incidentCount,
    },
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
