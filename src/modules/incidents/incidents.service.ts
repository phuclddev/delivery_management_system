import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Incident } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

const incidentInclude = {
  project: {
    select: {
      id: true,
      projectCode: true,
      name: true,
      status: true,
    },
  },
  ownerMember: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.IncidentInclude;

type IncidentDetail = Prisma.IncidentGetPayload<{
  include: typeof incidentInclude;
}>;

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateIncidentDto) {
    await this.ensureRelations(payload.projectId, payload.ownerMemberId);

    const incident = await this.prisma.incident.create({
      data: this.toCreateData(payload),
      include: incidentInclude,
    });

    await this.syncProjectIncidentCount(payload.projectId);
    return { data: this.toResponse(incident) };
  }

  async findAll() {
    const incidents = await this.prisma.incident.findMany({
      include: incidentInclude,
      orderBy: [{ foundAt: 'desc' }, { createdAt: 'desc' }],
    });

    return { data: incidents.map((incident) => this.toResponse(incident)) };
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: incidentInclude,
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} was not found.`);
    }

    return { data: this.toResponse(incident) };
  }

  async update(id: string, payload: UpdateIncidentDto) {
    const existing = await this.ensureIncidentExists(id);
    await this.ensureRelations(payload.projectId, payload.ownerMemberId);

    const incident = await this.prisma.incident.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: incidentInclude,
    });

    if (payload.projectId && payload.projectId !== existing.projectId) {
      await this.syncProjectIncidentCount(existing.projectId);
    }
    await this.syncProjectIncidentCount(incident.projectId);

    return { data: this.toResponse(incident) };
  }

  async remove(id: string) {
    const incident = await this.ensureIncidentExists(id);
    await this.prisma.incident.delete({ where: { id } });
    await this.syncProjectIncidentCount(incident.projectId);

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  private async ensureIncidentExists(id: string): Promise<Incident> {
    const incident = await this.prisma.incident.findUnique({ where: { id } });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} was not found.`);
    }

    return incident;
  }

  private async ensureRelations(projectId?: string, ownerMemberId?: string) {
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new NotFoundException(`Project ${projectId} was not found.`);
      }
    }

    if (ownerMemberId) {
      const user = await this.prisma.user.findUnique({ where: { id: ownerMemberId } });
      if (!user) {
        throw new NotFoundException(`User ${ownerMemberId} was not found.`);
      }
    }
  }

  private async syncProjectIncidentCount(projectId: string) {
    const count = await this.prisma.incident.count({
      where: { projectId },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { incidentCount: count },
    });
  }

  private toCreateData(payload: CreateIncidentDto): Prisma.IncidentUncheckedCreateInput {
    return {
      incidentCode: payload.incidentCode,
      projectId: payload.projectId,
      foundAt: new Date(payload.foundAt),
      severity: payload.severity,
      domain: payload.domain,
      impactDescription: payload.impactDescription,
      resolvers: payload.resolvers,
      background: payload.background,
      solution: payload.solution,
      processingMinutes: payload.processingMinutes,
      tag: payload.tag,
      status: payload.status,
      ownerMemberId: payload.ownerMemberId,
    };
  }

  private toUpdateData(payload: UpdateIncidentDto): Prisma.IncidentUncheckedUpdateInput {
    return {
      incidentCode: payload.incidentCode,
      projectId: payload.projectId,
      foundAt: payload.foundAt ? new Date(payload.foundAt) : payload.foundAt,
      severity: payload.severity,
      domain: payload.domain,
      impactDescription: payload.impactDescription,
      resolvers: payload.resolvers,
      background: payload.background,
      solution: payload.solution,
      processingMinutes: payload.processingMinutes,
      tag: payload.tag,
      status: payload.status,
      ownerMemberId: payload.ownerMemberId,
    };
  }

  private toResponse(incident: IncidentDetail) {
    return {
      id: incident.id,
      incidentCode: incident.incidentCode,
      project: incident.project,
      foundAt: incident.foundAt,
      severity: incident.severity,
      domain: incident.domain,
      impactDescription: incident.impactDescription,
      resolvers: incident.resolvers,
      background: incident.background,
      solution: incident.solution,
      processingMinutes: incident.processingMinutes,
      tag: incident.tag,
      status: incident.status,
      ownerMember: incident.ownerMember,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    };
  }
}

