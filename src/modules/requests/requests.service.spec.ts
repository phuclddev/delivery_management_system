import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

function buildRequestRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    requestCode: 'REQ-001',
    projectId: 'project-1',
    ownerUserId: 'requester-user',
    title: 'Requester-owned request',
    requesterTeam: { id: 'team-1', code: 'AOV', name: 'AOV' },
    campaignName: null,
    requestType: 'feature',
    scopeType: 'full',
    priority: 'high',
    desiredLiveDate: null,
    brief: null,
    status: 'new',
    backendStartDate: null,
    backendEndDate: null,
    frontendStartDate: null,
    frontendEndDate: null,
    businessValueScore: null,
    userImpactScore: null,
    urgencyScore: null,
    valueNote: null,
    comment: null,
    project: {
      id: 'project-1',
      projectCode: 'PRJ-1',
      name: 'Project 1',
      status: 'active',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RequestsService', () => {
  let service: RequestsService;
  let prismaService: {
    request: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    team: {
      findUnique: jest.Mock;
    };
    project: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      request: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new RequestsService(prismaService as unknown as PrismaService);
  });

  it('stores the authenticated user as request owner on create', async () => {
    prismaService.team.findUnique.mockResolvedValue({ id: 'team-1' });
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.create.mockResolvedValue(buildRequestRecord());

    await service.create(
      {
        requestCode: 'REQ-001',
        title: 'Requester-owned request',
        requesterTeamId: 'team-1',
        projectId: 'project-1',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        status: 'new',
      },
      {
        userId: 'requester-user',
        email: 'requester@garena.vn',
        roles: ['requester'],
        permissions: ['requests:create', 'requests:view_own', 'requests:update_own'],
      },
    );

    expect(prismaService.request.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: 'requester-user',
        }),
      }),
    );
  });

  it('returns the request list for elevated access without owner filtering', async () => {
    prismaService.request.findMany.mockResolvedValue([buildRequestRecord()]);
    prismaService.request.count.mockResolvedValue(1);
    prismaService.$transaction.mockResolvedValue([[buildRequestRecord()], 1]);

    const result = await service.findAll(
      { status: 'new' },
      {
        userId: 'pm-user',
        email: 'pm@garena.vn',
        roles: ['pm'],
        permissions: ['requests:view'],
      },
    );

    expect(prismaService.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          ownerUserId: 'pm-user',
        }),
      }),
    );
    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('returns request detail for the owner when caller has requests:view_own', async () => {
    prismaService.request.findUnique.mockResolvedValue(buildRequestRecord());

    const result = await service.findOne('request-1', {
      userId: 'requester-user',
      email: 'requester@garena.vn',
      roles: ['requester'],
      permissions: ['requests:view_own'],
    });

    expect(result.data.id).toBe('request-1');
    expect(result.data.requestCode).toBe('REQ-001');
  });

  it('updates a request owned by the caller when requests:update_own is granted', async () => {
    prismaService.request.findUnique.mockResolvedValueOnce({
      id: 'request-1',
      ownerUserId: 'requester-user',
      requesterTeamId: 'team-1',
      projectId: 'project-1',
    });
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.update.mockResolvedValue(
      buildRequestRecord({
        title: 'Updated title',
      }),
    );

    const result = await service.update(
      'request-1',
      { title: 'Updated title' },
      {
        userId: 'requester-user',
        email: 'requester@garena.vn',
        roles: ['requester'],
        permissions: ['requests:update_own'],
      },
    );

    expect(prismaService.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
      }),
    );
    expect(result.data.title).toBe('Updated title');
  });

  it('limits list queries to the current user when only requests:view_own is granted', async () => {
    prismaService.request.findMany.mockResolvedValue([]);
    prismaService.request.count.mockResolvedValue(0);
    prismaService.$transaction.mockResolvedValue([[], 0]);

    await service.findAll(
      {},
      {
        userId: 'requester-user',
        email: 'requester@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view_own'],
      },
    );

    expect(prismaService.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerUserId: 'requester-user',
        }),
      }),
    );
  });

  it('still limits requester role to own requests even if stale broad request permissions exist', async () => {
    prismaService.request.findMany.mockResolvedValue([]);
    prismaService.request.count.mockResolvedValue(0);
    prismaService.$transaction.mockResolvedValue([[], 0]);

    await service.findAll(
      {},
      {
        userId: 'requester-a',
        email: 'requester-a@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view', 'requests:view_own', 'requests:update', 'requests:update_own'],
      },
    );

    expect(prismaService.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerUserId: 'requester-a',
        }),
      }),
    );
  });

  it('returns only requester A records for requester A and requester B records for requester B', async () => {
    prismaService.request.findMany.mockResolvedValue([]);
    prismaService.request.count.mockResolvedValue(0);
    prismaService.$transaction.mockResolvedValue([[], 0]);

    await service.findAll(
      {},
      {
        userId: 'requester-a',
        email: 'requester-a@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view_own'],
      },
    );
    await service.findAll(
      {},
      {
        userId: 'requester-b',
        email: 'requester-b@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view_own'],
      },
    );

    expect(prismaService.request.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          ownerUserId: 'requester-a',
        }),
      }),
    );
    expect(prismaService.request.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          ownerUserId: 'requester-b',
        }),
      }),
    );
  });

  it('rejects detail access for a request owned by another user when caller only has view_own', async () => {
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-2',
      ownerUserId: 'another-user',
      requestCode: 'REQ-002',
      projectId: null,
      title: 'Other request',
      requesterTeam: { id: 'team-1', code: 'FF', name: 'FF' },
      campaignName: null,
      requestType: 'feature',
      scopeType: 'full',
      priority: 'medium',
      desiredLiveDate: null,
      brief: null,
      status: 'new',
      backendStartDate: null,
      backendEndDate: null,
      frontendStartDate: null,
      frontendEndDate: null,
      businessValueScore: null,
      userImpactScore: null,
      urgencyScore: null,
      valueNote: null,
      comment: null,
      project: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.findOne('request-2', {
        userId: 'requester-user',
        email: 'requester@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view_own'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects detail access for another requester request even when stale broad view permission exists', async () => {
    prismaService.request.findUnique.mockResolvedValue(
      buildRequestRecord({
        id: 'request-2',
        ownerUserId: 'requester-b',
        requestCode: 'REQ-002',
      }),
    );

    await expect(
      service.findOne('request-2', {
        userId: 'requester-a',
        email: 'requester-a@garena.vn',
        roles: ['requester'],
        permissions: ['requests:view', 'requests:view_own'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update access for a request owned by another user when caller only has update_own', async () => {
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-2',
      ownerUserId: 'another-user',
    });

    await expect(
      service.update(
        'request-2',
        { title: 'Updated title' },
        {
          userId: 'requester-user',
          email: 'requester@garena.vn',
          roles: ['requester'],
          permissions: ['requests:update_own'],
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update access for another requester request even when stale broad update permission exists', async () => {
    prismaService.request.findUnique.mockResolvedValue({
      id: 'request-2',
      ownerUserId: 'requester-b',
    });

    await expect(
      service.update(
        'request-2',
        { title: 'Updated title' },
        {
          userId: 'requester-a',
          email: 'requester-a@garena.vn',
          roles: ['requester'],
          permissions: ['requests:update', 'requests:update_own'],
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still allows elevated pm role to update requests outside requester ownership scope', async () => {
    prismaService.request.findUnique.mockResolvedValueOnce({
      id: 'request-2',
      ownerUserId: 'requester-b',
      requesterTeamId: 'team-1',
      projectId: 'project-1',
    });
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.update.mockResolvedValue(
      buildRequestRecord({
        id: 'request-2',
        ownerUserId: 'requester-b',
        title: 'PM updated title',
      }),
    );

    const result = await service.update(
      'request-2',
      { title: 'PM updated title' },
      {
        userId: 'pm-user',
        email: 'pm@garena.vn',
        roles: ['pm'],
        permissions: ['requests:update'],
      },
    );

    expect(result.data.title).toBe('PM updated title');
  });

  it('returns a controlled conflict error when request_code is duplicated', async () => {
    prismaService.team.findUnique.mockResolvedValue({ id: 'team-1' });
    prismaService.project.findUnique.mockResolvedValue({ id: 'project-1' });
    prismaService.request.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(
        {
          requestCode: 'REQ-001',
          title: 'Requester-owned request',
          requesterTeamId: 'team-1',
          projectId: 'project-1',
          requestType: 'feature',
          scopeType: 'full',
          priority: 'high',
          status: 'new',
        },
        {
          userId: 'requester-user',
          email: 'requester@garena.vn',
          roles: ['requester'],
          permissions: ['requests:create'],
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
