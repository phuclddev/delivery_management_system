import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectEventsService } from './project-events.service';

function buildEventRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    project: {
      id: 'project-1',
      projectCode: 'PRJ-001',
      name: 'Delivery Hub',
      status: 'active',
    },
    request: {
      id: 'request-1',
      requestCode: 'REQ-001',
      title: 'Dashboard upgrade',
      status: 'new',
    },
    actorUser: {
      id: 'user-1',
      email: 'pm@garena.vn',
      displayName: 'PM User',
    },
    eventType: 'development_started',
    eventTitle: 'Development started',
    eventDescription: 'Kickoff after estimate approval',
    eventAt: new Date('2026-04-03T00:00:00.000Z'),
    sourceType: 'manual',
    metadataJson: { sprint: 'S14' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ProjectEventsService', () => {
  let service: ProjectEventsService;
  let prismaService: {
    projectEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    project: {
      findUnique: jest.Mock;
    };
    request: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      projectEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      request: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => Promise.all(arg)),
    };

    service = new ProjectEventsService(prismaService as unknown as PrismaService);
  });

  it('creates an event successfully', async () => {
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-1',
      projectId: 'project-1',
    });
    prismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaService.projectEvent.create.mockResolvedValue(buildEventRecord());

    const result = await service.create({
      projectId: 'project-1',
      requestId: 'request-1',
      actorUserId: 'user-1',
      eventType: 'development_started',
      eventTitle: 'Development started',
      eventAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'manual',
      metadataJson: { sprint: 'S14' },
    });

    expect(result.data.id).toBe('event-1');
    expect(result.data.project.projectCode).toBe('PRJ-001');
  });

  it('lists events by project', async () => {
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.projectEvent.findMany.mockResolvedValue([buildEventRecord()]);
    prismaService.projectEvent.count.mockResolvedValue(1);
    prismaService.$transaction.mockResolvedValue([[buildEventRecord()], 1]);

    const result = await service.findByProject('project-1', {});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('rejects create when request belongs to another project', async () => {
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-1',
      projectId: 'project-9',
    });

    await expect(
      service.create({
        projectId: 'project-1',
        requestId: 'request-1',
        eventType: 'development_started',
        eventTitle: 'Development started',
        eventAt: '2026-04-03T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
