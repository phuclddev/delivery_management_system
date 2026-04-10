import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectAllocation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectAllocationDto } from './dto/create-project-allocation.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { ProjectAllocationQueryDto } from './dto/project-allocation-query.dto';
import { UpdateProjectAllocationDto } from './dto/update-project-allocation.dto';

const allocationDetailInclude = {
  member: {
    select: {
      id: true,
      email: true,
      displayName: true,
      teamId: true,
      team: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
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
} satisfies Prisma.ProjectAllocationInclude;

type AllocationDetail = Prisma.ProjectAllocationGetPayload<{
  include: typeof allocationDetailInclude;
}>;

@Injectable()
export class ProjectAllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectAllocationDto) {
    this.validateAllocationDateRange(payload.startDate, payload.endDate);
    await this.ensureRelations(payload.memberId, payload.projectId);

    const allocation = await this.prisma.projectAllocation.create({
      data: this.toCreateData(payload),
      include: allocationDetailInclude,
    });

    return { data: this.toResponse(allocation) };
  }

  async findAll(query: ProjectAllocationQueryDto) {
    this.validateOptionalDateRange(query.startDate, query.endDate);

    const allocations = await this.prisma.projectAllocation.findMany({
      where: {
        memberId: query.memberId,
        projectId: query.projectId,
        ...(query.startDate && query.endDate
          ? {
              startDate: {
                lte: new Date(query.endDate),
              },
              endDate: {
                gte: new Date(query.startDate),
              },
            }
          : {}),
      },
      include: allocationDetailInclude,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });

    return { data: allocations.map((allocation) => this.toResponse(allocation)) };
  }

  async findOne(id: string) {
    const allocation = await this.prisma.projectAllocation.findUnique({
      where: { id },
      include: allocationDetailInclude,
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation ${id} was not found.`);
    }

    return { data: this.toResponse(allocation) };
  }

  async update(id: string, payload: UpdateProjectAllocationDto) {
    const existing = await this.ensureAllocationExists(id);

    const startDate = payload.startDate ?? existing.startDate.toISOString();
    const endDate = payload.endDate ?? existing.endDate.toISOString();
    this.validateAllocationDateRange(startDate, endDate);

    await this.ensureRelations(
      payload.memberId ?? existing.memberId,
      payload.projectId ?? existing.projectId,
    );

    const allocation = await this.prisma.projectAllocation.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: allocationDetailInclude,
    });

    return { data: this.toResponse(allocation) };
  }

  async remove(id: string) {
    await this.ensureAllocationExists(id);
    await this.prisma.projectAllocation.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  async getWorkloadByMember(memberId: string, query: DateRangeQueryDto) {
    this.validateAllocationDateRange(query.startDate, query.endDate);
    await this.ensureMemberExists(memberId);

    const range = this.toDateRange(query.startDate, query.endDate);
    const allocations = await this.prisma.projectAllocation.findMany({
      where: {
        memberId,
        startDate: {
          lte: range.end,
        },
        endDate: {
          gte: range.start,
        },
      },
      include: allocationDetailInclude,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });

    const totalAllocationPct = allocations.reduce(
      (sum, allocation) => sum + allocation.allocationPct,
      0,
    );
    const totalPlannedMd = allocations.reduce(
      (sum, allocation) => sum + (allocation.plannedMd ?? 0),
      0,
    );
    const totalActualMd = allocations.reduce(
      (sum, allocation) => sum + (allocation.actualMd ?? 0),
      0,
    );

    return {
      data: {
        memberId,
        range,
        summary: {
          allocationCount: allocations.length,
          totalAllocationPct,
          totalPlannedMd,
          totalActualMd,
          overCapacity: totalAllocationPct > 100,
        },
        allocations: allocations.map((allocation) => this.toResponse(allocation)),
      },
    };
  }

  async getTeamUtilization(teamId: string, query: DateRangeQueryDto) {
    this.validateAllocationDateRange(query.startDate, query.endDate);
    await this.ensureTeamExists(teamId);

    const range = this.toDateRange(query.startDate, query.endDate);
    const allocations = await this.prisma.projectAllocation.findMany({
      where: {
        member: {
          teamId,
        },
        startDate: {
          lte: range.end,
        },
        endDate: {
          gte: range.start,
        },
      },
      include: allocationDetailInclude,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });

    const memberMap = new Map<
      string,
      {
        member: AllocationDetail['member'];
        allocationCount: number;
        totalAllocationPct: number;
        totalPlannedMd: number;
        totalActualMd: number;
      }
    >();

    for (const allocation of allocations) {
      const existing = memberMap.get(allocation.member.id) ?? {
        member: allocation.member,
        allocationCount: 0,
        totalAllocationPct: 0,
        totalPlannedMd: 0,
        totalActualMd: 0,
      };

      existing.allocationCount += 1;
      existing.totalAllocationPct += allocation.allocationPct;
      existing.totalPlannedMd += allocation.plannedMd ?? 0;
      existing.totalActualMd += allocation.actualMd ?? 0;
      memberMap.set(allocation.member.id, existing);
    }

    const members = Array.from(memberMap.values()).map((entry) => ({
      member: {
        id: entry.member.id,
        email: entry.member.email,
        displayName: entry.member.displayName,
        team: entry.member.team,
      },
      allocationCount: entry.allocationCount,
      totalAllocationPct: entry.totalAllocationPct,
      totalPlannedMd: entry.totalPlannedMd,
      totalActualMd: entry.totalActualMd,
      overCapacity: entry.totalAllocationPct > 100,
    }));

    const totalAllocationPct = members.reduce(
      (sum, member) => sum + member.totalAllocationPct,
      0,
    );
    const totalPlannedMd = members.reduce(
      (sum, member) => sum + member.totalPlannedMd,
      0,
    );
    const totalActualMd = members.reduce(
      (sum, member) => sum + member.totalActualMd,
      0,
    );

    return {
      data: {
        teamId,
        range,
        summary: {
          memberCount: members.length,
          allocationCount: allocations.length,
          totalAllocationPct,
          averageAllocationPct: members.length > 0 ? totalAllocationPct / members.length : 0,
          totalPlannedMd,
          totalActualMd,
        },
        members,
      },
    };
  }

  private async ensureAllocationExists(id: string): Promise<ProjectAllocation> {
    const allocation = await this.prisma.projectAllocation.findUnique({
      where: { id },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation ${id} was not found.`);
    }

    return allocation;
  }

  private async ensureRelations(memberId: string, projectId: string): Promise<void> {
    await this.ensureMemberExists(memberId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} was not found.`);
    }
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`User ${memberId} was not found.`);
    }
  }

  private async ensureTeamExists(teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} was not found.`);
    }
  }

  private validateOptionalDateRange(startDate?: string, endDate?: string): void {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException('Both startDate and endDate are required together.');
    }

    if (startDate && endDate) {
      this.validateAllocationDateRange(startDate, endDate);
    }
  }

  private validateAllocationDateRange(startDate: string, endDate: string): void {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate.');
    }
  }

  private toDateRange(startDate: string, endDate: string) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  }

  private toCreateData(
    payload: CreateProjectAllocationDto,
  ): Prisma.ProjectAllocationUncheckedCreateInput {
    return {
      memberId: payload.memberId,
      projectId: payload.projectId,
      roleType: payload.roleType,
      allocationPct: payload.allocationPct,
      plannedMd: payload.plannedMd,
      actualMd: payload.actualMd,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      priorityWeight: payload.priorityWeight,
      isPrimary: payload.isPrimary ?? false,
      note: payload.note,
    };
  }

  private toUpdateData(
    payload: UpdateProjectAllocationDto,
  ): Prisma.ProjectAllocationUncheckedUpdateInput {
    return {
      memberId: payload.memberId,
      projectId: payload.projectId,
      roleType: payload.roleType,
      allocationPct: payload.allocationPct,
      plannedMd: payload.plannedMd,
      actualMd: payload.actualMd,
      startDate: payload.startDate ? new Date(payload.startDate) : payload.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : payload.endDate,
      priorityWeight: payload.priorityWeight,
      isPrimary: payload.isPrimary,
      note: payload.note,
    };
  }

  private toResponse(allocation: AllocationDetail) {
    return {
      id: allocation.id,
      member: {
        id: allocation.member.id,
        email: allocation.member.email,
        displayName: allocation.member.displayName,
        team: allocation.member.team,
      },
      project: {
        id: allocation.project.id,
        projectCode: allocation.project.projectCode,
        name: allocation.project.name,
        status: allocation.project.status,
        requesterTeam: allocation.project.requesterTeam,
      },
      roleType: allocation.roleType,
      allocationPct: allocation.allocationPct,
      plannedMd: allocation.plannedMd,
      actualMd: allocation.actualMd,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      priorityWeight: allocation.priorityWeight,
      isPrimary: allocation.isPrimary,
      note: allocation.note,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
    };
  }
}

