import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Request } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

const requestDetailInclude = {
  requesterTeam: true,
  project: {
    select: {
      id: true,
      projectCode: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.RequestInclude;

type RequestDetail = Prisma.RequestGetPayload<{
  include: typeof requestDetailInclude;
}>;

const sortableRequestFields = new Set([
  'createdAt',
  'desiredLiveDate',
  'priority',
  'status',
  'title',
  'requestCode',
]);

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateRequestDto, authenticatedUser: AuthenticatedUser) {
    await this.ensureTeamExists(payload.requesterTeamId);
    await this.ensureLinkedProjectExists(payload.projectId);

    let request: RequestDetail;

    try {
      request = await this.prisma.request.create({
        data: this.toCreateRequestData(payload, authenticatedUser.userId),
        include: requestDetailInclude,
      });
    } catch (error) {
      this.handleWriteError(error, payload.requestCode);
    }

    return { data: this.toResponse(request) };
  }

  async findAll(query: RequestQueryDto, authenticatedUser: AuthenticatedUser) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);
    const where: Prisma.RequestWhereInput = {
      ...this.buildReadAccessWhere(authenticatedUser),
      status: this.toOptionalString(query.status),
      priority: this.toOptionalString(query.priority),
      requestType: this.toOptionalString(query.requestType),
      requesterTeamId: this.toOptionalString(query.teamId),
      projectId: this.toOptionalString(query.projectId),
    };

    this.logger.debug(
      `Listing requests with filters=${JSON.stringify(where)}, page=${page}, pageSize=${pageSize}, sortBy=${sortBy}, sortOrder=${sortOrder}.`,
    );

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where,
        include: requestDetailInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      data: requests.map((request) => this.toResponse(request)),
      meta: {
        page,
        pageSize,
        total,
        sortBy,
        sortOrder,
      },
    };
  }

  async findOne(id: string, authenticatedUser: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: requestDetailInclude,
    });

    if (!request || !this.canReadRequest(authenticatedUser, request)) {
      throw new NotFoundException(`Request ${id} was not found.`);
    }

    return { data: this.toResponse(request) };
  }

  async update(id: string, payload: UpdateRequestDto, authenticatedUser: AuthenticatedUser) {
    const existingRequest = await this.ensureRequestExists(id);
    this.ensureCanUpdateRequest(authenticatedUser, existingRequest);

    if (payload.requesterTeamId) {
      await this.ensureTeamExists(payload.requesterTeamId);
    }
    await this.ensureLinkedProjectExists(payload.projectId);

    let request: RequestDetail;

    try {
      request = await this.prisma.request.update({
        where: { id },
        data: this.toUpdateRequestData(payload),
        include: requestDetailInclude,
      });
    } catch (error) {
      this.handleWriteError(error, payload.requestCode);
    }

    return { data: this.toResponse(request) };
  }

  async remove(id: string) {
    await this.ensureRequestExists(id);
    await this.prisma.request.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  private async ensureRequestExists(id: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Request ${id} was not found.`);
    }

    return request;
  }

  private buildReadAccessWhere(authenticatedUser: AuthenticatedUser): Prisma.RequestWhereInput {
    if (this.isRequesterScopedUser(authenticatedUser)) {
      return {
        ownerUserId: authenticatedUser.userId,
      };
    }

    if (this.hasPermission(authenticatedUser, 'requests:view')) {
      return {};
    }

    if (this.hasPermission(authenticatedUser, 'requests:view_own')) {
      return {
        ownerUserId: authenticatedUser.userId,
      };
    }

    return {
      id: '__forbidden__',
    };
  }

  private canReadRequest(
    authenticatedUser: AuthenticatedUser,
    request: Pick<Request, 'ownerUserId'>,
  ): boolean {
    if (this.isRequesterScopedUser(authenticatedUser)) {
      return request.ownerUserId === authenticatedUser.userId;
    }

    if (this.hasPermission(authenticatedUser, 'requests:view')) {
      return true;
    }

    if (this.hasPermission(authenticatedUser, 'requests:view_own')) {
      return request.ownerUserId === authenticatedUser.userId;
    }

    return false;
  }

  private ensureCanUpdateRequest(
    authenticatedUser: AuthenticatedUser,
    request: Pick<Request, 'id' | 'ownerUserId'>,
  ): void {
    if (this.isRequesterScopedUser(authenticatedUser)) {
      if (request.ownerUserId === authenticatedUser.userId) {
        return;
      }

      this.logger.warn(
        `Rejected request update for requester ${authenticatedUser.email} on request ${request.id} because the request is owned by another user.`,
      );
      throw new NotFoundException(`Request ${request.id} was not found.`);
    }

    if (this.hasPermission(authenticatedUser, 'requests:update')) {
      return;
    }

    if (
      this.hasPermission(authenticatedUser, 'requests:update_own') &&
      request.ownerUserId === authenticatedUser.userId
    ) {
      return;
    }

    this.logger.warn(
      `Rejected request update for user ${authenticatedUser.email} on request ${request.id} because the request is outside the caller scope.`,
    );
    throw new NotFoundException(`Request ${request.id} was not found.`);
  }

  private hasPermission(authenticatedUser: AuthenticatedUser, permission: string): boolean {
    if (
      authenticatedUser.roles?.includes('super_admin') ||
      authenticatedUser.roles?.includes('admin')
    ) {
      return true;
    }

    return (authenticatedUser.permissions ?? []).includes(permission);
  }

  private isRequesterScopedUser(authenticatedUser: AuthenticatedUser): boolean {
    const roles = authenticatedUser.roles ?? [];

    if (!roles.includes('requester')) {
      return false;
    }

    return !this.isElevatedRole(authenticatedUser);
  }

  private isElevatedRole(authenticatedUser: AuthenticatedUser): boolean {
    const roles = authenticatedUser.roles ?? [];

    return (
      roles.includes('super_admin') ||
      roles.includes('admin') ||
      roles.includes('pm')
    );
  }

  private handleWriteError(error: unknown, requestCode?: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `Request code ${requestCode ?? 'value'} already exists.`,
      );
    }

    throw error;
  }

  private async ensureTeamExists(teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} was not found.`);
    }
  }

  private async ensureLinkedProjectExists(projectId?: string): Promise<void> {
    if (!projectId) {
      return;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} was not found.`);
    }
  }

  private toCreateRequestData(
    payload: CreateRequestDto,
    ownerUserId: string,
  ): Prisma.RequestUncheckedCreateInput {
    return {
      requestCode: payload.requestCode,
      projectId: payload.projectId,
      ownerUserId,
      title: payload.title,
      requesterTeamId: payload.requesterTeamId,
      campaignName: payload.campaignName,
      requestType: payload.requestType,
      scopeType: payload.scopeType,
      priority: payload.priority,
      desiredLiveDate: payload.desiredLiveDate ? new Date(payload.desiredLiveDate) : payload.desiredLiveDate,
      brief: payload.brief,
      status: payload.status,
      backendStartDate: payload.backendStartDate ? new Date(payload.backendStartDate) : payload.backendStartDate,
      backendEndDate: payload.backendEndDate ? new Date(payload.backendEndDate) : payload.backendEndDate,
      frontendStartDate: payload.frontendStartDate ? new Date(payload.frontendStartDate) : payload.frontendStartDate,
      frontendEndDate: payload.frontendEndDate ? new Date(payload.frontendEndDate) : payload.frontendEndDate,
      businessValueScore: payload.businessValueScore,
      userImpactScore: payload.userImpactScore,
      urgencyScore: payload.urgencyScore,
      valueNote: payload.valueNote,
      comment: payload.comment,
    };
  }

  private toUpdateRequestData(
    payload: UpdateRequestDto,
  ): Prisma.RequestUncheckedUpdateInput {
    return {
      requestCode: payload.requestCode,
      projectId: payload.projectId,
      title: payload.title,
      requesterTeamId: payload.requesterTeamId,
      campaignName: payload.campaignName,
      requestType: payload.requestType,
      scopeType: payload.scopeType,
      priority: payload.priority,
      desiredLiveDate: payload.desiredLiveDate ? new Date(payload.desiredLiveDate) : payload.desiredLiveDate,
      brief: payload.brief,
      status: payload.status,
      backendStartDate: payload.backendStartDate ? new Date(payload.backendStartDate) : payload.backendStartDate,
      backendEndDate: payload.backendEndDate ? new Date(payload.backendEndDate) : payload.backendEndDate,
      frontendStartDate: payload.frontendStartDate ? new Date(payload.frontendStartDate) : payload.frontendStartDate,
      frontendEndDate: payload.frontendEndDate ? new Date(payload.frontendEndDate) : payload.frontendEndDate,
      businessValueScore: payload.businessValueScore,
      userImpactScore: payload.userImpactScore,
      urgencyScore: payload.urgencyScore,
      valueNote: payload.valueNote,
      comment: payload.comment,
    };
  }

  private toResponse(request: RequestDetail) {
    return {
      id: request.id,
      requestCode: request.requestCode,
      title: request.title,
      requesterTeam: {
        id: request.requesterTeam.id,
        code: request.requesterTeam.code,
        name: request.requesterTeam.name,
      },
      campaignName: request.campaignName,
      requestType: request.requestType,
      scopeType: request.scopeType,
      priority: request.priority,
      desiredLiveDate: request.desiredLiveDate,
      brief: request.brief,
      status: request.status,
      backendStartDate: request.backendStartDate,
      backendEndDate: request.backendEndDate,
      frontendStartDate: request.frontendStartDate,
      frontendEndDate: request.frontendEndDate,
      businessValueScore: request.businessValueScore,
      userImpactScore: request.userImpactScore,
      urgencyScore: request.urgencyScore,
      valueNote: request.valueNote,
      comment: request.comment,
      projectId: request.projectId,
      project: request.project,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
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

  private resolveSortBy(value?: string): keyof Prisma.RequestOrderByWithRelationInput {
    if (value && sortableRequestFields.has(value)) {
      return value as keyof Prisma.RequestOrderByWithRelationInput;
    }

    return 'createdAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
