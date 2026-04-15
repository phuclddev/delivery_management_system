import type { ProjectRecord, ProjectRequestSummary } from '@/types/domain';

export function getProjectRequests(project: Pick<ProjectRecord, 'requests' | 'request'>) {
  if (Array.isArray(project.requests) && project.requests.length > 0) {
    return project.requests.filter(Boolean) as ProjectRequestSummary[];
  }

  return project.request ? [project.request] : [];
}

export function getPrimaryProjectRequest(project: Pick<ProjectRecord, 'requests' | 'request'>) {
  return getProjectRequests(project)[0] ?? null;
}
