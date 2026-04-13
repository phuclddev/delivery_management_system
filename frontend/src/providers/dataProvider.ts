import { createContext, createElement, useContext } from 'react';
import axios from 'axios';
import type { PropsWithChildren } from 'react';
import { apiClient } from '@/api/client';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';

export type DataResource =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'teams'
  | 'requests'
  | 'projects'
  | 'allocations'
  | 'incidents'
  | 'artifacts'
  | 'leaves';

export interface PaginationParams {
  current?: number;
  pageSize?: number;
}

export interface SortParams {
  field?: string;
  order?: 'asc' | 'desc' | 'ascend' | 'descend';
}

export interface GetListParams {
  pagination?: PaginationParams;
  sort?: SortParams;
  filters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface GetOneParams {
  resource: DataResource;
  id: string;
  signal?: AbortSignal;
}

export interface CreateParams<TValues = Record<string, unknown>> {
  resource: DataResource;
  values: TValues;
  signal?: AbortSignal;
}

export interface UpdateParams<TValues = Record<string, unknown>> {
  resource: DataResource;
  id: string;
  values: TValues;
  signal?: AbortSignal;
}

export interface DeleteParams {
  resource: DataResource;
  id: string;
  signal?: AbortSignal;
}

export interface GetListRequest extends GetListParams {
  resource: DataResource;
}

export interface GetListResult<TData = unknown> {
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DataProvider {
  getList<TData = unknown>(params: {
    resource: DataResource;
  } & GetListParams): Promise<GetListResult<TData>>;
  getOne<TData = unknown>(params: GetOneParams): Promise<{ data: TData }>;
  create<TData = unknown, TValues = Record<string, unknown>>(
    params: CreateParams<TValues>,
  ): Promise<{ data: TData }>;
  update<TData = unknown, TValues = Record<string, unknown>>(
    params: UpdateParams<TValues>,
  ): Promise<{ data: TData }>;
  delete<TData = unknown>(params: DeleteParams): Promise<{ data: TData }>;
}

type ResourceConfig = {
  path: string;
  getOneStrategy?: 'direct' | 'fromList';
  listServerFilters?: string[];
  clientFilterPaths?: Record<string, string>;
  filterPredicates?: Record<string, (record: unknown, expected: unknown) => boolean>;
  supportsCreate?: boolean;
  supportsUpdate?: boolean;
  supportsDelete?: boolean;
};

const resourceConfigs: Record<DataResource, ResourceConfig> = {
  users: {
    path: 'users',
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
    clientFilterPaths: {
      roleId: 'roles.id',
      teamId: 'team.id',
    },
  },
  roles: {
    path: 'roles',
    getOneStrategy: 'fromList',
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: false,
  },
  permissions: {
    path: 'permissions',
    supportsCreate: false,
    supportsUpdate: false,
    supportsDelete: false,
  },
  teams: {
    path: 'teams',
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  requests: {
    path: 'requests',
    listServerFilters: ['status', 'teamId', 'priority'],
    clientFilterPaths: {
      teamId: 'requesterTeam.id',
      requestType: 'requestType',
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  projects: {
    path: 'projects',
    listServerFilters: ['status', 'teamId', 'priority'],
    clientFilterPaths: {
      teamId: 'requesterTeam.id',
      priority: 'businessPriority',
      pmOwnerId: 'pmOwner.id',
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  allocations: {
    path: 'project-allocations',
    listServerFilters: ['memberId', 'projectId', 'startDate', 'endDate'],
    clientFilterPaths: {
      memberId: 'member.id',
      projectId: 'project.id',
      teamId: 'member.team.id',
      roleType: 'roleType',
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  incidents: {
    path: 'incidents',
    clientFilterPaths: {
      projectId: 'project.id',
      ownerMemberId: 'ownerMember.id',
      severity: 'severity',
      domain: 'domain',
      status: 'status',
    },
    filterPredicates: {
      foundAtRange: (record, expected) =>
        matchesDateRangeFilter(getValueByPath(record, 'foundAt'), expected),
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  artifacts: {
    path: 'project-artifacts',
    clientFilterPaths: {
      projectId: 'project.id',
      uploadedBy: 'uploader.id',
      artifactType: 'artifactType',
      isFinal: 'isFinal',
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
  leaves: {
    path: 'member-leaves',
    clientFilterPaths: {
      memberId: 'member.id',
      teamId: 'member.team.id',
      leaveType: 'leaveType',
    },
    filterPredicates: {
      leaveRange: (record, expected) =>
        matchesRangeOverlapFilter(
          getValueByPath(record, 'startDate'),
          getValueByPath(record, 'endDate'),
          expected,
        ),
    },
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
  },
};

const defaultPagination = {
  current: 1,
  pageSize: 10,
};

export class DataProviderError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, options?: { statusCode?: number; details?: unknown }) {
    super(message);
    this.name = 'DataProviderError';
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}

async function request<TData>(options: {
  method: 'get' | 'post' | 'patch' | 'delete';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<TData> {
  try {
    const response = await apiClient.request<ApiSuccessResponse<TData>>({
      method: options.method,
      url: options.url,
      data: options.data,
      params: options.params,
      signal: options.signal,
    });

    return response.data.data;
  } catch (error) {
    throw normalizeDataProviderError(error);
  }
}

function normalizeDataProviderError(error: unknown): DataProviderError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const statusCode = error.response?.status;
    const message =
      error.response?.data?.message ??
      (statusCode === 401
        ? 'Your session has expired. Please sign in again.'
        : statusCode === 403
          ? 'You do not have permission to perform this action.'
          : error.message);

    return new DataProviderError(message, {
      statusCode,
      details: error.response?.data?.details,
    });
  }

  if (error instanceof Error) {
    return new DataProviderError(error.message);
  }

  return new DataProviderError('Unexpected data provider error.');
}

function getResourceConfig(resource: DataResource): ResourceConfig {
  return resourceConfigs[resource];
}

function toPath(resource: DataResource): string {
  return `/${getResourceConfig(resource).path}`;
}

function toServerParams(resource: DataResource, filters?: Record<string, unknown>) {
  if (!filters) {
    return undefined;
  }

  const config = getResourceConfig(resource);
  const allowedFilters = config.listServerFilters ?? [];
  const params: Record<string, unknown> = {};

  for (const key of allowedFilters) {
    const value = filters[key];

    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

function getValueByPath(record: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = record;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current.map((item) => getValueByPath(item, segment));
      continue;
    }

    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function matchesFilterValue(candidate: unknown, expected: unknown): boolean {
  if (Array.isArray(candidate)) {
    return candidate.some((item) => matchesFilterValue(item, expected));
  }

  if (expected === undefined || expected === null || expected === '') {
    return true;
  }

  if (typeof candidate === 'string' && typeof expected === 'string') {
    return candidate.toLowerCase().includes(expected.toLowerCase());
  }

  return candidate === expected;
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function matchesDateRangeFilter(
  candidate: unknown,
  expected: unknown,
): boolean {
  if (typeof expected !== 'object' || expected === null) {
    return true;
  }

  const candidateDate = toDateValue(candidate);
  if (!candidateDate) {
    return false;
  }

  const from = toDateValue((expected as Record<string, unknown>).from);
  const to = toDateValue((expected as Record<string, unknown>).to);

  if (from && candidateDate < from) {
    return false;
  }

  if (to && candidateDate > to) {
    return false;
  }

  return true;
}

function matchesRangeOverlapFilter(
  startCandidate: unknown,
  endCandidate: unknown,
  expected: unknown,
): boolean {
  if (typeof expected !== 'object' || expected === null) {
    return true;
  }

  const start = toDateValue(startCandidate);
  const end = toDateValue(endCandidate);
  const from = toDateValue((expected as Record<string, unknown>).from);
  const to = toDateValue((expected as Record<string, unknown>).to);

  if (!start || !end) {
    return false;
  }

  if (from && end < from) {
    return false;
  }

  if (to && start > to) {
    return false;
  }

  return true;
}

function applyClientFilters<TData>(
  resource: DataResource,
  records: TData[],
  filters?: Record<string, unknown>,
): TData[] {
  if (!filters) {
    return records;
  }

  const config = getResourceConfig(resource);
  const handledByServer = new Set(config.listServerFilters ?? []);

  return records.filter((record) =>
    Object.entries(filters).every(([key, expected]) => {
      if (handledByServer.has(key) || expected === undefined || expected === null || expected === '') {
        return true;
      }

      const predicate = config.filterPredicates?.[key];
      if (predicate) {
        return predicate(record, expected);
      }

      const path = config.clientFilterPaths?.[key] ?? key;
      const candidate = getValueByPath(record, path);
      return matchesFilterValue(candidate, expected);
    }),
  );
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }

  if (left === undefined || left === null) {
    return -1;
  }

  if (right === undefined || right === null) {
    return 1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function applyClientSort<TData>(records: TData[], sort?: SortParams): TData[] {
  if (!sort?.field || !sort.order) {
    return records;
  }

  const direction = sort.order === 'desc' || sort.order === 'descend' ? -1 : 1;
  const nextRecords = [...records];

  nextRecords.sort((left, right) => {
    const leftValue = getValueByPath(left, sort.field!);
    const rightValue = getValueByPath(right, sort.field!);
    return compareValues(leftValue, rightValue) * direction;
  });

  return nextRecords;
}

function applyClientPagination<TData>(
  records: TData[],
  pagination?: PaginationParams,
): GetListResult<TData> {
  const page = pagination?.current ?? defaultPagination.current;
  const pageSize = pagination?.pageSize ?? defaultPagination.pageSize;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: records.slice(start, end),
    total: records.length,
    page,
    pageSize,
  };
}

function throwUnsupportedOperation(resource: DataResource, operation: string): never {
  throw new DataProviderError(
    `The backend does not support ${operation} for the ${resource} resource yet.`,
    { statusCode: 405 },
  );
}

async function getRoleById(id: string, signal?: AbortSignal) {
  const roles = await request<unknown[]>({
    method: 'get',
    url: toPath('roles'),
    signal,
  });

  const role = roles.find((entry) => {
    const value = getValueByPath(entry, 'id');
    return value === id;
  });

  if (!role) {
    throw new DataProviderError(`Role ${id} was not found.`, { statusCode: 404 });
  }

  return role;
}

export const dataProvider: DataProvider = {
  async getList<TData = unknown>({
    resource,
    pagination,
    sort,
    filters,
    signal,
  }: GetListRequest) {
    const records = await request<TData[]>({
      method: 'get',
      url: toPath(resource),
      params: toServerParams(resource, filters),
      signal,
    });

    const filtered = applyClientFilters(resource, records, filters);
    const sorted = applyClientSort(filtered, sort);
    return applyClientPagination(sorted, pagination);
  },

  async getOne<TData = unknown>({ resource, id, signal }: GetOneParams) {
    const config = getResourceConfig(resource);

    if (config.getOneStrategy === 'fromList') {
      const data = await getRoleById(id, signal);
      return { data: data as TData };
    }

    const data = await request<TData>({
      method: 'get',
      url: `${toPath(resource)}/${id}`,
      signal,
    });

    return { data };
  },

  async create<TData = unknown, TValues = Record<string, unknown>>({
    resource,
    values,
    signal,
  }: CreateParams<TValues>) {
    if (!getResourceConfig(resource).supportsCreate) {
      throwUnsupportedOperation(resource, 'create');
    }

    const data = await request<TData>({
      method: 'post',
      url: toPath(resource),
      data: values,
      signal,
    });

    return { data };
  },

  async update<TData = unknown, TValues = Record<string, unknown>>({
    resource,
    id,
    values,
    signal,
  }: UpdateParams<TValues>) {
    if (!getResourceConfig(resource).supportsUpdate) {
      throwUnsupportedOperation(resource, 'update');
    }

    if (resource === 'users') {
      const payload = values as Record<string, unknown>;

      if (!Array.isArray(payload.roleIds)) {
        throwUnsupportedOperation(resource, 'generic update');
      }

      const data = await request<TData>({
        method: 'patch',
        url: `${toPath(resource)}/${id}/roles`,
        data: {
          roleIds: payload.roleIds,
        },
        signal,
      });

      return { data };
    }

    if (resource === 'roles') {
      const payload = values as Record<string, unknown>;
      const roleFields = ['code', 'name', 'description', 'isSystem'];
      const basePayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => roleFields.includes(key)),
      );

      if (Object.keys(basePayload).length > 0) {
        await request({
          method: 'patch',
          url: `${toPath(resource)}/${id}`,
          data: basePayload,
          signal,
        });
      }

      if (Array.isArray(payload.permissionIds)) {
        await request({
          method: 'patch',
          url: `${toPath(resource)}/${id}/permissions`,
          data: {
            permissionIds: payload.permissionIds,
          },
          signal,
        });
      }

      if (Object.keys(basePayload).length === 0 && !Array.isArray(payload.permissionIds)) {
        throwUnsupportedOperation(resource, 'update');
      }

      const refreshed = await getRoleById(id, signal);
      return { data: refreshed as TData };
    }

    const data = await request<TData>({
      method: 'patch',
      url: `${toPath(resource)}/${id}`,
      data: values,
      signal,
    });

    return { data };
  },

  async delete<TData = unknown>({ resource, id, signal }: DeleteParams) {
    if (!getResourceConfig(resource).supportsDelete) {
      throwUnsupportedOperation(resource, 'delete');
    }

    const data = await request<TData>({
      method: 'delete',
      url: `${toPath(resource)}/${id}`,
      signal,
    });

    return { data };
  },
};

const DataProviderContext = createContext<DataProvider>(dataProvider);

export function DataProviderProvider({ children }: PropsWithChildren) {
  return createElement(DataProviderContext.Provider, { value: dataProvider }, children);
}

export function useDataProvider() {
  return useContext(DataProviderContext);
}
