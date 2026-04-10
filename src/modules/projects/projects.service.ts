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
  request: {
    select: {
      id: true,
      requestCode: true,
      title: true,
      status: true,
    },
  },
  pmOwner: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectDetail = Prisma.ProjectGetPayload<{
  include: typeof projectDetailInclude;
}>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectDto) {
    await this.ensureProjectRelations(payload);

    const project = await this.prisma.project.create({
      data: this.toCreateProjectData(payload),
      include: projectDetailInclude,
    });

    return { data: this.toResponse(project) };
  }

  async findAll(query: ProjectQueryDto) {
    const projects = await this.prisma.project.findMany({
      where: {
        status: query.status,
        businessPriority: query.priority,
        requesterTeamId: query.teamId,
      },
      include: projectDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: projects.map((project) => this.toResponse(project)) };
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
    await this.ensureProjectExists(id);
    await this.ensureProjectRelations(payload, id);

    const project = await this.prisma.project.update({
      where: { id },
      data: this.toUpdateProjectData(payload),
      include: projectDetailInclude,
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
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        project: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }

    if (request.project) {
      throw new ConflictException(`Request ${requestId} has already been converted to a project.`);
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

    await this.ensureProjectRelations(projectPayload);

    const project = await this.prisma.project.create({
      data: this.toCreateProjectData(projectPayload),
      include: projectDetailInclude,
    });

    return { data: this.toResponse(project) };
  }

  private async ensureProjectExists(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found.`);
    }

    return project;
  }

  private async ensureProjectRelations(
    payload: Partial<CreateProjectDto>,
    currentProjectId?: string,
  ): Promise<void> {
    if (payload.requesterTeamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: payload.requesterTeamId },
      });

      if (!team) {
        throw new NotFoundException(`Team ${payload.requesterTeamId} was not found.`);
      }
    }

    if (payload.pmOwnerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.pmOwnerId },
      });

      if (!user) {
        throw new NotFoundException(`User ${payload.pmOwnerId} was not found.`);
      }
    }

    if (payload.requestId) {
      const request = await this.prisma.request.findUnique({
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
      requestId: payload.requestId,
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
      requestId: payload.requestId,
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
    return {
      id: project.id,
      projectCode: project.projectCode,
      request: project.request,
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
}
