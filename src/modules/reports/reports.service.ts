import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DELIVERY_TEAM_CODE = 'CODE';

const performanceAssignmentInclude = {
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

type PerformanceAssignment = Prisma.RequestAssignmentGetPayload<{
  include: typeof performanceAssignmentInclude;
}>;

type EfficiencySnapshot = {
  assignmentId: string;
  roleType: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  teamId: string | null;
  teamName: string;
  actualMd: number;
  complexityScore: number;
  efficiency: number;
};

type AggregateBucket = {
  id: string;
  name: string;
  team?: {
    id: string | null;
    name: string;
  };
  taskCount: number;
  averageEfficiency: number;
  efficiencyVariance: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceReport() {
    const assignments = await this.prisma.requestAssignment.findMany({
      where: {
        actualMd: {
          not: null,
        },
        member: {
          team: {
            is: {
              code: DELIVERY_TEAM_CODE,
            },
          },
        },
        OR: [
          {
            feProfile: {
              isNot: null,
            },
          },
          {
            beProfile: {
              isNot: null,
            },
          },
          {
            systemProfile: {
              isNot: null,
            },
          },
        ],
      },
      include: performanceAssignmentInclude,
    });

    const snapshots = assignments
      .map((assignment) => this.toEfficiencySnapshot(assignment))
      .filter((snapshot): snapshot is EfficiencySnapshot => Boolean(snapshot));

    const members = this.buildMemberStats(snapshots);
    const teams = this.buildTeamStats(snapshots);

    return {
      data: {
        members,
        teams,
        summary: {
          measuredAssignments: snapshots.length,
          measuredMembers: members.length,
          measuredTeams: teams.length,
        },
      },
    };
  }

  private toEfficiencySnapshot(
    assignment: PerformanceAssignment,
  ): EfficiencySnapshot | null {
    const actualMd = assignment.actualMd ?? 0;

    if (actualMd <= 0) {
      return null;
    }

    const complexityScore = assignment.feProfile
      ? this.computeFeComplexityScore(assignment)
      : assignment.beProfile
        ? this.computeBeComplexityScore(assignment)
        : assignment.systemProfile
          ? this.computeSystemComplexityScore(assignment)
        : 0;

    if (complexityScore <= 0) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      roleType: assignment.roleType,
      memberId: assignment.member.id,
      memberName: assignment.member.displayName,
      memberEmail: assignment.member.email,
      teamId: assignment.member.team?.id ?? null,
      teamName: assignment.member.team?.name ?? 'Unassigned',
      actualMd,
      complexityScore,
      // Efficiency is modeled as actual effort per unit of complexity.
      // Lower values mean a member completes comparable complexity with fewer MD.
      efficiency: actualMd / complexityScore,
    };
  }

  private computeFeComplexityScore(assignment: PerformanceAssignment): number {
    const profile = assignment.feProfile;

    if (!profile) {
      return 0;
    }

    // FE complexity is a weighted additive score:
    // - screen/layout/action counts contribute the base UI workload
    // - API/client logic/spec pressure increase implementation and coordination cost
    // - boolean flags add a small fixed bump for extra delivery surface
    const score =
      (profile.screensViews ?? 0) * 1.2 +
      (profile.layoutComplexity ?? 0) * 1.4 +
      (profile.componentReuse ?? 0) * 0.8 +
      (profile.animationLevel ?? 0) * 0.8 +
      (profile.userActions ?? 0) * 1.1 +
      (profile.apiComplexity ?? 0) * 1.2 +
      (profile.clientSideLogic ?? 0) * 1.4 +
      (profile.uiClarity ?? 0) * 0.7 +
      (profile.specChangeRisk ?? 0) * 1.1 +
      (profile.deviceSupport ?? 0) * 0.8 +
      (profile.timelinePressure ?? 0) * 1.2 +
      (profile.responsive ? 1 : 0) +
      (profile.heavyAssets ? 1 : 0);

    return Number(score.toFixed(2));
  }

  private computeBeComplexityScore(assignment: PerformanceAssignment): number {
    const profile = assignment.beProfile;

    if (!profile) {
      return 0;
    }

    // BE complexity is a weighted additive score:
    // - user flows, business logic, tables, and APIs form the base backend scope
    // - ambiguity/change rate/timeline pressure model delivery uncertainty
    // - realtime work gets an extra bump because it increases operational risk
    const score =
      (profile.userActions ?? 0) * 1 +
      (profile.businessLogicComplexity ?? 0) * 1.8 +
      (profile.dbTables ?? 0) * 1.1 +
      (profile.apis ?? 0) * 1.3 +
      (profile.requirementClarity ?? 0) * 0.7 +
      (profile.changeFrequency ?? 0) * 1.2 +
      (profile.timelinePressure ?? 0) * 1.3 +
      (profile.realtime ? 1.5 : 0);

    return Number(score.toFixed(2));
  }

  private computeSystemComplexityScore(assignment: PerformanceAssignment): number {
    const profile = assignment.systemProfile;

    if (!profile) {
      return 0;
    }

    const score =
      (profile.domainComplexity ?? 0) * 1.5 +
      (profile.integrationCount ?? 0) * 1.2 +
      (profile.dependencyLevel ?? 0) * 1.3 +
      (profile.requirementClarity ?? 0) * 0.8 +
      (profile.unknownFactor ?? 0) * 1.4 +
      (profile.dataVolume ?? 0) * 1.1 +
      (profile.scalabilityRequirement ?? 0) * 1.2 +
      (profile.securityRequirement ?? 0) * 1.4 +
      (profile.externalApiComplexity ?? 0) * 1.2 +
      (profile.changeFrequency ?? 0) * 1.1 +
      (profile.testingComplexity ?? 0) * 1.2 +
      (profile.timelinePressure ?? 0) * 1.2;

    return Number(score.toFixed(2));
  }

  private buildMemberStats(snapshots: EfficiencySnapshot[]) {
    const buckets = new Map<string, EfficiencySnapshot[]>();

    for (const snapshot of snapshots) {
      buckets.set(snapshot.memberId, [...(buckets.get(snapshot.memberId) ?? []), snapshot]);
    }

    return Array.from(buckets.entries())
      .map(([memberId, memberSnapshots]) => {
        const first = memberSnapshots[0];
        const aggregate = this.toAggregateStats(memberId, first.memberName, memberSnapshots);

        return {
          member: {
            id: memberId,
            displayName: first.memberName,
            email: first.memberEmail,
            team: {
              id: first.teamId,
              name: first.teamName,
            },
          },
          taskCount: aggregate.taskCount,
          averageEfficiency: aggregate.averageEfficiency,
          efficiencyVariance: aggregate.efficiencyVariance,
          totalActualMd: Number(
            memberSnapshots
              .reduce((total, snapshot) => total + snapshot.actualMd, 0)
              .toFixed(2),
          ),
          totalComplexityScore: Number(
            memberSnapshots
              .reduce((total, snapshot) => total + snapshot.complexityScore, 0)
              .toFixed(2),
          ),
        };
      })
      .sort((left, right) => left.averageEfficiency - right.averageEfficiency);
  }

  private buildTeamStats(snapshots: EfficiencySnapshot[]) {
    const buckets = new Map<string, EfficiencySnapshot[]>();

    for (const snapshot of snapshots) {
      const key = snapshot.teamId ?? 'unassigned';
      buckets.set(key, [...(buckets.get(key) ?? []), snapshot]);
    }

    return Array.from(buckets.entries())
      .map(([teamId, teamSnapshots]) => {
        const first = teamSnapshots[0];
        const aggregate = this.toAggregateStats(teamId, first.teamName, teamSnapshots);

        return {
          team: {
            id: first.teamId,
            name: first.teamName,
          },
          taskCount: aggregate.taskCount,
          averageEfficiency: aggregate.averageEfficiency,
          efficiencyVariance: aggregate.efficiencyVariance,
        };
      })
      .sort((left, right) => left.averageEfficiency - right.averageEfficiency);
  }

  private toAggregateStats(
    id: string,
    name: string,
    snapshots: EfficiencySnapshot[],
  ): AggregateBucket {
    const taskCount = snapshots.length;
    const averageEfficiency =
      snapshots.reduce((total, snapshot) => total + snapshot.efficiency, 0) /
      taskCount;

    // Variance measures consistency.
    // Lower variance means the member/team performs at a more predictable pace.
    const efficiencyVariance =
      snapshots.reduce((total, snapshot) => {
        const delta = snapshot.efficiency - averageEfficiency;
        return total + delta * delta;
      }, 0) / taskCount;

    return {
      id,
      name,
      taskCount,
      averageEfficiency: Number(averageEfficiency.toFixed(4)),
      efficiencyVariance: Number(efficiencyVariance.toFixed(4)),
    };
  }
}
