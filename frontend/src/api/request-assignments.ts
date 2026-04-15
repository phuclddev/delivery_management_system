import { apiClient } from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  RequestAssignmentBeProfile,
  RequestAssignmentFeProfile,
  RequestAssignmentRecord,
  RequestAssignmentSystemProfile,
} from '@/types/domain';

export interface RequestAssignmentFeProfilePayload {
  screensViews?: number;
  layoutComplexity?: number;
  componentReuse?: number;
  responsive?: boolean;
  animationLevel?: number;
  userActions?: number;
  userActionsList?: string;
  apiComplexity?: number;
  clientSideLogic?: number;
  heavyAssets?: boolean;
  uiClarity?: number;
  specChangeRisk?: number;
  deviceSupport?: number;
  timelinePressure?: number;
  note?: string;
}

export interface RequestAssignmentBeProfilePayload {
  userActions?: number;
  businessLogicComplexity?: number;
  dbTables?: number;
  apis?: number;
  requirementClarity?: number;
  changeFrequency?: number;
  realtime?: boolean;
  timelinePressure?: number;
  note?: string;
}

export interface RequestAssignmentSystemProfilePayload {
  domainComplexity?: number;
  integrationCount?: number;
  dependencyLevel?: number;
  requirementClarity?: number;
  unknownFactor?: number;
  dataVolume?: number;
  scalabilityRequirement?: number;
  securityRequirement?: number;
  externalApiComplexity?: number;
  changeFrequency?: number;
  testingComplexity?: number;
  timelinePressure?: number;
  note?: string;
}

export async function createRequestAssignmentFeProfile(
  assignmentId: string,
  payload: RequestAssignmentFeProfilePayload,
) {
  const response = await apiClient.post<ApiSuccessResponse<RequestAssignmentFeProfile>>(
    `/request-assignments/${assignmentId}/fe-profile`,
    payload,
  );

  return response.data.data;
}

export async function updateRequestAssignmentFeProfile(
  assignmentId: string,
  payload: RequestAssignmentFeProfilePayload,
) {
  const response = await apiClient.patch<ApiSuccessResponse<RequestAssignmentFeProfile>>(
    `/request-assignments/${assignmentId}/fe-profile`,
    payload,
  );

  return response.data.data;
}

export async function createRequestAssignmentBeProfile(
  assignmentId: string,
  payload: RequestAssignmentBeProfilePayload,
) {
  const response = await apiClient.post<ApiSuccessResponse<RequestAssignmentBeProfile>>(
    `/request-assignments/${assignmentId}/be-profile`,
    payload,
  );

  return response.data.data;
}

export async function updateRequestAssignmentBeProfile(
  assignmentId: string,
  payload: RequestAssignmentBeProfilePayload,
) {
  const response = await apiClient.patch<ApiSuccessResponse<RequestAssignmentBeProfile>>(
    `/request-assignments/${assignmentId}/be-profile`,
    payload,
  );

  return response.data.data;
}

export async function getRequestAssignment(assignmentId: string) {
  const response = await apiClient.get<ApiSuccessResponse<RequestAssignmentRecord>>(
    `/request-assignments/${assignmentId}`,
  );

  return response.data.data;
}

export async function createRequestAssignmentSystemProfile(
  assignmentId: string,
  payload: RequestAssignmentSystemProfilePayload,
) {
  const response = await apiClient.post<ApiSuccessResponse<RequestAssignmentSystemProfile>>(
    `/request-assignments/${assignmentId}/system-profile`,
    payload,
  );

  return response.data.data;
}

export async function updateRequestAssignmentSystemProfile(
  assignmentId: string,
  payload: RequestAssignmentSystemProfilePayload,
) {
  const response = await apiClient.patch<ApiSuccessResponse<RequestAssignmentSystemProfile>>(
    `/request-assignments/${assignmentId}/system-profile`,
    payload,
  );

  return response.data.data;
}
