import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RequestAssignment,
  RequestAssignmentBeProfile,
  RequestAssignmentFeProfile,
  RequestAssignmentSystemProfile,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestAssignmentBeProfileDto } from './dto/create-request-assignment-be-profile.dto';
import { CreateRequestAssignmentDto } from './dto/create-request-assignment.dto';
import { CreateRequestAssignmentFeProfileDto } from './dto/create-request-assignment-fe-profile.dto';
import { CreateRequestAssignmentSystemProfileDto } from './dto/create-request-assignment-system-profile.dto';
import { RequestAssignmentQueryDto } from './dto/request-assignment-query.dto';
import { UpdateRequestAssignmentBeProfileDto } from './dto/update-request-assignment-be-profile.dto';
import { UpdateRequestAssignmentDto } from './dto/update-request-assignment.dto';
import { UpdateRequestAssignmentFeProfileDto } from './dto/update-request-assignment-fe-profile.dto';
import { UpdateRequestAssignmentSystemProfileDto } from './dto/update-request-assignment-system-profile.dto';

const requestAssignmentInclude = {
  request: {
    select: {
      id: true,
      requestCode: true,
      title: true,
      status: true,
      projectId: true,
    },
  },
  project: {
    select: {
      id: true,
      projectCode: true,
      name: true,
      status: true,
      requesterTeam: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  member: {
    select: {
      id: true,
      email: true,
      displayName: true,
      team: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  feProfile: true,
  beProfile: true,
  systemProfile: true,
} satisfies Prisma.RequestAssignmentInclude;

type RequestAssignmentDetail = Prisma.RequestAssignmentGetPayload<{
  include: typeof requestAssignmentInclude;
}>;

const sortableRequestAssignmentFields = new Set([
  'createdAt',
  'updatedAt',
  'roleType',
  'workType',
  'uncertaintyLevel',
  'status',
  'startDate',
  'endDate',
]);

@Injectable()
export class RequestAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateRequestAssignmentDto) {
    this.validateOptionalDateRange(payload.startDate, payload.endDate);
    await this.ensureAssignmentRelations(payload.requestId, payload.projectId, payload.memberId);

    const assignment = await this.prisma.requestAssignment.create({
      data: this.toCreateData(payload),
      include: requestAssignmentInclude,
    });

    return { data: this.toResponse(assignment) };
  }

  async findAll(query: RequestAssignmentQueryDto) {
    this.validateOptionalDateRange(query.startDate, query.endDate);
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.RequestAssignmentWhereInput = {
      requestId: this.toOptionalString(query.requestId),
      projectId: this.toOptionalString(query.projectId),
      memberId: this.toOptionalString(query.memberId),
      roleType: this.toOptionalString(query.roleType),
      workType: this.toOptionalString(query.workType),
      uncertaintyLevel: this.toOptionalInt(query.uncertaintyLevel),
      status: this.toOptionalString(query.status),
      ...(query.startDate && query.endDate
        ? {
            OR: [
              {
                startDate: {
                  lte: new Date(query.endDate),
                },
                endDate: {
                  gte: new Date(query.startDate),
                },
              },
              {
                startDate: null,
              },
              {
                endDate: null,
              },
            ],
          }
        : {}),
    };

    const [assignments, total] = await this.prisma.$transaction([
      this.prisma.requestAssignment.findMany({
        where,
        include: requestAssignmentInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.requestAssignment.count({ where }),
    ]);

    return {
      data: assignments.map((assignment) => this.toResponse(assignment)),
      meta: {
        page,
        pageSize,
        total,
        sortBy,
        sortOrder,
      },
    };
  }

  async findByRequest(requestId: string, query: RequestAssignmentQueryDto) {
    await this.ensureRequestExists(requestId);
    return this.findAll({ ...query, requestId });
  }

  async findByProject(projectId: string, query: RequestAssignmentQueryDto) {
    await this.ensureProjectExists(projectId);
    return this.findAll({ ...query, projectId });
  }

  async findByMember(memberId: string, query: RequestAssignmentQueryDto) {
    await this.ensureMemberExists(memberId);
    return this.findAll({ ...query, memberId });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.requestAssignment.findUnique({
      where: { id },
      include: requestAssignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException(`Request assignment ${id} was not found.`);
    }

    return { data: this.toResponse(assignment) };
  }

  async update(id: string, payload: UpdateRequestAssignmentDto) {
    const existing = await this.ensureAssignmentExists(id);
    const startDate =
      payload.startDate === undefined ? existing.startDate?.toISOString() : payload.startDate;
    const endDate =
      payload.endDate === undefined ? existing.endDate?.toISOString() : payload.endDate;

    this.validateOptionalDateRange(startDate, endDate);
    await this.ensureAssignmentRelations(
      payload.requestId ?? existing.requestId,
      payload.projectId ?? existing.projectId,
      payload.memberId ?? existing.memberId,
    );

    const assignment = await this.prisma.requestAssignment.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: requestAssignmentInclude,
    });

    return { data: this.toResponse(assignment) };
  }

  async remove(id: string) {
    await this.ensureAssignmentExists(id);
    await this.prisma.requestAssignment.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  async createFeProfile(
    assignmentId: string,
    payload: CreateRequestAssignmentFeProfileDto,
  ) {
    const assignment = await this.ensureAssignmentExists(assignmentId);

    if (assignment.feProfile) {
      throw new ConflictException(`Assignment ${assignmentId} already has a FE profile.`);
    }

    if (assignment.beProfile || assignment.systemProfile) {
      throw new ConflictException(
        `Assignment ${assignmentId} already has another complexity profile. Only one complexity profile is allowed.`,
      );
    }

    this.ensureWorkTypeAllowsProfile(assignment.workType, 'frontend', assignmentId);

    const profile = await this.prisma.requestAssignmentFeProfile.create({
      data: this.toCreateFeProfileData(assignmentId, payload),
    });

    return { data: this.toFeProfileResponse(profile) };
  }

  async getFeProfile(assignmentId: string) {
    await this.ensureAssignmentExists(assignmentId);
    const profile = await this.prisma.requestAssignmentFeProfile.findUnique({
      where: { assignmentId },
    });

    if (!profile) {
      throw new NotFoundException(`FE profile for assignment ${assignmentId} was not found.`);
    }

    return { data: this.toFeProfileResponse(profile) };
  }

  async updateFeProfile(
    assignmentId: string,
    payload: UpdateRequestAssignmentFeProfileDto,
  ) {
    await this.ensureAssignmentExists(assignmentId);
    const existing = await this.prisma.requestAssignmentFeProfile.findUnique({
      where: { assignmentId },
    });

    if (!existing) {
      throw new NotFoundException(`FE profile for assignment ${assignmentId} was not found.`);
    }

    const profile = await this.prisma.requestAssignmentFeProfile.update({
      where: { assignmentId },
      data: this.toUpdateFeProfileData(payload),
    });

    return { data: this.toFeProfileResponse(profile) };
  }

  async createBeProfile(
    assignmentId: string,
    payload: CreateRequestAssignmentBeProfileDto,
  ) {
    const assignment = await this.ensureAssignmentExists(assignmentId);

    if (assignment.beProfile) {
      throw new ConflictException(`Assignment ${assignmentId} already has a BE profile.`);
    }

    if (assignment.feProfile || assignment.systemProfile) {
      throw new ConflictException(
        `Assignment ${assignmentId} already has another complexity profile. Only one complexity profile is allowed.`,
      );
    }

    this.ensureWorkTypeAllowsProfile(assignment.workType, 'backend', assignmentId);

    const profile = await this.prisma.requestAssignmentBeProfile.create({
      data: this.toCreateBeProfileData(assignmentId, payload),
    });

    return { data: this.toBeProfileResponse(profile) };
  }

  async getBeProfile(assignmentId: string) {
    await this.ensureAssignmentExists(assignmentId);
    const profile = await this.prisma.requestAssignmentBeProfile.findUnique({
      where: { assignmentId },
    });

    if (!profile) {
      throw new NotFoundException(`BE profile for assignment ${assignmentId} was not found.`);
    }

    return { data: this.toBeProfileResponse(profile) };
  }

  async updateBeProfile(
    assignmentId: string,
    payload: UpdateRequestAssignmentBeProfileDto,
  ) {
    await this.ensureAssignmentExists(assignmentId);
    const existing = await this.prisma.requestAssignmentBeProfile.findUnique({
      where: { assignmentId },
    });

    if (!existing) {
      throw new NotFoundException(`BE profile for assignment ${assignmentId} was not found.`);
    }

    const profile = await this.prisma.requestAssignmentBeProfile.update({
      where: { assignmentId },
      data: this.toUpdateBeProfileData(payload),
    });

    return { data: this.toBeProfileResponse(profile) };
  }

  async createSystemProfile(
    assignmentId: string,
    payload: CreateRequestAssignmentSystemProfileDto,
  ) {
    const assignment = await this.ensureAssignmentExists(assignmentId);

    if (assignment.systemProfile) {
      throw new ConflictException(`Assignment ${assignmentId} already has a system profile.`);
    }

    if (assignment.feProfile || assignment.beProfile) {
      throw new ConflictException(
        `Assignment ${assignmentId} already has another complexity profile. Only one complexity profile is allowed.`,
      );
    }

    this.ensureWorkTypeAllowsProfile(assignment.workType, 'system', assignmentId);

    const profile = await this.prisma.requestAssignmentSystemProfile.create({
      data: this.toCreateSystemProfileData(assignmentId, payload),
    });

    return { data: this.toSystemProfileResponse(profile) };
  }

  async getSystemProfile(assignmentId: string) {
    await this.ensureAssignmentExists(assignmentId);
    const profile = await this.prisma.requestAssignmentSystemProfile.findUnique({
      where: { assignmentId },
    });

    if (!profile) {
      throw new NotFoundException(`System profile for assignment ${assignmentId} was not found.`);
    }

    return { data: this.toSystemProfileResponse(profile) };
  }

  async updateSystemProfile(
    assignmentId: string,
    payload: UpdateRequestAssignmentSystemProfileDto,
  ) {
    await this.ensureAssignmentExists(assignmentId);
    const existing = await this.prisma.requestAssignmentSystemProfile.findUnique({
      where: { assignmentId },
    });

    if (!existing) {
      throw new NotFoundException(`System profile for assignment ${assignmentId} was not found.`);
    }

    const profile = await this.prisma.requestAssignmentSystemProfile.update({
      where: { assignmentId },
      data: this.toUpdateSystemProfileData(payload),
    });

    return { data: this.toSystemProfileResponse(profile) };
  }

  private validateOptionalDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate.');
    }
  }

  private async ensureRequestExists(requestId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }

    return request;
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} was not found.`);
    }

    return project;
  }

  private async ensureMemberExists(memberId: string) {
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`User ${memberId} was not found.`);
    }

    return member;
  }

  private async ensureAssignmentExists(id: string): Promise<RequestAssignmentDetail> {
    const assignment = await this.prisma.requestAssignment.findUnique({
      where: { id },
      include: requestAssignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException(`Request assignment ${id} was not found.`);
    }

    return assignment;
  }

  private async ensureAssignmentRelations(
    requestId: string,
    projectId: string,
    memberId: string,
  ) {
    const [request, project] = await Promise.all([
      this.prisma.request.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          projectId: true,
        },
      }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      }),
    ]);

    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }

    if (!project) {
      throw new NotFoundException(`Project ${projectId} was not found.`);
    }

    await this.ensureMemberExists(memberId);

    const linkedProjectId = request.projectId ?? null;
    if (linkedProjectId && linkedProjectId !== projectId) {
      throw new ConflictException(
        `Request ${requestId} belongs to project ${linkedProjectId}, not ${projectId}.`,
      );
    }
  }

  private ensureWorkTypeAllowsProfile(
    workType: string | null | undefined,
    expectedWorkType: 'frontend' | 'backend' | 'system',
    assignmentId: string,
  ) {
    if (!workType) {
      return;
    }

    if (workType.toLowerCase() !== expectedWorkType) {
      throw new ConflictException(
        `Assignment ${assignmentId} has workType ${workType}. It cannot use a ${expectedWorkType} profile.`,
      );
    }
  }

  private toCreateData(
    payload: CreateRequestAssignmentDto,
  ): Prisma.RequestAssignmentUncheckedCreateInput {
    return {
      requestId: payload.requestId,
      projectId: payload.projectId,
      memberId: payload.memberId,
      roleType: payload.roleType,
      workType: payload.workType,
      uncertaintyLevel: payload.uncertaintyLevel,
      plannedMd: payload.plannedMd,
      actualMd: payload.actualMd,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      status: payload.status,
      note: payload.note,
    };
  }

  private toUpdateData(
    payload: UpdateRequestAssignmentDto,
  ): Prisma.RequestAssignmentUncheckedUpdateInput {
    return {
      requestId: payload.requestId,
      projectId: payload.projectId,
      memberId: payload.memberId,
      roleType: payload.roleType,
      workType: payload.workType,
      uncertaintyLevel: payload.uncertaintyLevel,
      plannedMd: payload.plannedMd,
      actualMd: payload.actualMd,
      startDate: payload.startDate ? new Date(payload.startDate) : payload.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : payload.endDate,
      status: payload.status,
      note: payload.note,
    };
  }

  private toCreateFeProfileData(
    assignmentId: string,
    payload: CreateRequestAssignmentFeProfileDto,
  ): Prisma.RequestAssignmentFeProfileUncheckedCreateInput {
    return {
      assignmentId,
      screensViews: payload.screensViews,
      layoutComplexity: payload.layoutComplexity,
      componentReuse: payload.componentReuse,
      responsive: payload.responsive,
      animationLevel: payload.animationLevel,
      userActions: payload.userActions,
      userActionsList: payload.userActionsList,
      apiComplexity: payload.apiComplexity,
      clientSideLogic: payload.clientSideLogic,
      heavyAssets: payload.heavyAssets,
      uiClarity: payload.uiClarity,
      specChangeRisk: payload.specChangeRisk,
      deviceSupport: payload.deviceSupport,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toUpdateFeProfileData(
    payload: UpdateRequestAssignmentFeProfileDto,
  ): Prisma.RequestAssignmentFeProfileUncheckedUpdateInput {
    return {
      screensViews: payload.screensViews,
      layoutComplexity: payload.layoutComplexity,
      componentReuse: payload.componentReuse,
      responsive: payload.responsive,
      animationLevel: payload.animationLevel,
      userActions: payload.userActions,
      userActionsList: payload.userActionsList,
      apiComplexity: payload.apiComplexity,
      clientSideLogic: payload.clientSideLogic,
      heavyAssets: payload.heavyAssets,
      uiClarity: payload.uiClarity,
      specChangeRisk: payload.specChangeRisk,
      deviceSupport: payload.deviceSupport,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toCreateBeProfileData(
    assignmentId: string,
    payload: CreateRequestAssignmentBeProfileDto,
  ): Prisma.RequestAssignmentBeProfileUncheckedCreateInput {
    return {
      assignmentId,
      userActions: payload.userActions,
      businessLogicComplexity: payload.businessLogicComplexity,
      dbTables: payload.dbTables,
      apis: payload.apis,
      requirementClarity: payload.requirementClarity,
      changeFrequency: payload.changeFrequency,
      realtime: payload.realtime,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toUpdateBeProfileData(
    payload: UpdateRequestAssignmentBeProfileDto,
  ): Prisma.RequestAssignmentBeProfileUncheckedUpdateInput {
    return {
      userActions: payload.userActions,
      businessLogicComplexity: payload.businessLogicComplexity,
      dbTables: payload.dbTables,
      apis: payload.apis,
      requirementClarity: payload.requirementClarity,
      changeFrequency: payload.changeFrequency,
      realtime: payload.realtime,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toCreateSystemProfileData(
    assignmentId: string,
    payload: CreateRequestAssignmentSystemProfileDto,
  ): Prisma.RequestAssignmentSystemProfileUncheckedCreateInput {
    return {
      assignmentId,
      domainComplexity: payload.domainComplexity,
      integrationCount: payload.integrationCount,
      dependencyLevel: payload.dependencyLevel,
      requirementClarity: payload.requirementClarity,
      unknownFactor: payload.unknownFactor,
      dataVolume: payload.dataVolume,
      scalabilityRequirement: payload.scalabilityRequirement,
      securityRequirement: payload.securityRequirement,
      externalApiComplexity: payload.externalApiComplexity,
      changeFrequency: payload.changeFrequency,
      testingComplexity: payload.testingComplexity,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toUpdateSystemProfileData(
    payload: UpdateRequestAssignmentSystemProfileDto,
  ): Prisma.RequestAssignmentSystemProfileUncheckedUpdateInput {
    return {
      domainComplexity: payload.domainComplexity,
      integrationCount: payload.integrationCount,
      dependencyLevel: payload.dependencyLevel,
      requirementClarity: payload.requirementClarity,
      unknownFactor: payload.unknownFactor,
      dataVolume: payload.dataVolume,
      scalabilityRequirement: payload.scalabilityRequirement,
      securityRequirement: payload.securityRequirement,
      externalApiComplexity: payload.externalApiComplexity,
      changeFrequency: payload.changeFrequency,
      testingComplexity: payload.testingComplexity,
      timelinePressure: payload.timelinePressure,
      note: payload.note,
    };
  }

  private toResponse(assignment: RequestAssignmentDetail) {
    return {
      id: assignment.id,
      request: {
        id: assignment.request.id,
        requestCode: assignment.request.requestCode,
        title: assignment.request.title,
        status: assignment.request.status,
      },
      project: {
        id: assignment.project.id,
        projectCode: assignment.project.projectCode,
        name: assignment.project.name,
        status: assignment.project.status,
        requesterTeam: assignment.project.requesterTeam,
      },
      member: assignment.member,
      roleType: assignment.roleType,
      workType: assignment.workType,
      uncertaintyLevel: assignment.uncertaintyLevel,
      plannedMd: assignment.plannedMd,
      actualMd: assignment.actualMd,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      status: assignment.status,
      note: assignment.note,
      feProfile: assignment.feProfile ? this.toFeProfileResponse(assignment.feProfile) : null,
      beProfile: assignment.beProfile ? this.toBeProfileResponse(assignment.beProfile) : null,
      systemProfile: assignment.systemProfile
        ? this.toSystemProfileResponse(assignment.systemProfile)
        : null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  private toFeProfileResponse(profile: RequestAssignmentFeProfile) {
    return {
      assignmentId: profile.assignmentId,
      screensViews: profile.screensViews,
      layoutComplexity: profile.layoutComplexity,
      componentReuse: profile.componentReuse,
      responsive: profile.responsive,
      animationLevel: profile.animationLevel,
      userActions: profile.userActions,
      userActionsList: profile.userActionsList,
      apiComplexity: profile.apiComplexity,
      clientSideLogic: profile.clientSideLogic,
      heavyAssets: profile.heavyAssets,
      uiClarity: profile.uiClarity,
      specChangeRisk: profile.specChangeRisk,
      deviceSupport: profile.deviceSupport,
      timelinePressure: profile.timelinePressure,
      note: profile.note,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toBeProfileResponse(profile: RequestAssignmentBeProfile) {
    return {
      assignmentId: profile.assignmentId,
      userActions: profile.userActions,
      businessLogicComplexity: profile.businessLogicComplexity,
      dbTables: profile.dbTables,
      apis: profile.apis,
      requirementClarity: profile.requirementClarity,
      changeFrequency: profile.changeFrequency,
      realtime: profile.realtime,
      timelinePressure: profile.timelinePressure,
      note: profile.note,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toSystemProfileResponse(profile: RequestAssignmentSystemProfile) {
    return {
      assignmentId: profile.assignmentId,
      domainComplexity: profile.domainComplexity,
      integrationCount: profile.integrationCount,
      dependencyLevel: profile.dependencyLevel,
      requirementClarity: profile.requirementClarity,
      unknownFactor: profile.unknownFactor,
      dataVolume: profile.dataVolume,
      scalabilityRequirement: profile.scalabilityRequirement,
      securityRequirement: profile.securityRequirement,
      externalApiComplexity: profile.externalApiComplexity,
      changeFrequency: profile.changeFrequency,
      testingComplexity: profile.testingComplexity,
      timelinePressure: profile.timelinePressure,
      note: profile.note,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private toOptionalInt(value?: string): number | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
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

  private resolveSortBy(value?: string): keyof Prisma.RequestAssignmentOrderByWithRelationInput {
    if (value && sortableRequestAssignmentFields.has(value)) {
      return value as keyof Prisma.RequestAssignmentOrderByWithRelationInput;
    }

    return 'createdAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
