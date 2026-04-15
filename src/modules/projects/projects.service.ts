import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Project, Request } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConvertRequestToProjectDto } from './dto/convert-request-to-project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectDetailInclude = {
  requesterTeam: true,
  pmOwner: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  requests: {
    select: {
      id: true,
      requestCode: true,
      title: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectDetail = Prisma.ProjectGetPayload<{
  include: typeof projectDetailInclude;
}>;

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

type ProjectRequestSummary = {
  id: string;
  requestCode: string;
  title: string;
  status: string;
  createdAt?: Date;
};

const sortableProjectFields = new Set([
  'createdAt',
  'updatedAt',
  'plannedLiveDate',
  'actualLiveDate',
  'status',
  'businessPriority',
  'projectCode',
  'name',
]);

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectDto) {
    const project = await this.prisma.$transaction(async (tx) => {
      await this.ensureProjectRelations(payload, undefined, tx);

      const created = await tx.project.create({
        data: this.toCreateProjectData(payload),
      });

      if (payload.requestId) {
        await tx.request.update({
          where: { id: payload.requestId },
          data: { projectId: created.id },
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id: created.id },
        include: projectDetailInclude,
      });
    });

    return { data: this.toResponse(project) };
  }

  async findAll(query: ProjectQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.ProjectWhereInput = {
      status: this.toOptionalString(query.status),
      businessPriority: this.toOptionalString(query.priority),
      requesterTeamId: this.toOptionalString(query.teamId),
      pmOwnerId: this.toOptionalString(query.pmOwnerId),
    };

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: projectDetailInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects.map((project) => this.toResponse(project)),
      meta: {
        page,
        pageSize,
        total,
        sortBy,
        sortOrder,
      },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectDetailInclude,
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found.`);
    }

    return { data: this.toResponse(project) };
  }

  async update(id: string, payload: UpdateProjectDto) {
    const project = await this.prisma.$transaction(async (tx) => {
      await this.ensureProjectExists(id, tx);
      await this.ensureProjectRelations(payload, id, tx);

      await tx.project.update({
        where: { id },
        data: this.toUpdateProjectData(payload),
      });

      if (payload.requestId) {
        await tx.request.update({
          where: { id: payload.requestId },
          data: { projectId: id },
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id },
        include: projectDetailInclude,
      });
    });

    return { data: this.toResponse(project) };
  }

  async remove(id: string) {
    await this.ensureProjectExists(id);
    await this.prisma.project.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  async convertRequestToProject(
    requestId: string,
    payload: ConvertRequestToProjectDto = {},
  ) {
    const project = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: {
          project: true,
        },
      });

      if (!request) {
        throw new NotFoundException(`Request ${requestId} was not found.`);
      }

      if (request.project) {
        if (payload.projectId && request.project.id === payload.projectId) {
          return tx.project.findUniqueOrThrow({
            where: { id: payload.projectId },
            include: projectDetailInclude,
          });
        }

        throw new ConflictException(`Request ${requestId} is already linked to project ${request.project.id}.`);
      }

      if (payload.projectId) {
        await this.ensureProjectExists(payload.projectId, tx);

        await tx.request.update({
          where: { id: requestId },
          data: { projectId: payload.projectId },
        });

        return tx.project.findUniqueOrThrow({
          where: { id: payload.projectId },
          include: projectDetailInclude,
        });
      }

      const projectPayload: CreateProjectDto = {
        projectCode: payload.projectCode ?? `${request.requestCode}-PRJ`,
        requestId: request.id,
        name: payload.name ?? request.title,
        requesterTeamId: request.requesterTeamId,
        pmOwnerId: payload.pmOwnerId,
        projectType: payload.projectType ?? request.requestType,
        scopeType: request.scopeType,
        status: payload.status ?? 'planned',
        businessPriority: payload.businessPriority ?? request.priority,
        riskLevel: payload.riskLevel,
        requestedLiveDate: request.desiredLiveDate?.toISOString(),
        plannedStartDate: payload.plannedStartDate,
        plannedLiveDate: payload.plannedLiveDate,
        actualStartDate: payload.actualStartDate,
        actualLiveDate: payload.actualLiveDate,
        backendStartDate: payload.backendStartDate ?? request.backendStartDate?.toISOString(),
        backendEndDate: payload.backendEndDate ?? request.backendEndDate?.toISOString(),
        frontendStartDate:
          payload.frontendStartDate ?? request.frontendStartDate?.toISOString(),
        frontendEndDate: payload.frontendEndDate ?? request.frontendEndDate?.toISOString(),
        currentScopeVersion: payload.currentScopeVersion,
        scopeChangeCount: payload.scopeChangeCount,
        blockerCount: payload.blockerCount,
        incidentCount: payload.incidentCount,
        chatGroupUrl: payload.chatGroupUrl,
        repoUrl: payload.repoUrl,
        notes: payload.notes,
      };

      await this.ensureProjectRelations(projectPayload, undefined, tx);

      const created = await tx.project.create({
        data: this.toCreateProjectData(projectPayload),
      });

      await tx.request.update({
        where: { id: requestId },
        data: { projectId: created.id },
      });

      return tx.project.findUniqueOrThrow({
        where: { id: created.id },
        include: projectDetailInclude,
      });
    });

    return { data: this.toResponse(project) };
  }

  private async ensureProjectExists(id: string, db: PrismaExecutor = this.prisma): Promise<Project> {
    const project = await db.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found.`);
    }

    return project;
  }

  private async ensureProjectRelations(
    payload: Partial<CreateProjectDto>,
    currentProjectId?: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    if (payload.requesterTeamId) {
      const team = await db.team.findUnique({
        where: { id: payload.requesterTeamId },
      });

      if (!team) {
        throw new NotFoundException(`Team ${payload.requesterTeamId} was not found.`);
      }
    }

    if (payload.pmOwnerId) {
      const user = await db.user.findUnique({
        where: { id: payload.pmOwnerId },
      });

      if (!user) {
        throw new NotFoundException(`User ${payload.pmOwnerId} was not found.`);
      }
    }

    if (payload.requestId) {
      const request = await db.request.findUnique({
        where: { id: payload.requestId },
        include: {
          project: true,
        },
      });

      if (!request) {
        throw new NotFoundException(`Request ${payload.requestId} was not found.`);
      }

      if (request.project && request.project.id !== currentProjectId) {
        throw new ConflictException(
          `Request ${payload.requestId} is already linked to project ${request.project.id}.`,
        );
      }
    }
  }

  private toCreateProjectData(
    payload: CreateProjectDto,
  ): Prisma.ProjectUncheckedCreateInput {
    return {
      projectCode: payload.projectCode,
      name: payload.name,
      requesterTeamId: payload.requesterTeamId,
      pmOwnerId: payload.pmOwnerId,
      projectType: payload.projectType,
      scopeType: payload.scopeType,
      status: payload.status,
      businessPriority: payload.businessPriority,
      riskLevel: payload.riskLevel,
      requestedLiveDate: payload.requestedLiveDate ? new Date(payload.requestedLiveDate) : payload.requestedLiveDate,
      plannedStartDate: payload.plannedStartDate ? new Date(payload.plannedStartDate) : payload.plannedStartDate,
      plannedLiveDate: payload.plannedLiveDate ? new Date(payload.plannedLiveDate) : payload.plannedLiveDate,
      actualStartDate: payload.actualStartDate ? new Date(payload.actualStartDate) : payload.actualStartDate,
      actualLiveDate: payload.actualLiveDate ? new Date(payload.actualLiveDate) : payload.actualLiveDate,
      backendStartDate: payload.backendStartDate ? new Date(payload.backendStartDate) : payload.backendStartDate,
      backendEndDate: payload.backendEndDate ? new Date(payload.backendEndDate) : payload.backendEndDate,
      frontendStartDate: payload.frontendStartDate ? new Date(payload.frontendStartDate) : payload.frontendStartDate,
      frontendEndDate: payload.frontendEndDate ? new Date(payload.frontendEndDate) : payload.frontendEndDate,
      currentScopeVersion: payload.currentScopeVersion,
      scopeChangeCount: payload.scopeChangeCount,
      blockerCount: payload.blockerCount,
      incidentCount: payload.incidentCount,
      chatGroupUrl: payload.chatGroupUrl,
      repoUrl: payload.repoUrl,
      notes: payload.notes,
    };
  }

  private toUpdateProjectData(
    payload: UpdateProjectDto,
  ): Prisma.ProjectUncheckedUpdateInput {
    return {
      projectCode: payload.projectCode,
      name: payload.name,
      requesterTeamId: payload.requesterTeamId,
      pmOwnerId: payload.pmOwnerId,
      projectType: payload.projectType,
      scopeType: payload.scopeType,
      status: payload.status,
      businessPriority: payload.businessPriority,
      riskLevel: payload.riskLevel,
      requestedLiveDate: payload.requestedLiveDate ? new Date(payload.requestedLiveDate) : payload.requestedLiveDate,
      plannedStartDate: payload.plannedStartDate ? new Date(payload.plannedStartDate) : payload.plannedStartDate,
      plannedLiveDate: payload.plannedLiveDate ? new Date(payload.plannedLiveDate) : payload.plannedLiveDate,
      actualStartDate: payload.actualStartDate ? new Date(payload.actualStartDate) : payload.actualStartDate,
      actualLiveDate: payload.actualLiveDate ? new Date(payload.actualLiveDate) : payload.actualLiveDate,
      backendStartDate: payload.backendStartDate ? new Date(payload.backendStartDate) : payload.backendStartDate,
      backendEndDate: payload.backendEndDate ? new Date(payload.backendEndDate) : payload.backendEndDate,
      frontendStartDate: payload.frontendStartDate ? new Date(payload.frontendStartDate) : payload.frontendStartDate,
      frontendEndDate: payload.frontendEndDate ? new Date(payload.frontendEndDate) : payload.frontendEndDate,
      currentScopeVersion: payload.currentScopeVersion,
      scopeChangeCount: payload.scopeChangeCount,
      blockerCount: payload.blockerCount,
      incidentCount: payload.incidentCount,
      chatGroupUrl: payload.chatGroupUrl,
      repoUrl: payload.repoUrl,
      notes: payload.notes,
    };
  }

  private toResponse(project: ProjectDetail) {
    const requests = project.requests.map((request) => ({
      id: request.id,
      requestCode: request.requestCode,
      title: request.title,
      status: request.status,
    }));
    const compatibilityRequest = (requests[0] as ProjectRequestSummary | undefined) ?? null;

    return {
      id: project.id,
      projectCode: project.projectCode,
      request: compatibilityRequest,
      requests,
      requestsCount: requests.length,
      name: project.name,
      requesterTeam: {
        id: project.requesterTeam.id,
        code: project.requesterTeam.code,
        name: project.requesterTeam.name,
      },
      pmOwner: project.pmOwner,
      projectType: project.projectType,
      scopeType: project.scopeType,
      status: project.status,
      businessPriority: project.businessPriority,
      riskLevel: project.riskLevel,
      requestedLiveDate: project.requestedLiveDate,
      plannedStartDate: project.plannedStartDate,
      plannedLiveDate: project.plannedLiveDate,
      actualStartDate: project.actualStartDate,
      actualLiveDate: project.actualLiveDate,
      backendStartDate: project.backendStartDate,
      backendEndDate: project.backendEndDate,
      frontendStartDate: project.frontendStartDate,
      frontendEndDate: project.frontendEndDate,
      currentScopeVersion: project.currentScopeVersion,
      scopeChangeCount: project.scopeChangeCount,
      blockerCount: project.blockerCount,
      incidentCount: project.incidentCount,
      chatGroupUrl: project.chatGroupUrl,
      repoUrl: project.repoUrl,
      notes: project.notes,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private toOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private clampPageSize(value: number): number {
    return Math.min(Math.max(value, 1), 100);
  }

  private resolveSortBy(value?: string): keyof Prisma.ProjectOrderByWithRelationInput {
    if (value && sortableProjectFields.has(value)) {
      return value as keyof Prisma.ProjectOrderByWithRelationInput;
    }

    return 'createdAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
