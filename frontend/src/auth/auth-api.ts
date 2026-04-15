import { apiClient } from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { LoginPayload, LoginResponse, MeResponse } from '@/types/auth';

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<ApiSuccessResponse<LoginResponse>>(
    '/auth/google',
    payload,
  );

  return response.data.data;
}

export async function fetchCurrentUserRequest(): Promise<MeResponse> {
  const response = await apiClient.get<ApiSuccessResponse<MeResponse>>('/auth/me');
  return response.data.data;
}

export async function impersonateUserRequest(userId: string): Promise<LoginResponse> {
  const response = await apiClient.post<ApiSuccessResponse<LoginResponse>>(
    `/auth/impersonate/${userId}`,
  );

  return response.data.data;
}
