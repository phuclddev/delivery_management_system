import { apiClient } from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export interface PerformanceMemberStat {
  member: {
    id: string;
    displayName: string;
    email: string;
    team?: {
      id: string | null;
      name: string;
    } | null;
  };
  taskCount: number;
  averageEfficiency: number;
  efficiencyVariance: number;
  totalActualMd: number;
  totalComplexityScore: number;
}

export interface PerformanceTeamStat {
  team: {
    id: string | null;
    name: string;
  };
  taskCount: number;
  averageEfficiency: number;
  efficiencyVariance: number;
}

export interface PerformanceSummary {
  measuredAssignments: number;
  measuredMembers: number;
  measuredTeams: number;
}

export interface PerformanceReportResponse {
  members: PerformanceMemberStat[];
  teams: PerformanceTeamStat[];
  summary: PerformanceSummary;
}

export async function fetchPerformanceReport() {
  const response = await apiClient.get<ApiSuccessResponse<PerformanceReportResponse>>(
    '/reports/performance',
  );

  return response.data.data;
}
