import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestAssignmentsService } from './request-assignments.service';

function buildAssignmentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-1',
    request: {
      id: 'request-1',
      requestCode: 'REQ-001',
      title: 'Dashboard upgrade',
      status: 'new',
      projectId: 'project-1',
    },
    project: {
      id: 'project-1',
      projectCode: 'PRJ-001',
      name: 'Delivery Hub',
      status: 'active',
      requesterTeam: {
        id: 'team-1',
        code: 'AOV',
        name: 'AOV',
      },
    },
    member: {
      id: 'member-1',
      email: 'dev@garena.vn',
      displayName: 'Dev User',
      team: {
        id: 'team-code',
        code: 'CODE',
        name: 'CODE',
      },
    },
    roleType: 'backend',
    workType: 'backend',
    uncertaintyLevel: 3,
    plannedMd: 5,
    actualMd: 4,
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-05T00:00:00.000Z'),
    status: 'planned',
    note: 'Core API work',
    feProfile: null,
    beProfile: null,
    systemProfile: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RequestAssignmentsService', () => {
  let service: RequestAssignmentsService;
  let prismaService: {
    requestAssignment: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    request: {
      findUnique: jest.Mock;
    };
    project: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    requestAssignmentFeProfile: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    requestAssignmentBeProfile: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    requestAssignmentSystemProfile: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      requestAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      request: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      requestAssignmentFeProfile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      requestAssignmentBeProfile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      requestAssignmentSystemProfile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => Promise.all(arg)),
    };

    service = new RequestAssignmentsService(prismaService as unknown as PrismaService);
  });

  it('creates an assignment successfully', async () => {
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-1',
      projectId: 'project-1',
    });
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.user.findUnique.mockResolvedValue({ id: 'member-1' });
    prismaService.requestAssignment.create.mockResolvedValue(buildAssignmentRecord());

    const result = await service.create({
      requestId: 'request-1',
      projectId: 'project-1',
      memberId: 'member-1',
      roleType: 'backend',
      workType: 'backend',
      plannedMd: 5,
      actualMd: 4,
      status: 'planned',
    });

    expect(result.data.id).toBe('assignment-1');
    expect(result.data.project.projectCode).toBe('PRJ-001');
  });

  it('lists assignments by request', async () => {
    prismaService.request.findUnique.mockResolvedValue({ id: 'request-1' });
    prismaService.requestAssignment.findMany.mockResolvedValue([buildAssignmentRecord()]);
    prismaService.requestAssignment.count.mockResolvedValue(1);
    prismaService.$transaction.mockResolvedValue([[buildAssignmentRecord()], 1]);

    const result = await service.findByRequest('request-1', {});

    expect(prismaService.request.findUnique).toHaveBeenCalledWith({
      where: { id: 'request-1' },
    });
    expect(result.data).toHaveLength(1);
  });

  it('lists assignments by project', async () => {
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.requestAssignment.findMany.mockResolvedValue([buildAssignmentRecord()]);
    prismaService.requestAssignment.count.mockResolvedValue(1);
    prismaService.$transaction.mockResolvedValue([[buildAssignmentRecord()], 1]);

    const result = await service.findByProject('project-1', {});

    expect(result.data).toHaveLength(1);
  });

  it('lists assignments by member', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 'member-1' });
    prismaService.requestAssignment.findMany.mockResolvedValue([buildAssignmentRecord()]);
    prismaService.requestAssignment.count.mockResolvedValue(1);
    prismaService.$transaction.mockResolvedValue([[buildAssignmentRecord()], 1]);

    const result = await service.findByMember('member-1', {});

    expect(result.data).toHaveLength(1);
  });

  it('rejects create when request is missing', async () => {
    prismaService.request.findUnique.mockResolvedValue(null);
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });

    await expect(
      service.create({
        requestId: 'missing-request',
        projectId: 'project-1',
        memberId: 'member-1',
        roleType: 'backend',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
