import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

function buildProjectRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    projectCode: 'PRJ-001',
    name: 'Delivery Hub',
    requesterTeam: {
      id: 'team-1',
      code: 'AOV',
      name: 'AOV',
    },
    pmOwner: {
      id: 'pm-1',
      email: 'pm@garena.vn',
      displayName: 'PM User',
    },
    requests: [
      {
        id: 'request-1',
        requestCode: 'REQ-001',
        title: 'Dashboard upgrade',
        status: 'new',
        createdAt: new Date(),
      },
    ],
    projectType: 'feature',
    scopeType: 'full',
    status: 'planned',
    businessPriority: 'high',
    riskLevel: 'medium',
    requestedLiveDate: null,
    plannedStartDate: null,
    plannedLiveDate: null,
    actualStartDate: null,
    actualLiveDate: null,
    backendStartDate: null,
    backendEndDate: null,
    frontendStartDate: null,
    frontendEndDate: null,
    currentScopeVersion: null,
    scopeChangeCount: 0,
    blockerCount: 0,
    incidentCount: 0,
    chatGroupUrl: null,
    repoUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ProjectsService', () => {
  let service: ProjectsService;
  let tx: {
    project: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    request: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    team: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let prismaService: {
    project: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    request: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    team: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      project: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      request: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    prismaService = {
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      request: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => {
        if (typeof arg === 'function') {
          return arg(tx);
        }

        return Promise.all(arg);
      }),
    };

    service = new ProjectsService(prismaService as unknown as PrismaService);
  });

  it('creates a project successfully', async () => {
    const createdProject = buildProjectRecord();

    tx.team.findUnique.mockResolvedValue({ id: 'team-1' });
    tx.user.findUnique.mockResolvedValue({ id: 'pm-1' });
    tx.project.create.mockResolvedValue({ id: 'project-1' });
    tx.project.findUniqueOrThrow.mockResolvedValue(createdProject);

    const result = await service.create({
      projectCode: 'PRJ-001',
      name: 'Delivery Hub',
      requesterTeamId: 'team-1',
      pmOwnerId: 'pm-1',
      projectType: 'feature',
      scopeType: 'full',
      status: 'planned',
      businessPriority: 'high',
    });

    expect(result.data.projectCode).toBe('PRJ-001');
    expect(result.data.requestsCount).toBe(1);
  });

  it('lists projects', async () => {
    prismaService.project.findMany.mockResolvedValue([buildProjectRecord()]);
    prismaService.project.count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('returns project detail', async () => {
    prismaService.project.findUnique.mockResolvedValue(buildProjectRecord());

    const result = await service.findOne('project-1');

    expect(result.data.id).toBe('project-1');
    expect(result.data.requestsCount).toBe(1);
  });

  it('attaches a request to an existing project through convert flow', async () => {
    const attachedProject = buildProjectRecord({
      id: 'project-2',
      projectCode: 'PRJ-002',
    });

    tx.request.findUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        requesterTeamId: 'team-1',
        requestCode: 'REQ-001',
        title: 'Dashboard upgrade',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        desiredLiveDate: null,
        backendStartDate: null,
        backendEndDate: null,
        frontendStartDate: null,
        frontendEndDate: null,
        project: null,
      });
    tx.project.findUnique.mockResolvedValue({ id: 'project-2' });
    tx.request.update.mockResolvedValue({});
    tx.project.findUniqueOrThrow.mockResolvedValue(attachedProject);

    const result = await service.convertRequestToProject('request-1', {
      projectId: 'project-2',
    });

    expect(tx.request.update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { projectId: 'project-2' },
    });
    expect(result.data.id).toBe('project-2');
  });

  it('rejects convert flow when request is already attached elsewhere', async () => {
    tx.request.findUnique.mockResolvedValue({
      id: 'request-1',
      project: { id: 'project-9' },
    });

    await expect(
      service.convertRequestToProject('request-1', {
        projectId: 'project-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found for missing project detail', async () => {
    prismaService.project.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-project')).rejects.toBeInstanceOf(NotFoundException);
  });
});
