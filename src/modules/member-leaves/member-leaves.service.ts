import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberLeave, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberLeaveDto } from './dto/create-member-leave.dto';
import { MemberLeaveQueryDto } from './dto/member-leave-query.dto';
import { UpdateMemberLeaveDto } from './dto/update-member-leave.dto';

const leaveInclude = {
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
} satisfies Prisma.MemberLeaveInclude;

type LeaveDetail = Prisma.MemberLeaveGetPayload<{
  include: typeof leaveInclude;
}>;

const sortableLeaveFields = new Set([
  'startDate',
  'endDate',
  'createdAt',
  'updatedAt',
  'leaveType',
]);

@Injectable()
export class MemberLeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateMemberLeaveDto) {
    this.validateDateRange(payload.startDate, payload.endDate);
    await this.ensureMemberExists(payload.memberId);

    const leave = await this.prisma.memberLeave.create({
      data: this.toCreateData(payload),
      include: leaveInclude,
    });

    return { data: this.toResponse(leave) };
  }

  async findAll(query: MemberLeaveQueryDto) {
    this.validateOptionalDateRange(query.startDate, query.endDate);
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.MemberLeaveWhereInput = {
      memberId: this.toOptionalString(query.memberId),
      leaveType: this.toOptionalString(query.leaveType),
      ...(query.startDate || query.endDate
        ? {
            ...(query.startDate ? { endDate: { gte: new Date(query.startDate) } } : {}),
            ...(query.endDate ? { startDate: { lte: new Date(query.endDate) } } : {}),
          }
        : {}),
    };

    const [leaves, total] = await this.prisma.$transaction([
      this.prisma.memberLeave.findMany({
        where,
        include: leaveInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.memberLeave.count({ where }),
    ]);

    return {
      data: leaves.map((leave) => this.toResponse(leave)),
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
    const leave = await this.prisma.memberLeave.findUnique({
      where: { id },
      include: leaveInclude,
    });

    if (!leave) {
      throw new NotFoundException(`Leave ${id} was not found.`);
    }

    return { data: this.toResponse(leave) };
  }

  async update(id: string, payload: UpdateMemberLeaveDto) {
    const existing = await this.ensureLeaveExists(id);
    const startDate = payload.startDate ?? existing.startDate.toISOString();
    const endDate = payload.endDate ?? existing.endDate.toISOString();

    this.validateDateRange(startDate, endDate);
    if (payload.memberId) {
      await this.ensureMemberExists(payload.memberId);
    }

    const leave = await this.prisma.memberLeave.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: leaveInclude,
    });

    return { data: this.toResponse(leave) };
  }

  async remove(id: string) {
    await this.ensureLeaveExists(id);
    await this.prisma.memberLeave.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  private validateDateRange(startDate: string, endDate: string) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate.');
    }
  }

  private validateOptionalDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
      return;
    }

    this.validateDateRange(startDate, endDate);
  }

  private async ensureMemberExists(memberId: string) {
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException(`User ${memberId} was not found.`);
    }
  }

  private async ensureLeaveExists(id: string): Promise<MemberLeave> {
    const leave = await this.prisma.memberLeave.findUnique({ where: { id } });
    if (!leave) {
      throw new NotFoundException(`Leave ${id} was not found.`);
    }
    return leave;
  }

  private toCreateData(payload: CreateMemberLeaveDto): Prisma.MemberLeaveUncheckedCreateInput {
    return {
      memberId: payload.memberId,
      leaveType: payload.leaveType,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      note: payload.note,
    };
  }

  private toUpdateData(payload: UpdateMemberLeaveDto): Prisma.MemberLeaveUncheckedUpdateInput {
    return {
      memberId: payload.memberId,
      leaveType: payload.leaveType,
      startDate: payload.startDate ? new Date(payload.startDate) : payload.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : payload.endDate,
      note: payload.note,
    };
  }

  private toResponse(leave: LeaveDetail) {
    return {
      id: leave.id,
      member: leave.member,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      note: leave.note,
      createdAt: leave.createdAt,
      updatedAt: leave.updatedAt,
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

  private resolveSortBy(value?: string): keyof Prisma.MemberLeaveOrderByWithRelationInput {
    if (value && sortableLeaveFields.has(value)) {
      return value as keyof Prisma.MemberLeaveOrderByWithRelationInput;
    }

    return 'startDate';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
