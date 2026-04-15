import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Incident } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentQueryDto } from './dto/incident-query.dto';
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

const sortableIncidentFields = new Set([
  'foundAt',
  'createdAt',
  'updatedAt',
  'severity',
  'status',
  'incidentCode',
]);

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

  async findAll(query: IncidentQueryDto) {
    this.validateOptionalDateRange(query.startDate, query.endDate);
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.IncidentWhereInput = {
      projectId: this.toOptionalString(query.projectId),
      ownerMemberId: this.toOptionalString(query.ownerMemberId),
      severity: this.toOptionalString(query.severity),
      domain: this.toOptionalString(query.domain),
      status: this.toOptionalString(query.status),
      ...(query.startDate || query.endDate
        ? {
            foundAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [incidents, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: incidentInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: incidents.map((incident) => this.toResponse(incident)),
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

  private validateOptionalDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate.');
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

  private resolveSortBy(value?: string): keyof Prisma.IncidentOrderByWithRelationInput {
    if (value && sortableIncidentFields.has(value)) {
      return value as keyof Prisma.IncidentOrderByWithRelationInput;
    }

    return 'foundAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
