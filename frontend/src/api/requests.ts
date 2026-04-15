import { apiClient } from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { ProjectRecord } from '@/types/domain';

export interface ConvertRequestToProjectPayload {
  projectId?: string;
  projectCode?: string;
  name?: string;
  pmOwnerId?: string;
  projectType?: string;
  status?: string;
  businessPriority?: string;
  riskLevel?: string;
  plannedStartDate?: string;
  plannedLiveDate?: string;
  actualStartDate?: string;
  actualLiveDate?: string;
  backendStartDate?: string;
  backendEndDate?: string;
  frontendStartDate?: string;
  frontendEndDate?: string;
  currentScopeVersion?: string;
  scopeChangeCount?: number;
  blockerCount?: number;
  incidentCount?: number;
  chatGroupUrl?: string;
  repoUrl?: string;
  notes?: string;
}

export async function convertRequestToProject(
  requestId: string,
  payload: ConvertRequestToProjectPayload,
) {
  const response = await apiClient.post<ApiSuccessResponse<ProjectRecord>>(
    `/requests/${requestId}/convert-to-project`,
    payload,
  );

  return response.data.data;
}
