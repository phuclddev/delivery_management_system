import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectEventDto } from './dto/create-project-event.dto';
import { ProjectEventQueryDto } from './dto/project-event-query.dto';
import { UpdateProjectEventDto } from './dto/update-project-event.dto';

const projectEventInclude = {
  project: {
    select: {
      id: true,
      projectCode: true,
      name: true,
      status: true,
    },
  },
  request: {
    select: {
      id: true,
      requestCode: true,
      title: true,
      status: true,
    },
  },
  actorUser: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.ProjectEventInclude;

type ProjectEventDetail = Prisma.ProjectEventGetPayload<{
  include: typeof projectEventInclude;
}>;

const sortableProjectEventFields = new Set([
  'eventAt',
  'createdAt',
  'updatedAt',
  'eventType',
  'eventTitle',
]);

@Injectable()
export class ProjectEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectEventDto) {
    await this.ensureRelations(payload.projectId, payload.requestId, payload.actorUserId);

    const event = await this.prisma.projectEvent.create({
      data: this.toCreateData(payload),
      include: projectEventInclude,
    });

    return { data: this.toResponse(event) };
  }

  async findAll(query: ProjectEventQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.ProjectEventWhereInput = {
      projectId: this.toOptionalString(query.projectId),
      requestId: this.toOptionalString(query.requestId),
      eventType: this.toOptionalString(query.eventType),
      actorUserId: this.toOptionalString(query.actorUserId),
      sourceType: this.toOptionalString(query.sourceType),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.projectEvent.findMany({
        where,
        include: projectEventInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projectEvent.count({ where }),
    ]);

    return {
      data: events.map((event) => this.toResponse(event)),
      meta: {
        page,
        pageSize,
        total,
        sortBy,
        sortOrder,
      },
    };
  }

  async findByProject(projectId: string, query: ProjectEventQueryDto) {
    await this.ensureProjectExists(projectId);
    return this.findAll({ ...query, projectId });
  }

  async findByRequest(requestId: string, query: ProjectEventQueryDto) {
    await this.ensureRequestExists(requestId);
    return this.findAll({ ...query, requestId });
  }

  async findOne(id: string) {
    const event = await this.prisma.projectEvent.findUnique({
      where: { id },
      include: projectEventInclude,
    });

    if (!event) {
      throw new NotFoundException(`Project event ${id} was not found.`);
    }

    return { data: this.toResponse(event) };
  }

  async update(id: string, payload: UpdateProjectEventDto) {
    const existing = await this.ensureEventExists(id);

    await this.ensureRelations(
      payload.projectId ?? existing.projectId,
      payload.requestId === undefined ? existing.requestId ?? undefined : payload.requestId,
      payload.actorUserId === undefined ? existing.actorUserId ?? undefined : payload.actorUserId,
    );

    const event = await this.prisma.projectEvent.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: projectEventInclude,
    });

    return { data: this.toResponse(event) };
  }

  async remove(id: string) {
    await this.ensureEventExists(id);
    await this.prisma.projectEvent.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  private async ensureEventExists(id: string): Promise<ProjectEvent> {
    const event = await this.prisma.projectEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Project event ${id} was not found.`);
    }

    return event;
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} was not found.`);
    }
  }

  private async ensureRequestExists(requestId: string): Promise<void> {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }
  }

  private async ensureActorExists(actorUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!user) {
      throw new NotFoundException(`User ${actorUserId} was not found.`);
    }
  }

  private async ensureRelations(
    projectId: string,
    requestId?: string,
    actorUserId?: string,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);

    if (requestId) {
      const request = await this.prisma.request.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          projectId: true,
        },
      });

      if (!request) {
        throw new NotFoundException(`Request ${requestId} was not found.`);
      }

      if (request.projectId && request.projectId !== projectId) {
        throw new ConflictException(
          `Request ${requestId} belongs to project ${request.projectId}, not ${projectId}.`,
        );
      }
    }

    if (actorUserId) {
      await this.ensureActorExists(actorUserId);
    }
  }

  private toCreateData(
    payload: CreateProjectEventDto,
  ): Prisma.ProjectEventUncheckedCreateInput {
    return {
      projectId: payload.projectId,
      requestId: payload.requestId,
      eventType: payload.eventType,
      eventTitle: payload.eventTitle,
      eventDescription: payload.eventDescription,
      eventAt: new Date(payload.eventAt),
      actorUserId: payload.actorUserId,
      sourceType: payload.sourceType,
      metadataJson: payload.metadataJson as Prisma.InputJsonValue | undefined,
    };
  }

  private toUpdateData(
    payload: UpdateProjectEventDto,
  ): Prisma.ProjectEventUncheckedUpdateInput {
    return {
      projectId: payload.projectId,
      requestId: payload.requestId,
      eventType: payload.eventType,
      eventTitle: payload.eventTitle,
      eventDescription: payload.eventDescription,
      eventAt: payload.eventAt ? new Date(payload.eventAt) : payload.eventAt,
      actorUserId: payload.actorUserId,
      sourceType: payload.sourceType,
      metadataJson: payload.metadataJson as Prisma.InputJsonValue | undefined,
    };
  }

  private toResponse(event: ProjectEventDetail) {
    return {
      id: event.id,
      project: event.project,
      request: event.request,
      eventType: event.eventType,
      eventTitle: event.eventTitle,
      eventDescription: event.eventDescription,
      eventAt: event.eventAt,
      actorUser: event.actorUser,
      sourceType: event.sourceType,
      metadataJson: event.metadataJson,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
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

  private resolveSortBy(value?: string): keyof Prisma.ProjectEventOrderByWithRelationInput {
    if (value && sortableProjectEventFields.has(value)) {
      return value as keyof Prisma.ProjectEventOrderByWithRelationInput;
    }

    return 'eventAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
