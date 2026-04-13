import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '@/types/auth';
import type { DataProviderError } from '@/providers/dataProvider';
import { useDataProvider } from '@/providers/dataProvider';

interface SimpleOption {
  label: string;
  value: string;
}

interface TeamReference {
  id: string;
  code?: string;
  name: string;
}

export interface ReferenceDataState {
  users: unknown[];
  requests: unknown[];
  projects: unknown[];
  teams: TeamReference[];
  loading: boolean;
  error: DataProviderError | null;
  reload: () => Promise<void>;
  userOptions: SimpleOption[];
  requestOptions: SimpleOption[];
  projectOptions: SimpleOption[];
  teamOptions: SimpleOption[];
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function getNestedObject(value: unknown, key: string): Record<string, unknown> | null {
  const objectValue = readObject(value);
  if (!objectValue) {
    return null;
  }

  return readObject(objectValue[key]);
}

function toOption(value: string | undefined, label: string | undefined): SimpleOption | null {
  if (!value || !label) {
    return null;
  }

  return { value, label };
}

export function useReferenceData(currentUser: CurrentUser | null): ReferenceDataState {
  const provider = useDataProvider();
  const [users, setUsers] = useState<unknown[]>([]);
  const [requests, setRequests] = useState<unknown[]>([]);
  const [projects, setProjects] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DataProviderError | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, requestsResult, projectsResult] = await Promise.allSettled([
        provider.getList({ resource: 'users', pagination: { current: 1, pageSize: 200 } }),
        provider.getList({ resource: 'requests', pagination: { current: 1, pageSize: 200 } }),
        provider.getList({ resource: 'projects', pagination: { current: 1, pageSize: 200 } }),
      ]);

      setUsers(usersResult.status === 'fulfilled' ? usersResult.value.data : []);
      setRequests(requestsResult.status === 'fulfilled' ? requestsResult.value.data : []);
      setProjects(projectsResult.status === 'fulfilled' ? projectsResult.value.data : []);

      const firstError = [usersResult, requestsResult, projectsResult].find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );

      if (firstError) {
        setError(firstError.reason as DataProviderError);
      }
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const teams = useMemo(() => {
    const teamMap = new Map<string, TeamReference>();

    for (const entry of [...users, ...requests, ...projects]) {
      const userTeam = getNestedObject(entry, 'team');
      if (userTeam?.id && typeof userTeam.id === 'string' && typeof userTeam.name === 'string') {
        teamMap.set(userTeam.id, {
          id: userTeam.id,
          code: typeof userTeam.code === 'string' ? userTeam.code : undefined,
          name: userTeam.name,
        });
      }

      const requesterTeam = getNestedObject(entry, 'requesterTeam');
      if (
        requesterTeam?.id &&
        typeof requesterTeam.id === 'string' &&
        typeof requesterTeam.name === 'string'
      ) {
        teamMap.set(requesterTeam.id, {
          id: requesterTeam.id,
          code: typeof requesterTeam.code === 'string' ? requesterTeam.code : undefined,
          name: requesterTeam.name,
        });
      }
    }

    if (currentUser?.team) {
      teamMap.set(currentUser.team.id, {
        id: currentUser.team.id,
        code: currentUser.team.code,
        name: currentUser.team.name,
      });
    }

    return Array.from(teamMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [currentUser?.team, projects, requests, users]);

  const userOptions = useMemo(
    () =>
      users
        .map((entry) => {
          const objectValue = readObject(entry);
          return toOption(
            typeof objectValue?.id === 'string' ? objectValue.id : undefined,
            typeof objectValue?.displayName === 'string'
              ? objectValue.displayName
              : typeof objectValue?.email === 'string'
                ? objectValue.email
                : undefined,
          );
        })
        .filter((option): option is SimpleOption => Boolean(option)),
    [users],
  );

  const requestOptions = useMemo(
    () =>
      requests
        .map((entry) => {
          const objectValue = readObject(entry);
          return toOption(
            typeof objectValue?.id === 'string' ? objectValue.id : undefined,
            typeof objectValue?.title === 'string'
              ? `${objectValue.requestCode ?? 'REQ'} · ${objectValue.title}`
              : undefined,
          );
        })
        .filter((option): option is SimpleOption => Boolean(option)),
    [requests],
  );

  const projectOptions = useMemo(
    () =>
      projects
        .map((entry) => {
          const objectValue = readObject(entry);
          return toOption(
            typeof objectValue?.id === 'string' ? objectValue.id : undefined,
            typeof objectValue?.name === 'string'
              ? `${objectValue.projectCode ?? 'PRJ'} · ${objectValue.name}`
              : undefined,
          );
        })
        .filter((option): option is SimpleOption => Boolean(option)),
    [projects],
  );

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams],
  );

  return {
    users,
    requests,
    projects,
    teams,
    loading,
    error,
    reload,
    userOptions,
    requestOptions,
    projectOptions,
    teamOptions,
  };
}

