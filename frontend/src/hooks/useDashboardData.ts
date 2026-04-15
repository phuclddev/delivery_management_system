import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { DataProviderError, DataResource } from '@/providers/dataProvider';
import { useDataProvider } from '@/providers/dataProvider';
import type {
  ProjectEventRecord,
  ProjectRecord,
  RequestAssignmentRecord,
  RequestRecord,
} from '@/types/domain';

type AllocationRecord = {
  id: string;
  member: {
    id: string;
    email: string;
    displayName: string;
    team?: { id: string; code: string; name: string } | null;
  };
  project: {
    id: string;
    projectCode: string;
    name: string;
    status: string;
    requesterTeam?: { id: string; code: string; name: string } | null;
  };
  roleType: string;
  allocationPct: number;
  plannedMd?: number | null;
  actualMd?: number | null;
  startDate: string;
  endDate: string;
};

type IncidentRecord = {
  id: string;
  incidentCode: string;
  project: { id: string; projectCode: string; name: string; status: string };
  foundAt: string;
  severity: string;
  domain: string;
  status: string;
  ownerMember?: { id: string; email: string; displayName: string } | null;
  impactDescription: string;
};

type LeaveRecord = {
  id: string;
  member: {
    id: string;
    email: string;
    displayName: string;
    team?: { id: string; code: string; name: string } | null;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  note?: string | null;
};

interface DashboardDataState {
  requests: RequestRecord[];
  projects: ProjectRecord[];
  projectEvents: ProjectEventRecord[];
  requestAssignments: RequestAssignmentRecord[];
  allocations: AllocationRecord[];
  incidents: IncidentRecord[];
  leaves: LeaveRecord[];
  loading: boolean;
  error: DataProviderError | null;
  refresh: () => Promise<void>;
}

const fetchOrder: Array<{ resource: DataResource; permission: string }> = [
  { resource: 'requests', permission: 'requests:view' },
  { resource: 'projects', permission: 'projects:view' },
  { resource: 'projectEvents', permission: 'projects:view' },
  { resource: 'requestAssignments', permission: 'projects:view' },
  { resource: 'allocations', permission: 'allocations:view' },
  { resource: 'incidents', permission: 'incidents:view' },
  { resource: 'leaves', permission: 'leaves:view' },
];

export function useDashboardData(): DashboardDataState {
  const provider = useDataProvider();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [state, setState] = useState<DashboardDataState>({
    requests: [],
    projects: [],
    projectEvents: [],
    requestAssignments: [],
    allocations: [],
    incidents: [],
    leaves: [],
    loading: true,
    error: null,
    refresh: async () => undefined,
  });

  const visibleResources = useMemo(
    () => fetchOrder.filter((item) => hasPermission(item.permission)),
    [hasPermission],
  );

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    const results = await Promise.allSettled(
      visibleResources.map(async ({ resource }) => {
        const response = await provider.getList({
          resource,
          pagination: { current: 1, pageSize: 250 },
        });

        return { resource, data: response.data };
      }),
    );

    let firstError: DataProviderError | null = null;
    const nextState: Omit<DashboardDataState, 'loading' | 'error' | 'refresh'> = {
      requests: [],
      projects: [],
      projectEvents: [],
      requestAssignments: [],
      allocations: [],
      incidents: [],
      leaves: [],
    };

    for (const result of results) {
      if (result.status === 'rejected') {
        if (!firstError) {
          firstError = result.reason as DataProviderError;
        }
        continue;
      }

      if (result.value.resource === 'requests') {
        nextState.requests = result.value.data as RequestRecord[];
      }

      if (result.value.resource === 'projects') {
        nextState.projects = result.value.data as ProjectRecord[];
      }

      if (result.value.resource === 'projectEvents') {
        nextState.projectEvents = result.value.data as ProjectEventRecord[];
      }

      if (result.value.resource === 'requestAssignments') {
        nextState.requestAssignments = result.value.data as RequestAssignmentRecord[];
      }

      if (result.value.resource === 'allocations') {
        nextState.allocations = result.value.data as AllocationRecord[];
      }

      if (result.value.resource === 'incidents') {
        nextState.incidents = result.value.data as IncidentRecord[];
      }

      if (result.value.resource === 'leaves') {
        nextState.leaves = result.value.data as LeaveRecord[];
      }
    }

    setState({
      ...nextState,
      loading: false,
      error: firstError,
      refresh,
    });
  }, [provider, visibleResources]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  return {
    ...state,
    refresh,
  };
}
