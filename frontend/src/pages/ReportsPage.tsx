import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  BarChartOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  PieChartOutlined,
  ProjectOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Tooltip as AntTooltip } from 'antd';
import { fetchPerformanceReport, type PerformanceMemberStat } from '@/api/reports';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import {
  ReportingFilterBar,
  type ReportingGranularity,
} from '@/components/reports/ReportingFilterBar';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import type {
  ProjectEventRecord,
  ProjectRecord,
  RequestAssignmentRecord,
  RequestRecord,
} from '@/types/domain';
import { formatDate, formatDateTime } from '@/utils/format';

const { Paragraph, Text } = Typography;

const chartColors = ['#0f766e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const currentYear = new Date().getFullYear();
const DELIVERY_TEAM_CODE = 'CODE';

type ReportRange = {
  start: Date;
  end: Date;
  label: string;
};

type IncidentRecord = {
  id: string;
  incidentCode: string;
  project: { id: string; projectCode: string; name: string; status?: string | null };
  foundAt: string;
  severity?: string | null;
  domain?: string | null;
  status?: string | null;
  ownerMember?: { id: string; email: string; displayName: string } | null;
  impactDescription?: string | null;
};

type LeaveRecord = {
  id: string;
  member: {
    id: string;
    email: string;
    displayName: string;
    team?: { id: string; code: string; name: string } | null;
  };
  leaveType?: string | null;
  startDate: string;
  endDate: string;
  note?: string | null;
};

type PerformanceTimelinePoint = {
  assignmentId: string;
  label: string;
  date: string;
  memberId: string;
  memberName: string;
  projectCode: string;
  requestCode: string;
  actualMd: number;
  complexityScore: number;
  efficiency: number;
};

function asDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function overlapsRange(start?: string | null, end?: string | null, rangeStart?: Date, rangeEnd?: Date) {
  const startDate = asDate(start);
  const endDate = asDate(end);

  if (!startDate || !endDate || !rangeStart || !rangeEnd) {
    return false;
  }

  return startDate < rangeEnd && endDate >= rangeStart;
}

function averageBy<T>(items: T[], accessor: (item: T) => number | null | undefined) {
  if (!items.length) {
    return 0;
  }

  return sumBy(items, accessor) / items.length;
}

function normalizeLabel(value?: string | null, fallback = 'Unspecified') {
  return value && value.trim() ? value : fallback;
}

function countBy<T>(items: T[], accessor: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = normalizeLabel(accessor(item));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

function sumBy<T>(items: T[], accessor: (item: T) => number | null | undefined) {
  return items.reduce((total, item) => total + (accessor(item) ?? 0), 0);
}

function formatPct(value: number) {
  return `${Math.round(value)}%`;
}

function statusColor(value?: string | null) {
  const normalized = (value ?? '').toLowerCase();

  if (normalized.includes('done') || normalized.includes('closed') || normalized.includes('resolved') || normalized.includes('live')) {
    return 'green';
  }

  if (normalized.includes('progress') || normalized.includes('active') || normalized.includes('open')) {
    return 'blue';
  }

  if (normalized.includes('block') || normalized.includes('critical') || normalized.includes('high')) {
    return 'red';
  }

  if (normalized.includes('hold') || normalized.includes('pending')) {
    return 'orange';
  }

  return 'default';
}

function toTrendData(incidents: IncidentRecord[]) {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const bucket = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index * 7);
    const key = `${bucket.getFullYear()}-${bucket.getMonth() + 1}-${bucket.getDate()}`;
    buckets.set(key, 0);
  }

  for (const incident of incidents) {
    const foundAt = asDate(incident.foundAt);
    if (!foundAt) {
      continue;
    }

    let matchedKey: string | null = null;
    for (const key of buckets.keys()) {
      const bucketDate = new Date(key);
      const nextBucket = new Date(bucketDate);
      nextBucket.setDate(bucketDate.getDate() + 7);

      if (foundAt >= bucketDate && foundAt < nextBucket) {
        matchedKey = key;
      }
    }

    if (matchedKey) {
      buckets.set(matchedKey, (buckets.get(matchedKey) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    name: formatDate(key),
    value,
  }));
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDayExclusive(value: Date) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function getQuarterRange(year: number, quarter: number): ReportRange {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 1);

  return {
    start,
    end,
    label: `Q${quarter} ${year}`,
  };
}

function getMonthRange(year: number, month: number): ReportRange {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  return {
    start,
    end,
    label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
  };
}

function createCustomRange(start: Dayjs, end: Dayjs): ReportRange {
  const startDate = start.startOf('day').toDate();
  const endDate = end.add(1, 'day').startOf('day').toDate();

  return {
    start: startDate,
    end: endDate,
    label: `${start.format('DD MMM YYYY')} - ${end.format('DD MMM YYYY')}`,
  };
}

function getPresetRange(preset: string): ReportRange {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  if (preset === 'current_month') {
    return getMonthRange(now.getFullYear(), now.getMonth());
  }

  if (preset === 'q1') {
    return getQuarterRange(currentYear, 1);
  }

  if (preset === 'q2') {
    return getQuarterRange(currentYear, 2);
  }

  if (preset === 'q3') {
    return getQuarterRange(currentYear, 3);
  }

  if (preset === 'q4') {
    return getQuarterRange(currentYear, 4);
  }

  return getQuarterRange(now.getFullYear(), quarter);
}

function isPointInRange(value: string | null | undefined, range: ReportRange) {
  const date = asDate(value);
  if (!date) {
    return false;
  }

  return date >= range.start && date < range.end;
}

function overlapsReportRange(start: string | null | undefined, end: string | null | undefined, range: ReportRange) {
  return overlapsRange(start, end, range.start, range.end);
}

function getRequestReportDate(request: RequestRecord) {
  return request.desiredLiveDate ?? request.frontendEndDate ?? request.backendEndDate ?? request.createdAt;
}

function getProjectReportDate(project: ProjectRecord) {
  return (
    project.actualLiveDate ??
    project.plannedLiveDate ??
    project.requestedLiveDate ??
    project.frontendEndDate ??
    project.backendEndDate ??
    project.plannedStartDate
  );
}

function getTimelineBucketKey(date: Date, granularity: ReportingGranularity) {
  const bucketDate = granularity === 'weekly' ? startOfWeek(date) : startOfDay(date);

  return bucketDate.toISOString();
}

function getTimelineBucketLabel(date: Date, granularity: ReportingGranularity) {
  if (granularity === 'weekly') {
    return `Week of ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  }

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function enumerateDays(start: Date, endExclusive: Date) {
  const dates: Date[] = [];
  const cursor = startOfDay(start);

  while (cursor < endExclusive) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function buildWorkloadTimeline(
  assignments: RequestAssignmentRecord[],
  range: ReportRange,
  granularity: ReportingGranularity,
) {
  const bucketOrder = new Map<string, Date>();
  const bucketValues = new Map<string, { key: string; label: string; plannedMd: number; actualMd: number; assignments: number }>();

  for (const day of enumerateDays(range.start, range.end)) {
    const key = getTimelineBucketKey(day, granularity);

    if (!bucketValues.has(key)) {
      const bucketDate = granularity === 'weekly' ? startOfWeek(day) : startOfDay(day);
      bucketOrder.set(key, bucketDate);
      bucketValues.set(key, {
        key,
        label: getTimelineBucketLabel(bucketDate, granularity),
        plannedMd: 0,
        actualMd: 0,
        assignments: 0,
      });
    }
  }

  for (const assignment of assignments) {
    const startDate = asDate(assignment.startDate);
    const endDate = asDate(assignment.endDate);

    if (!startDate || !endDate) {
      continue;
    }

    const effectiveStart = startDate > range.start ? startDate : range.start;
    const effectiveEnd = endDate < range.end ? endDate : new Date(range.end.getTime() - 1);

    if (effectiveStart > effectiveEnd) {
      continue;
    }

    const totalDays = Math.max(
      1,
      Math.ceil((endOfDayExclusive(endDate).getTime() - startOfDay(startDate).getTime()) / 86400000),
    );
    const plannedPerDay = (assignment.plannedMd ?? 0) / totalDays;
    const actualPerDay = (assignment.actualMd ?? 0) / totalDays;

    for (const day of enumerateDays(effectiveStart, endOfDayExclusive(effectiveEnd))) {
      const key = getTimelineBucketKey(day, granularity);
      const bucket = bucketValues.get(key);

      if (!bucket) {
        continue;
      }

      bucket.plannedMd += plannedPerDay;
      bucket.actualMd += actualPerDay;
      bucket.assignments += 1;
    }
  }

  return Array.from(bucketValues.values())
    .sort((left, right) => (bucketOrder.get(left.key)?.getTime() ?? 0) - (bucketOrder.get(right.key)?.getTime() ?? 0))
    .map((bucket) => ({
      ...bucket,
      plannedMd: Number(bucket.plannedMd.toFixed(2)),
      actualMd: Number(bucket.actualMd.toFixed(2)),
    }));
}

function computeFeComplexityScore(assignment: RequestAssignmentRecord) {
  const profile = assignment.feProfile;

  if (!profile) {
    return 0;
  }

  return Number(
    (
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
      (profile.heavyAssets ? 1 : 0)
    ).toFixed(2),
  );
}

function computeBeComplexityScore(assignment: RequestAssignmentRecord) {
  const profile = assignment.beProfile;

  if (!profile) {
    return 0;
  }

  return Number(
    (
      (profile.userActions ?? 0) * 1 +
      (profile.businessLogicComplexity ?? 0) * 1.8 +
      (profile.dbTables ?? 0) * 1.1 +
      (profile.apis ?? 0) * 1.3 +
      (profile.requirementClarity ?? 0) * 0.7 +
      (profile.changeFrequency ?? 0) * 1.2 +
      (profile.timelinePressure ?? 0) * 1.3 +
      (profile.realtime ? 1.5 : 0)
    ).toFixed(2),
  );
}

function computeSystemComplexityScore(assignment: RequestAssignmentRecord) {
  const profile = assignment.systemProfile;

  if (!profile) {
    return 0;
  }

  return Number(
    (
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
      (profile.timelinePressure ?? 0) * 1.2
    ).toFixed(2),
  );
}

function resolveAssignmentWorkType(assignment: RequestAssignmentRecord) {
  const normalized = (assignment.workType ?? '').toLowerCase();

  if (normalized === 'frontend' || normalized === 'backend' || normalized === 'system') {
    return normalized;
  }

  const roleType = (assignment.roleType ?? '').toLowerCase();
  if (roleType.includes('frontend') || roleType.includes('fe')) {
    return 'frontend';
  }
  if (roleType.includes('backend') || roleType.includes('be')) {
    return 'backend';
  }

  return 'event';
}

function toPerformanceTimelinePoint(
  assignment: RequestAssignmentRecord,
): PerformanceTimelinePoint | null {
  const actualMd = assignment.actualMd ?? 0;

  if (actualMd <= 0) {
    return null;
  }

  const complexityScore = assignment.feProfile
    ? computeFeComplexityScore(assignment)
    : assignment.beProfile
      ? computeBeComplexityScore(assignment)
      : assignment.systemProfile
        ? computeSystemComplexityScore(assignment)
      : 0;

  if (complexityScore <= 0) {
    return null;
  }

  const pointDate =
    assignment.endDate ?? assignment.startDate ?? assignment.updatedAt ?? assignment.createdAt;

  if (!pointDate) {
    return null;
  }

  return {
    assignmentId: assignment.id,
    label: formatDate(pointDate),
    date: pointDate,
    memberId: assignment.member.id,
    memberName: assignment.member.displayName || assignment.member.email,
    projectCode: assignment.project.projectCode,
    requestCode: assignment.request.requestCode,
    actualMd,
    complexityScore,
    efficiency: Number((actualMd / complexityScore).toFixed(2)),
  };
}

function variance(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const average = values.reduce((total, value) => total + value, 0) / values.length;

  return Number(
    (
      values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length
    ).toFixed(2),
  );
}

function isDeliveryMemberTeamCode(teamCode?: string | null) {
  return teamCode === DELIVERY_TEAM_CODE;
}

function buildPerformanceMemberStats(points: PerformanceTimelinePoint[], assignments: RequestAssignmentRecord[]) {
  const assignmentById = new Map(assignments.map((item) => [item.id, item]));
  const grouped = new Map<
    string,
    {
      member: PerformanceMemberStat['member'];
      points: PerformanceTimelinePoint[];
    }
  >();

  for (const point of points) {
    const assignment = assignmentById.get(point.assignmentId);
    const current = grouped.get(point.memberId) ?? {
      member: {
        id: point.memberId,
        displayName: point.memberName,
        email: assignment?.member.email ?? '',
        team: assignment?.member.team
          ? {
              id: assignment.member.team.id,
              name: assignment.member.team.name,
            }
          : null,
      },
      points: [],
    };

    current.points.push(point);
    grouped.set(point.memberId, current);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      member: entry.member,
      taskCount: entry.points.length,
      averageEfficiency: Number(
        (
          entry.points.reduce((total, point) => total + point.efficiency, 0) / entry.points.length
        ).toFixed(2),
      ),
      efficiencyVariance: variance(entry.points.map((point) => point.efficiency)),
      totalActualMd: Number(
        entry.points.reduce((total, point) => total + point.actualMd, 0).toFixed(2),
      ),
      totalComplexityScore: Number(
        entry.points.reduce((total, point) => total + point.complexityScore, 0).toFixed(2),
      ),
    }))
    .sort((left, right) => left.averageEfficiency - right.averageEfficiency);
}

export default function ReportsPage() {
  usePageTitle('Reports');
  const { hasPermission } = usePermissions();
  const dashboard = useDashboardData();
  const [preset, setPreset] = useState('current_quarter');
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [workloadGranularity, setWorkloadGranularity] =
    useState<ReportingGranularity>('weekly');
  const [selectedWorkloadTeam, setSelectedWorkloadTeam] = useState<string | undefined>(undefined);
  const [selectedWorkloadMember, setSelectedWorkloadMember] = useState<string | undefined>(undefined);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [performanceMembers, setPerformanceMembers] = useState<PerformanceMemberStat[]>([]);
  const [selectedPerformanceMember, setSelectedPerformanceMember] = useState<string | undefined>(undefined);

  const canSeeRequests = hasPermission('requests:view');
  const canSeeProjects = hasPermission('projects:view');
  const canSeeAllocations = hasPermission('allocations:view');
  const canSeeIncidents = hasPermission('incidents:view');
  const canSeeLeaves = hasPermission('leaves:view');
  const canSeeAssignmentWorkload = hasPermission('projects:view');
  const canSeePerformance = hasPermission('projects:view');
  const canAccessReports =
    canSeeRequests || canSeeProjects || canSeeAssignmentWorkload || canSeeAllocations || canSeeIncidents || canSeeLeaves;

  const requests = dashboard.requests as RequestRecord[];
  const projects = dashboard.projects as ProjectRecord[];
  const projectEvents = dashboard.projectEvents as ProjectEventRecord[];
  const requestAssignments = dashboard.requestAssignments as RequestAssignmentRecord[];
  const incidents = dashboard.incidents as IncidentRecord[];
  const leaves = dashboard.leaves as LeaveRecord[];

  const todayStart = useMemo(() => startOfToday(), []);
  const reportRange = useMemo<ReportRange>(() => {
    if (customRange) {
      return createCustomRange(customRange[0], customRange[1]);
    }

    if (selectedMonth !== undefined) {
      return getMonthRange(currentYear, selectedMonth);
    }

    return getPresetRange(preset);
  }, [customRange, preset, selectedMonth]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => isPointInRange(getRequestReportDate(request), reportRange)),
    [reportRange, requests],
  );
  const filteredProjects = useMemo(
    () => projects.filter((project) => isPointInRange(getProjectReportDate(project), reportRange)),
    [projects, reportRange],
  );
  const filteredProjectEvents = useMemo(
    () => projectEvents.filter((event) => isPointInRange(event.eventAt, reportRange)),
    [projectEvents, reportRange],
  );
  const filteredRequestAssignments = useMemo(
    () =>
      requestAssignments.filter((assignment) =>
        isDeliveryMemberTeamCode(assignment.member.team?.code) &&
        overlapsReportRange(assignment.startDate, assignment.endDate, reportRange)
      ),
    [reportRange, requestAssignments],
  );
  const filteredIncidents = useMemo(
    () => incidents.filter((incident) => isPointInRange(incident.foundAt, reportRange)),
    [incidents, reportRange],
  );
  const filteredLeaves = useMemo(
    () =>
      leaves.filter((leave) =>
        overlapsReportRange(leave.startDate, leave.endDate, reportRange),
      ),
    [leaves, reportRange],
  );

  const activeProjects = useMemo(
    () =>
      filteredProjects.filter((project) => {
        const status = (project.status ?? '').toLowerCase();
        return status ? !['done', 'closed', 'cancelled', 'canceled'].includes(status) : true;
      }),
    [filteredProjects],
  );

  const requestByStatus = useMemo(
    () => countBy(filteredRequests, (item) => item.status),
    [filteredRequests],
  );
  const requestByPriority = useMemo(
    () => countBy(filteredRequests, (item) => item.priority),
    [filteredRequests],
  );
  const requestByTeam = useMemo(
    () => countBy(filteredRequests, (item) => item.requesterTeam?.name),
    [filteredRequests],
  );
  const requestByType = useMemo(
    () => countBy(filteredRequests, (item) => item.requestType),
    [filteredRequests],
  );
  const requestVolumePerProject = useMemo(
    () => {
      const projectSummaries = new Map<string, { code: string; name: string }>();
      const counts = new Map<string, number>();

      for (const request of filteredRequests) {
        const projectId = request.projectId ?? request.project?.id;

        if (projectId) {
          counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
          projectSummaries.set(projectId, {
            code: request.project?.projectCode ?? projectId.slice(0, 8),
            name: request.project?.name ?? 'Linked Project',
          });
        }
      }

      return Array.from(counts.entries())
        .map(([projectId, value]) => ({
          name: projectSummaries.get(projectId)?.code ?? projectId.slice(0, 8),
          value,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 10);
    },
    [filteredRequests],
  );
  const requestStatusByProject = useMemo(() => {
    const statusSet = new Set<string>();
    const requestsByProject = new Map<string, RequestRecord[]>();
    const projectSummaries = new Map<string, { code: string; name: string }>();

    for (const request of filteredRequests) {
      const projectId = request.projectId ?? request.project?.id;

      if (!projectId) {
        continue;
      }

      requestsByProject.set(projectId, [...(requestsByProject.get(projectId) ?? []), request]);
      projectSummaries.set(projectId, {
        code: request.project?.projectCode ?? projectId.slice(0, 8),
        name: request.project?.name ?? 'Linked Project',
      });
    }

    const rows = Array.from(requestsByProject.entries())
      .map(([projectId, projectRequests]) => {
        const row: Record<string, string | number> = {
          name: projectSummaries.get(projectId)?.code ?? projectId.slice(0, 8),
          total: 0,
        };

        for (const request of projectRequests) {
          const status = normalizeLabel(request?.status);
          statusSet.add(status);
          row[status] = ((row[status] as number | undefined) ?? 0) + 1;
          row.total = (row.total as number) + 1;
        }

        return row;
      })
      .filter((row) => (row.total as number) > 0)
      .slice(0, 8);

    return {
      rows,
      statuses: Array.from(statusSet.values()),
    };
  }, [filteredRequests]);

  const projectByStatus = useMemo(
    () => countBy(filteredProjects, (item) => item.status),
    [filteredProjects],
  );
  const projectByOwner = useMemo(
    () => countBy(filteredProjects, (item) => item.pmOwner?.displayName),
    [filteredProjects],
  );
  const timelineHighlightsByType = useMemo(
    () => countBy(filteredProjectEvents, (item) => item.eventType),
    [filteredProjectEvents],
  );

  const liveSummary = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let pending = 0;

    for (const project of filteredProjects) {
      const planned = asDate(project.plannedLiveDate);
      const actual = asDate(project.actualLiveDate);

      if (!planned || !actual) {
        pending += 1;
        continue;
      }

      if (actual <= planned) {
        onTime += 1;
      } else {
        late += 1;
      }
    }

    return [
      { name: 'On time', value: onTime },
      { name: 'Late', value: late },
      { name: 'Pending actual date', value: pending },
    ];
  }, [filteredProjects]);

  const workloadByMember = useMemo(() => {
    const grouped = new Map<
      string,
      { key: string; member: string; team: string; allocationPct: number; plannedMd: number; actualMd: number }
    >();

    for (const item of filteredRequestAssignments) {
      const key = item.member.id;
      const existing = grouped.get(key) ?? {
        key,
        member: item.member.displayName || item.member.email,
        team: item.member.team?.name ?? '-',
        allocationPct: 0,
        plannedMd: 0,
        actualMd: 0,
      };

      existing.allocationPct += (item.plannedMd ?? 0) * 10;
      existing.plannedMd += item.plannedMd ?? 0;
      existing.actualMd += item.actualMd ?? 0;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values()).sort((left, right) => right.allocationPct - left.allocationPct);
  }, [filteredRequestAssignments]);

  const workloadByTeam = useMemo(() => {
    const grouped = new Map<string, { name: string; value: number; actual: number }>();

    for (const item of filteredRequestAssignments) {
      const name = item.member.team?.name ?? 'Unassigned';
      grouped.set(name, {
        name,
        value: (grouped.get(name)?.value ?? 0) + (item.plannedMd ?? 0),
        actual: (grouped.get(name)?.actual ?? 0) + (item.actualMd ?? 0),
      });
    }

    return Array.from(grouped.values()).sort((left, right) => right.value - left.value);
  }, [filteredRequestAssignments]);

  const utilizationSummary = useMemo(() => {
    const overloaded = workloadByMember.filter((item) => item.allocationPct > 100).length;
    const underutilized = workloadByMember.filter(
      (item) => item.allocationPct > 0 && item.allocationPct < 50,
    ).length;
    const fullyLoaded = workloadByMember.filter(
      (item) => item.allocationPct >= 80 && item.allocationPct <= 100,
    ).length;

    return { overloaded, underutilized, fullyLoaded };
  }, [workloadByMember]);

  const incidentsBySeverity = useMemo(
    () => countBy(filteredIncidents, (item) => item.severity),
    [filteredIncidents],
  );
  const incidentsByDomain = useMemo(
    () => countBy(filteredIncidents, (item) => item.domain),
    [filteredIncidents],
  );
  const incidentTrend = useMemo(() => toTrendData(filteredIncidents), [filteredIncidents]);

  const leaveByType = useMemo(
    () => countBy(filteredLeaves, (item) => item.leaveType),
    [filteredLeaves],
  );
  const leaveStartsInRange = useMemo(
    () => filteredLeaves.filter((leave) => isPointInRange(leave.startDate, reportRange)).length,
    [filteredLeaves, reportRange],
  );
  const upcomingLeaves = useMemo(
    () =>
      filteredLeaves
        .filter((leave) => {
          const startDate = asDate(leave.startDate);
          return startDate ? startDate >= todayStart : false;
        })
        .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())
        .slice(0, 8),
    [filteredLeaves, todayStart],
  );

  const valueVsEffort = useMemo(() => {
    const effortByRequest = new Map<string, number>();

    for (const item of filteredRequestAssignments) {
      effortByRequest.set(item.request.id, (effortByRequest.get(item.request.id) ?? 0) + (item.plannedMd ?? 0));
    }

    return filteredRequests
      .map((request) => ({
        name: request.requestCode,
        value: request.businessValueScore ?? 0,
        urgency: request.urgencyScore ?? 0,
        effort: effortByRequest.get(request.id) ?? 0,
      }))
      .filter((item): item is { name: string; value: number; urgency: number; effort: number } =>
        Boolean(item && (item.value > 0 || item.effort > 0 || item.urgency > 0)),
      );
  }, [filteredRequestAssignments, filteredRequests]);
  const plannedVsActualSummary = useMemo(
    () => [
      { name: 'Planned MD', value: sumBy(filteredRequestAssignments, (item) => item.plannedMd) },
      { name: 'Actual MD', value: sumBy(filteredRequestAssignments, (item) => item.actualMd) },
    ],
    [filteredRequestAssignments],
  );
  const complexityCoverage = useMemo(() => {
    const feProfiles = filteredRequestAssignments.filter((item) => item.feProfile).length;
    const beProfiles = filteredRequestAssignments.filter((item) => item.beProfile).length;
    const systemProfiles = filteredRequestAssignments.filter((item) => item.systemProfile).length;

    return [
      { name: 'FE Profiles', value: feProfiles },
      { name: 'BE Profiles', value: beProfiles },
      { name: 'System Profiles', value: systemProfiles },
      { name: 'No Profile', value: filteredRequestAssignments.length - feProfiles - beProfiles - systemProfiles },
    ];
  }, [filteredRequestAssignments]);
  const complexityIntensity = useMemo(
    () => [
      {
        name: 'FE Avg Pressure',
        value: Number(
          averageBy(
            filteredRequestAssignments.filter((item) => item.feProfile),
            (item) => item.feProfile?.timelinePressure,
          ).toFixed(1),
        ),
      },
      {
        name: 'BE Avg Pressure',
        value: Number(
          averageBy(
            filteredRequestAssignments.filter((item) => item.beProfile),
            (item) => item.beProfile?.timelinePressure,
          ).toFixed(1),
        ),
      },
      {
        name: 'System Avg Pressure',
        value: Number(
          averageBy(
            filteredRequestAssignments.filter((item) => item.systemProfile),
            (item) => item.systemProfile?.timelinePressure,
          ).toFixed(1),
        ),
      },
      {
        name: 'Avg Planned MD',
        value: Number(averageBy(filteredRequestAssignments, (item) => item.plannedMd).toFixed(1)),
      },
    ],
    [filteredRequestAssignments],
  );
  const workTypeSummary = useMemo(() => {
    const grouped = new Map<string, { name: string; plannedMd: number; actualMd: number; assignments: number }>();

    for (const item of filteredRequestAssignments) {
      const workType = resolveAssignmentWorkType(item);
      const normalized = workType === 'system' ? 'System work' : 'Event work';
      const existing = grouped.get(normalized) ?? {
        name: normalized,
        plannedMd: 0,
        actualMd: 0,
        assignments: 0,
      };

      existing.plannedMd += item.plannedMd ?? 0;
      existing.actualMd += item.actualMd ?? 0;
      existing.assignments += 1;
      grouped.set(normalized, existing);
    }

    return Array.from(grouped.values());
  }, [filteredRequestAssignments]);
  const effortVsUncertainty = useMemo(
    () =>
      filteredRequestAssignments
        .filter((item) => item.uncertaintyLevel && ((item.plannedMd ?? 0) > 0 || (item.actualMd ?? 0) > 0))
        .map((item) => ({
          name: item.request.requestCode,
          uncertainty: item.uncertaintyLevel as number,
          effort: Number(((item.actualMd ?? item.plannedMd ?? 0)).toFixed(2)),
          workType: resolveAssignmentWorkType(item),
        })),
    [filteredRequestAssignments],
  );
  const predictabilityByUncertainty = useMemo(() => {
    const buckets = new Map<number, { level: number; varianceSum: number; count: number }>();

    for (const item of filteredRequestAssignments) {
      if (!item.uncertaintyLevel || item.plannedMd == null || item.actualMd == null || item.plannedMd <= 0) {
        continue;
      }

      const bucket = buckets.get(item.uncertaintyLevel) ?? {
        level: item.uncertaintyLevel,
        varianceSum: 0,
        count: 0,
      };

      bucket.varianceSum += Math.abs(item.actualMd - item.plannedMd) / item.plannedMd;
      bucket.count += 1;
      buckets.set(item.uncertaintyLevel, bucket);
    }

    return Array.from(buckets.values())
      .sort((left, right) => left.level - right.level)
      .map((bucket) => ({
        name: `Level ${bucket.level}`,
        value: Number(((1 - bucket.varianceSum / bucket.count) * 100).toFixed(1)),
      }));
  }, [filteredRequestAssignments]);

  const recentRequests = useMemo(
    () =>
      [...filteredRequests]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6),
    [filteredRequests],
  );

  const recentIncidents = useMemo(
    () =>
      [...filteredIncidents]
        .sort((left, right) => new Date(right.foundAt).getTime() - new Date(left.foundAt).getTime())
        .slice(0, 6),
    [filteredIncidents],
  );

  const workloadTeamOptions = useMemo(
    () =>
      Array.from(
        new Map(
          filteredRequestAssignments.map((assignment) => {
            const team = assignment.member.team;
            return [team?.id ?? team?.name ?? 'unassigned', { value: team?.id ?? 'unassigned', label: team?.name ?? 'Unassigned' }];
          }),
        ).values(),
      ),
    [filteredRequestAssignments],
  );

  const assignmentsForSelectedTeam = useMemo(
    () =>
      filteredRequestAssignments.filter((assignment) => {
        if (!selectedWorkloadTeam) {
          return true;
        }

        const teamId = assignment.member.team?.id ?? 'unassigned';

        return teamId === selectedWorkloadTeam;
      }),
    [filteredRequestAssignments, selectedWorkloadTeam],
  );

  const workloadMemberOptions = useMemo(
    () =>
      Array.from(
        new Map(
          assignmentsForSelectedTeam.map((assignment) => [
            assignment.member.id,
            {
              value: assignment.member.id,
              label: assignment.member.displayName || assignment.member.email,
            },
          ]),
        ).values(),
      ),
    [assignmentsForSelectedTeam],
  );

  useEffect(() => {
    if (selectedWorkloadTeam && !workloadTeamOptions.some((item) => item.value === selectedWorkloadTeam)) {
      setSelectedWorkloadTeam(undefined);
    }
  }, [selectedWorkloadTeam, workloadTeamOptions]);

  useEffect(() => {
    if (selectedWorkloadMember && !workloadMemberOptions.some((item) => item.value === selectedWorkloadMember)) {
      setSelectedWorkloadMember(undefined);
      return;
    }

    if (!selectedWorkloadMember && workloadMemberOptions.length > 0) {
      setSelectedWorkloadMember(workloadMemberOptions[0].value);
    }
  }, [selectedWorkloadMember, workloadMemberOptions]);

  useEffect(() => {
    if (!canSeePerformance) {
      setPerformanceMembers([]);
      setPerformanceError(null);
      setPerformanceLoading(false);
      return;
    }

    let cancelled = false;

    const loadPerformance = async () => {
      setPerformanceLoading(true);
      setPerformanceError(null);

      try {
        const report = await fetchPerformanceReport();

        if (cancelled) {
          return;
        }

        setPerformanceMembers(report.members);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unable to load developer performance data.';
        setPerformanceError(message);
      } finally {
        if (!cancelled) {
          setPerformanceLoading(false);
        }
      }
    };

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [canSeePerformance]);

  const assignmentsForSelectedMember = useMemo(
    () =>
      filteredRequestAssignments.filter((assignment) => {
        if (!selectedWorkloadMember) {
          return false;
        }

        return assignment.member.id === selectedWorkloadMember;
      }),
    [filteredRequestAssignments, selectedWorkloadMember],
  );

  const teamWorkloadTimeline = useMemo(
    () => buildWorkloadTimeline(assignmentsForSelectedTeam, reportRange, workloadGranularity),
    [assignmentsForSelectedTeam, reportRange, workloadGranularity],
  );

  const memberWorkloadTimeline = useMemo(
    () => buildWorkloadTimeline(assignmentsForSelectedMember, reportRange, workloadGranularity),
    [assignmentsForSelectedMember, reportRange, workloadGranularity],
  );

  const performanceBarData = useMemo(
    () =>
      buildPerformanceMemberStats(
        filteredRequestAssignments
          .map((assignment) => toPerformanceTimelinePoint(assignment))
          .filter((point): point is PerformanceTimelinePoint => Boolean(point)),
        filteredRequestAssignments,
      )
        .map((item) => ({
          name: item.member.displayName || item.member.email,
          efficiency: Number(item.averageEfficiency.toFixed(2)),
          variance: Number(item.efficiencyVariance.toFixed(2)),
          taskCount: item.taskCount,
        }))
        .sort((left, right) => left.efficiency - right.efficiency),
    [filteredRequestAssignments],
  );

  const performanceRangeMembers = useMemo(
    () =>
      buildPerformanceMemberStats(
        filteredRequestAssignments
          .map((assignment) => toPerformanceTimelinePoint(assignment))
          .filter((point): point is PerformanceTimelinePoint => Boolean(point)),
        filteredRequestAssignments,
      ),
    [filteredRequestAssignments],
  );

  const performanceMemberOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [...performanceRangeMembers, ...performanceMembers].map((item) => [
            item.member.id,
            {
              value: item.member.id,
              label: `${item.member.displayName || item.member.email} · ${item.member.team?.name ?? 'Unassigned'}`,
            },
          ]),
        ).values(),
      ),
    [performanceMembers, performanceRangeMembers],
  );

  useEffect(() => {
    if (
      selectedPerformanceMember &&
      !performanceMemberOptions.some((item) => item.value === selectedPerformanceMember)
    ) {
      setSelectedPerformanceMember(undefined);
      return;
    }

    if (!selectedPerformanceMember && performanceMemberOptions.length > 0) {
      setSelectedPerformanceMember(performanceMemberOptions[0].value);
    }
  }, [performanceMemberOptions, selectedPerformanceMember]);

  const performanceTimelineData = useMemo(
    () =>
      filteredRequestAssignments
        .map((assignment) => toPerformanceTimelinePoint(assignment))
        .filter((point): point is PerformanceTimelinePoint => Boolean(point))
        .filter((point) =>
          selectedPerformanceMember ? point.memberId === selectedPerformanceMember : true,
        )
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
    [filteredRequestAssignments, selectedPerformanceMember],
  );

  const performanceScatterData = useMemo(
    () =>
      filteredRequestAssignments
        .map((assignment) => toPerformanceTimelinePoint(assignment))
        .filter((point): point is PerformanceTimelinePoint => Boolean(point))
        .filter((point) =>
          selectedPerformanceMember ? point.memberId === selectedPerformanceMember : true,
        )
        .map((point) => ({
          ...point,
          x: point.complexityScore,
          y: point.actualMd,
        })),
    [filteredRequestAssignments, selectedPerformanceMember],
  );

  const selectedPerformanceMemberSummary = useMemo(
    () =>
      performanceRangeMembers.find((item) => item.member.id === selectedPerformanceMember) ??
      performanceMembers.find((item) => item.member.id === selectedPerformanceMember) ??
      null,
    [performanceMembers, performanceRangeMembers, selectedPerformanceMember],
  );

  const topSummaryCards = [
    canSeeRequests
      ? {
          key: 'openRequests',
          label: 'Open requests',
          value: String(
            filteredRequests.filter((request) =>
              !['done', 'closed', 'cancelled', 'canceled'].includes((request.status ?? '').toLowerCase()),
            ).length,
          ),
          hint: `Visible in ${reportRange.label}`,
          icon: <BarChartOutlined />,
        }
      : null,
    canSeeProjects
      ? {
          key: 'activeProjects',
          label: 'Active projects',
          value: String(activeProjects.length),
          hint: `Projects in ${reportRange.label}`,
          icon: <ProjectOutlined />,
        }
      : null,
    canSeeIncidents
      ? {
          key: 'incidentsInRange',
          label: 'Incidents in range',
          value: String(filteredIncidents.length),
          hint: reportRange.label,
          icon: <AlertOutlined />,
        }
      : null,
    canSeeLeaves
      ? {
          key: 'leaveInRange',
          label: 'Leave records in range',
          value: String(filteredLeaves.length),
          hint: reportRange.label,
          icon: <CalendarOutlined />,
        }
      : null,
    canSeeAssignmentWorkload
      ? {
          key: 'currentAssignments',
          label: 'Assignments in range',
          value: String(filteredRequestAssignments.length),
          hint: reportRange.label,
          icon: <TeamOutlined />,
        }
      : null,
    canSeeAssignmentWorkload
      ? {
          key: 'avgAssignmentLoad',
          label: 'Average load',
          value:
            workloadByMember.length > 0
              ? formatPct(
                  workloadByMember.reduce((total, item) => total + item.allocationPct, 0) /
                    workloadByMember.length,
                )
              : '0%',
          hint: `From active workload in ${reportRange.label}`,
          icon: <PieChartOutlined />,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; hint: string; icon: React.ReactNode }>;

  const requestColumns: ColumnsType<RequestRecord> = [
    {
      title: 'Request',
      key: 'request',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.requestCode}</Text>
          <Text type="secondary">{record.title}</Text>
        </Space>
      ),
    },
    {
      title: 'Team',
      dataIndex: ['requesterTeam', 'name'],
      render: (value) => value ?? '-',
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, record) => record.project ? `${record.project.projectCode} · ${record.project.name}` : '-',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (value) => <Tag color={statusColor(value)}>{normalizeLabel(value)}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Tag color={statusColor(value)}>{normalizeLabel(value)}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (value) => formatDateTime(value),
    },
  ];

  const incidentColumns: ColumnsType<IncidentRecord> = [
    {
      title: 'Incident',
      key: 'incident',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.incidentCode}</Text>
          <Text type="secondary">{record.project.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      render: (value) => <Tag color={statusColor(value)}>{normalizeLabel(value)}</Tag>,
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      render: (value) => value ?? '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Tag color={statusColor(value)}>{normalizeLabel(value)}</Tag>,
    },
    {
      title: 'Found at',
      dataIndex: 'foundAt',
      render: (value) => formatDateTime(value),
    },
  ];

  const leaveColumns: ColumnsType<LeaveRecord> = [
    {
      title: 'Member',
      key: 'member',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.member.displayName}</Text>
          <Text type="secondary">{record.member.team?.name ?? record.member.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Leave type',
      dataIndex: 'leaveType',
      render: (value) => normalizeLabel(value),
    },
    {
      title: 'Range',
      key: 'range',
      render: (_, record) => `${formatDate(record.startDate)} - ${formatDate(record.endDate)}`,
    },
    {
      title: 'Note',
      dataIndex: 'note',
      render: (value) => value ?? '-',
    },
  ];

  const workloadColumns: ColumnsType<(typeof workloadByMember)[number]> = [
    {
      title: 'Member',
      dataIndex: 'member',
    },
    {
      title: 'Team',
      dataIndex: 'team',
    },
    {
      title: 'Allocation',
      dataIndex: 'allocationPct',
      render: (value) => <Tag color={value > 100 ? 'red' : value >= 80 ? 'green' : 'gold'}>{formatPct(value)}</Tag>,
    },
    {
      title: 'Planned MD',
      dataIndex: 'plannedMd',
      render: (value) => value.toFixed(1),
    },
    {
      title: 'Actual MD',
      dataIndex: 'actualMd',
      render: (value) => value.toFixed(1),
    },
  ];

  return (
    <PermissionBoundary
      allowed={canAccessReports}
      title="You do not have access to reporting"
      subtitle="Reports are built from the modules you can view. Ask an administrator for the needed access."
    >
      <ResourcePageLayout
        eyebrow="Leadership Reporting"
        title="Reports"
        description="Operational reporting for demand, delivery, workload, incidents, leave impact, and overall execution health."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void dashboard.refresh()} loading={dashboard.loading}>
            Refresh
          </Button>
        }
      >
        {dashboard.error ? (
          <Alert
            type="warning"
            showIcon
            message="Some report data could not be loaded"
            description={dashboard.error.message}
          />
        ) : null}

        <ReportingFilterBar
          preset={preset}
          month={selectedMonth}
          range={customRange}
          granularity={workloadGranularity}
          rangeLabel={reportRange.label}
          onPresetChange={(value) => {
            setPreset(value);
            setSelectedMonth(undefined);
            setCustomRange(null);
          }}
          onMonthChange={(value) => {
            setSelectedMonth(value);
            setCustomRange(null);
            if (value !== undefined) {
              setPreset('current_quarter');
            }
          }}
          onRangeChange={(value) => {
            setCustomRange(value);
            if (value) {
              setSelectedMonth(undefined);
            }
          }}
          onGranularityChange={setWorkloadGranularity}
          onReset={() => {
            setPreset('current_quarter');
            setSelectedMonth(undefined);
            setCustomRange(null);
            setWorkloadGranularity('weekly');
          }}
        />

        <Row gutter={[16, 16]}>
          {topSummaryCards.map((card) => (
            <Col xs={24} sm={12} xl={8} xxl={4} key={card.key}>
              <DashboardMetricCard
                label={card.label}
                value={card.value}
                hint={card.hint}
                icon={card.icon}
              />
            </Col>
          ))}
        </Row>

        {canSeeRequests ? (
          <DashboardSection
            title="Request reporting"
            description="Demand flow by current status, priority mix, team distribution, and request type."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Requests by status"
                  loading={dashboard.loading}
                  empty={requestByStatus.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={requestByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Requests by priority"
                  loading={dashboard.loading}
                  empty={requestByPriority.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={requestByPriority} dataKey="value" nameKey="name" outerRadius={92} label>
                        {requestByPriority.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Requests by team"
                  loading={dashboard.loading}
                  empty={requestByTeam.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={requestByTeam.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Requests by type"
                  loading={dashboard.loading}
                  empty={requestByType.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={requestByType.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Request volume per project"
                  loading={dashboard.loading}
                  empty={requestVolumePerProject.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={requestVolumePerProject}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeeProjects ? (
          <DashboardSection
            title="Project reporting"
            description="Execution health by project status, PM ownership, and planned-live delivery performance."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Projects by status"
                  loading={dashboard.loading}
                  empty={projectByStatus.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={projectByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Projects by PM owner"
                  loading={dashboard.loading}
                  empty={projectByOwner.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={projectByOwner.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Planned live vs actual live"
                  loading={dashboard.loading}
                  empty={liveSummary.every((item) => item.value === 0)}
                >
                  <Row gutter={[16, 16]}>
                    {liveSummary.map((item, index) => (
                      <Col xs={24} md={8} key={item.name}>
                        <DashboardMetricCard
                  label={item.name}
                  value={String(item.value)}
                  hint={reportRange.label}
                  icon={<span style={{ color: chartColors[index % chartColors.length] }}>●</span>}
                />
              </Col>
                    ))}
                  </Row>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Request status by project"
                  loading={dashboard.loading}
                  empty={requestStatusByProject.rows.length === 0}
                  minHeight={280}
                >
                  <Table
                    rowKey="name"
                    size="small"
                    pagination={false}
                    dataSource={requestStatusByProject.rows}
                    columns={[
                      { title: 'Project', dataIndex: 'name', key: 'name' },
                      { title: 'Total', dataIndex: 'total', key: 'total' },
                      ...requestStatusByProject.statuses.map((status) => ({
                        title: status,
                        dataIndex: status,
                        key: status,
                        render: (value: number | undefined) => value ?? 0,
                      })),
                    ]}
                  />
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Project timeline highlights"
                  loading={dashboard.loading}
                  empty={timelineHighlightsByType.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={timelineHighlightsByType.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeeAssignmentWorkload ? (
          <DashboardSection
            title="Workload reporting"
            description="Load split by member and team from request assignments, with planned vs actual effort visibility across the selected reporting range."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Overloaded members"
                  value={String(utilizationSummary.overloaded)}
                  hint="Above 100% allocation"
                  icon={<AlertOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Healthy load band"
                  value={String(utilizationSummary.fullyLoaded)}
                  hint="Between 80% and 100%"
                  icon={<TeamOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Underutilized members"
                  value={String(utilizationSummary.underutilized)}
                  hint="Below 50% allocation"
                  icon={<PieChartOutlined />}
                />
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Workload filters"
                  loading={dashboard.loading}
                  empty={false}
                  minHeight={96}
                >
                  <Space wrap>
                    <Select
                      allowClear
                      placeholder="Filter team"
                      style={{ width: 220 }}
                      options={workloadTeamOptions}
                      value={selectedWorkloadTeam}
                      onChange={(value) => setSelectedWorkloadTeam(value)}
                    />
                    <Select
                      allowClear
                      showSearch
                      placeholder="Filter member"
                      style={{ width: 260 }}
                      options={workloadMemberOptions}
                      value={selectedWorkloadMember}
                      onChange={(value) => setSelectedWorkloadMember(value)}
                      optionFilterProp="label"
                    />
                  </Space>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Workload by member"
                  loading={dashboard.loading}
                  empty={workloadByMember.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={workloadByMember.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={formatPct} />
                      <YAxis dataKey="member" type="category" width={120} />
                      <Tooltip formatter={(value: number) => formatPct(value)} />
                      <Bar dataKey="allocationPct" fill="#0f766e" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Workload by team"
                  loading={dashboard.loading}
                  empty={workloadByTeam.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={workloadByTeam}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#14b8a6" name="Planned MD" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="actual" fill="#f59e0b" name="Actual MD" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title={
                    selectedWorkloadTeam
                      ? 'Team workload over time'
                      : 'All-team workload over time'
                  }
                  loading={dashboard.loading}
                  empty={teamWorkloadTimeline.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={teamWorkloadTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="plannedMd" name="Planned MD" stroke="#0f766e" strokeWidth={3} />
                      <Line type="monotone" dataKey="actualMd" name="Actual MD" stroke="#f59e0b" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Member workload over time"
                  loading={dashboard.loading}
                  empty={memberWorkloadTimeline.length === 0}
                  emptyDescription="Pick a member with assignment data inside the selected range to render this chart."
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={memberWorkloadTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="plannedMd" name="Planned MD" stroke="#2563eb" strokeWidth={3} />
                      <Line type="monotone" dataKey="actualMd" name="Actual MD" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Planned MD vs actual MD"
                  loading={dashboard.loading}
                  empty={plannedVsActualSummary.every((item) => item.value === 0)}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={plannedVsActualSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeeIncidents ? (
          <DashboardSection
            title="Incident reporting"
            description="Operational health view by severity, incident domain, and trend over time."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Incidents by severity"
                  loading={dashboard.loading}
                  empty={incidentsBySeverity.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={incidentsBySeverity} dataKey="value" nameKey="name" outerRadius={92} label>
                        {incidentsBySeverity.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Incidents by domain"
                  loading={dashboard.loading}
                  empty={incidentsByDomain.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={incidentsByDomain}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Incident trend over time"
                  loading={dashboard.loading}
                  empty={incidentTrend.every((item) => item.value === 0)}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={incidentTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeeLeaves ? (
          <DashboardSection
            title="Leave reporting"
            description="Leave impact across the selected range, near-term schedules, and leave-type mix."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Leave records in range"
                  value={String(filteredLeaves.length)}
                  hint={reportRange.label}
                  icon={<CalendarOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Leave starts in range"
                  value={String(leaveStartsInRange)}
                  hint={reportRange.label}
                  icon={<CalendarOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Upcoming leave records"
                  value={String(upcomingLeaves.length)}
                  hint="Near-term leave planning signal"
                  icon={<TeamOutlined />}
                />
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Leave counts by type"
                  loading={dashboard.loading}
                  empty={leaveByType.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={leaveByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Upcoming leaves"
                  loading={dashboard.loading}
                  empty={upcomingLeaves.length === 0}
                  minHeight={280}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={leaveColumns}
                    dataSource={upcomingLeaves}
                  />
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {(canSeeRequests || canSeeProjects || canSeeAssignmentWorkload) ? (
          <DashboardSection
            title="Value and effort"
            description="A practical lens on business value, urgency, and the planned effort currently attached to delivery."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Total planned MD"
                  value={String(sumBy(filteredRequestAssignments, (item) => item.plannedMd).toFixed(1))}
                  hint={reportRange.label}
                  icon={<PieChartOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Average request value"
                  value={
                    filteredRequests.length > 0
                      ? (
                          sumBy(filteredRequests, (item) => item.businessValueScore) /
                          filteredRequests.length
                        ).toFixed(1)
                      : '0.0'
                  }
                  hint="Business value score average"
                  icon={<BarChartOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Average urgency"
                  value={
                    filteredRequests.length > 0
                      ? (
                          sumBy(filteredRequests, (item) => item.urgencyScore) /
                          filteredRequests.length
                        ).toFixed(1)
                      : '0.0'
                  }
                  hint="Urgency score average"
                  icon={<AlertOutlined />}
                />
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Value vs effort summary"
                  loading={dashboard.loading}
                  empty={valueVsEffort.length === 0}
                  emptyDescription="Need linked requests, projects, and allocation effort to render this comparison."
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        dataKey="value"
                        name="Business value"
                        allowDecimals={false}
                      />
                      <YAxis
                        type="number"
                        dataKey="effort"
                        name="Planned MD"
                        allowDecimals={false}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={valueVsEffort} fill="#0f766e" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                    Higher-right items are both valuable and effort-heavy. They typically deserve closer portfolio review.
                  </Paragraph>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Event work vs system work"
                  loading={dashboard.loading}
                  empty={workTypeSummary.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={workTypeSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="plannedMd" fill="#0f766e" name="Planned MD" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="actualMd" fill="#f59e0b" name="Actual MD" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Complexity profile coverage"
                  loading={dashboard.loading}
                  empty={complexityCoverage.every((item) => item.value === 0)}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={complexityCoverage} dataKey="value" nameKey="name" outerRadius={92} label>
                        {complexityCoverage.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Complexity intensity snapshot"
                  loading={dashboard.loading}
                  empty={complexityIntensity.every((item) => item.value === 0)}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={complexityIntensity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Effort vs uncertainty"
                  loading={dashboard.loading}
                  empty={effortVsUncertainty.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" dataKey="uncertainty" name="Uncertainty level" allowDecimals={false} />
                      <YAxis type="number" dataKey="effort" name="Effort (MD)" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={effortVsUncertainty} fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Predictability by uncertainty"
                  loading={dashboard.loading}
                  empty={predictabilityByUncertainty.length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={predictabilityByUncertainty}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis unit="%" />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                    Predictability ở đây được đọc đơn giản là mức actual MD bám gần planned MD. Giá trị cao hơn nghĩa là effort thực tế ổn định hơn ở level uncertainty đó.
                  </Paragraph>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeePerformance ? (
          <DashboardSection
            title="Developer performance"
            description="A simple efficiency view built from request assignments and FE/BE complexity profiles within the selected reporting range."
          >
            {performanceError ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Developer performance data could not be loaded"
                description={performanceError}
              />
            ) : null}

            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <DashboardPanel
                  title="Performance filters"
                  loading={performanceLoading}
                  empty={false}
                  minHeight={96}
                >
                  <Space wrap align="center">
                    <Select
                      allowClear
                      showSearch
                      placeholder="Filter member"
                      style={{ width: 320 }}
                      options={performanceMemberOptions}
                      value={selectedPerformanceMember}
                      onChange={(value) => setSelectedPerformanceMember(value)}
                      optionFilterProp="label"
                    />
                    <Text type="secondary">Range: {reportRange.label}</Text>
                  </Space>
                </DashboardPanel>
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Measured members"
                  value={String(performanceRangeMembers.length)}
                  hint={reportRange.label}
                  icon={<TeamOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Selected member tasks"
                  value={String(selectedPerformanceMemberSummary?.taskCount ?? 0)}
                  hint="Assignments with actual effort and complexity"
                  icon={<BarChartOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Selected avg efficiency"
                  value={(selectedPerformanceMemberSummary?.averageEfficiency ?? 0).toFixed(2)}
                  hint="Actual MD divided by complexity score"
                  icon={<ProjectOutlined />}
                />
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Average efficiency by member"
                  extra={
                    <AntTooltip title="Efficiency = actual MD / complexity score. Lower values mean the same complexity was delivered with fewer man-days.">
                      <InfoCircleOutlined />
                    </AntTooltip>
                  }
                  loading={performanceLoading}
                  empty={performanceBarData.length === 0}
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={performanceBarData} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#0f766e" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24} lg={12}>
                <DashboardPanel
                  title="Efficiency over time"
                  loading={dashboard.loading}
                  empty={performanceTimelineData.length === 0}
                  emptyDescription="Pick a member with measured assignments inside the current range."
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={performanceTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(2)}
                        labelFormatter={(value) => `Date: ${value}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="efficiency"
                        name="Efficiency"
                        stroke="#2563eb"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardPanel>
              </Col>
              <Col xs={24}>
                <DashboardPanel
                  title="Complexity vs actual MD"
                  loading={dashboard.loading}
                  empty={performanceScatterData.length === 0}
                  emptyDescription="Need assignments with actual MD and FE/BE profiles to render this chart."
                >
                  <ResponsiveContainer width="100%" height={340}>
                    <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" dataKey="x" name="Complexity score" />
                      <YAxis type="number" dataKey="y" name="Actual MD" />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value: number) => value.toFixed(2)}
                      />
                      <Scatter data={performanceScatterData} fill="#f59e0b" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                    Mỗi điểm là một assignment. Điểm càng lên cao thì actual MD càng lớn; điểm càng sang phải thì complexity càng cao.
                  </Paragraph>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        <DashboardSection
          title="Recent activity"
          description="Short tables for fast review of the latest demand, incidents, and workload pressure."
        >
          <Row gutter={[16, 16]}>
            {canSeeRequests ? (
              <Col xs={24} xl={12}>
                <DashboardPanel
                  title="Recent requests"
                  loading={dashboard.loading}
                  empty={recentRequests.length === 0}
                  minHeight={280}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={requestColumns}
                    dataSource={recentRequests}
                  />
                </DashboardPanel>
              </Col>
            ) : null}
            {canSeeIncidents ? (
              <Col xs={24} xl={12}>
                <DashboardPanel
                  title="Recent incidents"
                  loading={dashboard.loading}
                  empty={recentIncidents.length === 0}
                  minHeight={280}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={incidentColumns}
                    dataSource={recentIncidents}
                  />
                </DashboardPanel>
              </Col>
            ) : null}
            {canSeeAssignmentWorkload ? (
              <Col xs={24}>
                <DashboardPanel
                  title="Member workload summary"
                  loading={dashboard.loading}
                  empty={workloadByMember.length === 0}
                  minHeight={280}
                >
                  <Table
                    rowKey="key"
                    size="small"
                    pagination={false}
                    columns={workloadColumns}
                    dataSource={workloadByMember.slice(0, 10)}
                  />
                </DashboardPanel>
              </Col>
            ) : null}
          </Row>

          {!dashboard.loading &&
          recentRequests.length === 0 &&
          recentIncidents.length === 0 &&
          workloadByMember.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No recent reporting data is available yet for your current access scope."
            />
          ) : null}
        </DashboardSection>
      </ResourcePageLayout>
    </PermissionBoundary>
  );
}
