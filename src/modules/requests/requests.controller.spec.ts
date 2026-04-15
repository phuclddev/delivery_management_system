import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import request from 'supertest';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ProjectsService } from '../projects/projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('RequestsController (HTTP)', () => {
  let app: INestApplication;
  const requestsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const projectsService = {
    convertRequestToProject: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useValue: requestsService,
        },
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
          const req = context.switchToHttp().getRequest() as unknown as ExpressRequest & {
            user?: Record<string, unknown>;
          };
          const userId = req.headers['x-user-id'];

          if (!userId) {
            throw new UnauthorizedException('Authentication is required.');
          }

          req.user = {
            userId,
            email: req.headers['x-user-email'] ?? 'tester@garena.vn',
          };

          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
          const req = context.switchToHttp().getRequest() as unknown as ExpressRequest;
          const rawPermissions = String(req.headers['x-permissions'] ?? '');
          const permissions = rawPermissions
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

          if (!permissions.includes('requests:create')) {
            throw new ForbiddenException(
              'Missing required permission. Expected one of: requests:create',
            );
          }

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when POST /api/requests is called without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/requests')
      .send({
        requestCode: 'REQ-001',
        title: 'New request',
        requesterTeamId: 'team-1',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        status: 'new',
      })
      .expect(401);
  });

  it('returns 403 when POST /api/requests is called without requests:create', async () => {
    await request(app.getHttpServer())
      .post('/api/requests')
      .set('x-user-id', 'user-1')
      .set('x-user-email', 'pm@garena.vn')
      .send({
        requestCode: 'REQ-001',
        title: 'New request',
        requesterTeamId: 'team-1',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        status: 'new',
      })
      .expect(403);
  });

  it('returns 201 for successful request creation', async () => {
    requestsService.create.mockResolvedValue({
      data: {
        id: 'request-1',
        requestCode: 'REQ-001',
      },
    });

    await request(app.getHttpServer())
      .post('/api/requests')
      .set('x-user-id', 'requester-user')
      .set('x-user-email', 'requester@garena.vn')
      .set('x-permissions', 'requests:create')
      .send({
        requestCode: 'REQ-001',
        title: 'New request',
        requesterTeamId: 'team-1',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        status: 'new',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.requestCode).toBe('REQ-001');
      });
  });

  it('returns 409 when duplicate request_code is submitted', async () => {
    requestsService.create.mockRejectedValueOnce(
      new ConflictException('Request code REQ-001 already exists.'),
    );

    await request(app.getHttpServer())
      .post('/api/requests')
      .set('x-user-id', 'requester-user')
      .set('x-user-email', 'requester@garena.vn')
      .set('x-permissions', 'requests:create')
      .send({
        requestCode: 'REQ-001',
        title: 'Duplicate request',
        requesterTeamId: 'team-1',
        requestType: 'feature',
        scopeType: 'full',
        priority: 'high',
        status: 'new',
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toContain('already exists');
      });
  });
});
