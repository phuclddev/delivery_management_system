import { useMemo } from 'react';
import {
  Alert,
  Button,
  Col,
  Descriptions,
  Empty,
  Grid,
  List,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
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
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
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
import { getProjectRequests } from '@/utils/project-relations';

const { Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const chartColors = ['#0f766e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const DELIVERY_TEAM_CODE = 'CODE';

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

function overlapsDateWindow(start?: string | null, end?: string | null, targetDate = new Date()) {
  const startDate = asDate(start);
  const endDate = asDate(end);

  if (!startDate || !endDate) {
    return false;
  }

  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return startDate < dayEnd && endDate >= dayStart;
}

function asDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOverlappingToday(start?: string | null, end?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const startDate = asDate(start);
  const endDate = asDate(end);

  if (!startDate || !endDate) {
    return false;
  }

  return startDate < tomorrow && endDate >= today;
}

function isThisWeek(value?: string | null) {
  const date = asDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  return date >= sevenDaysAgo && date <= now;
}

function countBy<T>(items: T[], accessor: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = accessor(item);
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

function isDeliveryMemberTeamCode(teamCode?: string | null) {
  return teamCode === DELIVERY_TEAM_CODE;
}

function toDeadlineData(requests: RequestRecord[], projects: ProjectRecord[]) {
  const requestDeadlines = requests
    .filter((request) => request.desiredLiveDate)
    .map((request) => ({
      key: request.id,
      type: 'Request',
      code: request.requestCode,
      title: request.title,
      date: request.desiredLiveDate!,
      status: request.status,
    }));

  const projectDeadlines = projects
    .filter((project) => project.plannedLiveDate)
    .map((project) => ({
      key: project.id,
      type: 'Project',
      code: project.projectCode,
      title: project.name,
      date: project.plannedLiveDate!,
      status: project.status,
    }));

  return [...requestDeadlines, ...projectDeadlines]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, 6);
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const screens = useBreakpoint();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const dashboard = useDashboardData();

  const canSeeRequests = hasPermission('requests:view');
  const canSeeProjects = hasPermission('projects:view');
  const canSeeAllocations = hasPermission('allocations:view');
  const canSeeIncidents = hasPermission('incidents:view');
  const canSeeLeaves = hasPermission('leaves:view');
  const canSeeAssignmentWorkload = hasPermission('projects:view');
  const hasOperationalAccess =
    canSeeRequests || canSeeProjects || canSeeAssignmentWorkload || canSeeAllocations || canSeeIncidents || canSeeLeaves;
  const canSeeAtAGlance =
    canSeeRequests || canSeeProjects || canSeeIncidents || canSeeLeaves || canSeeAssignmentWorkload;
  const canSeePersonalOperational =
    canSeeProjects || canSeeAssignmentWorkload || canSeeIncidents || canSeeRequests;
  const canSeeManagementSnapshot =
    canSeeRequests || canSeeProjects || canSeeIncidents || canSeeLeaves || canSeeAssignmentWorkload;
  const canSeeCharts =
    canSeeIncidents || canSeeAssignmentWorkload || canSeeRequests;
  const canSeeRecentActivity =
    canSeeRequests || canSeeIncidents || canSeeLeaves || canSeeProjects;

  const requests = dashboard.requests as RequestRecord[];
  const projects = dashboard.projects as ProjectRecord[];
  const projectEvents = dashboard.projectEvents as ProjectEventRecord[];
  const requestAssignments = dashboard.requestAssignments as RequestAssignmentRecord[];
  const allocations = dashboard.allocations as AllocationRecord[];
  const incidents = dashboard.incidents as IncidentRecord[];
  const leaves = dashboard.leaves as LeaveRecord[];

  const deliveryAssignments = useMemo(
    () => requestAssignments.filter((assignment) => isDeliveryMemberTeamCode(assignment.member.team?.code)),
    [requestAssignments],
  );
  const deliveryAllocations = useMemo(
    () => allocations.filter((allocation) => isDeliveryMemberTeamCode(allocation.member.team?.code)),
    [allocations],
  );

  const activeAssignments = useMemo(
    () => deliveryAssignments.filter((assignment) => overlapsDateWindow(assignment.startDate, assignment.endDate)),
    [deliveryAssignments],
  );

  const myProjects = useMemo(
    () => projects.filter((project) => project.pmOwner?.id === user?.id).slice(0, 5),
    [projects, user?.id],
  );
  const myAssignments = useMemo(
    () => requestAssignments.filter((assignment) => assignment.member.id === user?.id),
    [requestAssignments, user?.id],
  );
  const myAllocations = useMemo(
    () => allocations.filter((allocation) => allocation.member.id === user?.id),
    [allocations, user?.id],
  );
  const myProjectIds = useMemo(() => new Set(myProjects.map((project) => project.id)), [myProjects]);
  const myRelatedIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => myProjectIds.has(incident.project.id))
        .sort((left, right) => new Date(right.foundAt).getTime() - new Date(left.foundAt).getTime())
        .slice(0, 5),
    [incidents, myProjectIds],
  );

  const requestsByStatus = useMemo(() => countBy(requests, (request) => request.status), [requests]);
  const projectsByStatus = useMemo(() => countBy(projects, (project) => project.status), [projects]);
  const requestsPerProject = useMemo(
    () =>
      projects
        .map((project) => ({
          name: project.projectCode,
          value: project.requestsCount ?? getProjectRequests(project).length,
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, 8),
    [projects],
  );
  const incidentsBySeverity = useMemo(
    () => countBy(incidents, (incident) => incident.severity),
    [incidents],
  );
  const recentTimelineHighlights = useMemo(
    () =>
      [...projectEvents]
        .sort((left, right) => new Date(right.eventAt).getTime() - new Date(left.eventAt).getTime())
        .slice(0, 6),
    [projectEvents],
  );
  const activeTeamWorkload = useMemo(() => {
    const counts = new Map<string, { team: string; allocationPct: number; plannedMd: number }>();

    for (const allocation of allocations) {
      if (!isDeliveryMemberTeamCode(allocation.member.team?.code)) {
        continue;
      }
      if (!isOverlappingToday(allocation.startDate, allocation.endDate)) {
        continue;
      }

      const teamName = allocation.member.team?.name ?? 'Unassigned';
      const current = counts.get(teamName) ?? { team: teamName, allocationPct: 0, plannedMd: 0 };
      current.allocationPct += allocation.allocationPct;
      current.plannedMd += allocation.plannedMd ?? 0;
      counts.set(teamName, current);
    }

    return Array.from(counts.values()).sort((left, right) => right.allocationPct - left.allocationPct);
  }, [deliveryAllocations]);
  const assignmentWorkloadByMember = useMemo(() => {
    const map = new Map<string, { member: string; allocationPct: number; plannedMd: number; actualMd: number }>();

    for (const assignment of activeAssignments) {
      const entry = map.get(assignment.member.id) ?? {
        member: assignment.member.displayName || assignment.member.email,
        allocationPct: 0,
        plannedMd: 0,
        actualMd: 0,
      };
      entry.plannedMd += assignment.plannedMd ?? 0;
      entry.actualMd += assignment.actualMd ?? 0;
      map.set(assignment.member.id, entry);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        allocationPct: item.plannedMd * 10,
      }))
      .sort((left, right) => right.plannedMd - left.plannedMd)
      .slice(0, 6);
  }, [activeAssignments]);
  const assignmentWorkloadByTeam = useMemo(() => {
    const map = new Map<string, { team: string; plannedMd: number; actualMd: number; assignments: number }>();

    for (const assignment of activeAssignments) {
      const teamName =
        assignment.member.team?.name ?? assignment.project.requesterTeam?.name ?? 'Unassigned';
      const entry = map.get(teamName) ?? {
        team: teamName,
        plannedMd: 0,
        actualMd: 0,
        assignments: 0,
      };
      entry.plannedMd += assignment.plannedMd ?? 0;
      entry.actualMd += assignment.actualMd ?? 0;
      entry.assignments += 1;
      map.set(teamName, entry);
    }

    return Array.from(map.values()).sort((left, right) => right.plannedMd - left.plannedMd);
  }, [activeAssignments]);

  const incidentTrend = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      return {
        key,
        label: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        count: 0,
      };
    });

    for (const incident of incidents) {
      const dayKey = incident.foundAt.slice(0, 10);
      const entry = days.find((item) => item.key === dayKey);
      if (entry) {
        entry.count += 1;
      }
    }

    return days.map(({ label, count }) => ({ label, count }));
  }, [incidents]);

  const valueVsEffort = useMemo(
    () => {
      const effortByRequest = new Map<string, number>();

      for (const assignment of deliveryAssignments) {
        effortByRequest.set(
          assignment.request.id,
          (effortByRequest.get(assignment.request.id) ?? 0) + (assignment.plannedMd ?? 0),
        );
      }

      return requests
        .filter((request) => typeof request.businessValueScore === 'number')
        .map((request) => ({
          x: request.businessValueScore ?? 0,
          y: effortByRequest.get(request.id) ?? 0,
          name: request.requestCode,
        }))
        .filter((item) => item.x > 0 || item.y > 0)
        .slice(0, 12);
    },
    [deliveryAssignments, requests],
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5),
    [requests],
  );

  const recentIncidents = useMemo(
    () =>
      [...incidents]
        .sort((left, right) => new Date(right.foundAt).getTime() - new Date(left.foundAt).getTime())
        .slice(0, 5),
    [incidents],
  );

  const upcomingLeaves = useMemo(
    () =>
      [...leaves]
        .filter((leave) => {
          const start = asDate(leave.startDate);
          return start ? start >= new Date(new Date().setHours(0, 0, 0, 0)) : false;
        })
        .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())
        .slice(0, 5),
    [leaves],
  );

  const upcomingDeadlines = useMemo(() => toDeadlineData(requests, projects), [projects, requests]);
  const openRequestsCount = useMemo(
    () =>
      requests.filter(
        (request) => !['rejected', 'closed'].includes((request.status ?? '').toLowerCase()),
      ).length,
    [requests],
  );
  const activeProjectsCount = useMemo(
    () =>
      projects.filter(
        (project) => !['delivered', 'cancelled'].includes((project.status ?? '').toLowerCase()),
      ).length,
    [projects],
  );
  const incidentsThisWeek = useMemo(
    () => incidents.filter((incident) => isThisWeek(incident.foundAt)).length,
    [incidents],
  );
  const leavesToday = useMemo(
    () => leaves.filter((leave) => isOverlappingToday(leave.startDate, leave.endDate)).length,
    [leaves],
  );
  const myCurrentAllocations = useMemo(
    () =>
      myAllocations.filter((allocation) => isOverlappingToday(allocation.startDate, allocation.endDate))
        .length,
    [myAllocations],
  );
  const myCurrentAssignments = useMemo(
    () => myAssignments.filter((assignment) => overlapsDateWindow(assignment.startDate, assignment.endDate)).length,
    [myAssignments],
  );
  const totalActiveAllocations = useMemo(
    () =>
      deliveryAllocations.filter((allocation) => isOverlappingToday(allocation.startDate, allocation.endDate))
        .length,
    [deliveryAllocations],
  );
  const totalActiveAssignments = useMemo(() => activeAssignments.length, [activeAssignments]);
  const workloadByMember = useMemo(() => {
    const map = new Map<string, { member: string; allocationPct: number; plannedMd: number }>();

    for (const allocation of deliveryAllocations) {
      if (!isOverlappingToday(allocation.startDate, allocation.endDate)) {
        continue;
      }

      const entry = map.get(allocation.member.id) ?? {
        member: allocation.member.displayName,
        allocationPct: 0,
        plannedMd: 0,
      };
      entry.allocationPct += allocation.allocationPct;
      entry.plannedMd += allocation.plannedMd ?? 0;
      map.set(allocation.member.id, entry);
    }

    return Array.from(map.values())
      .sort((left, right) => right.allocationPct - left.allocationPct)
      .slice(0, 6);
  }, [deliveryAllocations]);

  const requestColumns: ColumnsType<RequestRecord> = [
    {
      title: 'Request',
      key: 'request',
      render: (_, record) => `${record.requestCode} · ${record.title}`,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, record) => record.project ? `${record.project.projectCode} · ${record.project.name}` : '-',
    },
    { title: 'Team', key: 'team', render: (_, record) => record.requesterTeam.name },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag>{value}</Tag> },
    { title: 'Deadline', dataIndex: 'desiredLiveDate', key: 'desiredLiveDate', render: (value) => formatDate(value) },
  ];

  const incidentColumns: ColumnsType<IncidentRecord> = [
    { title: 'Incident', key: 'incident', render: (_, record) => `${record.incidentCode} · ${record.project.name}` },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (value) => <Tag color={value === 'critical' ? 'red' : 'orange'}>{value}</Tag> },
    { title: 'Found At', dataIndex: 'foundAt', key: 'foundAt', render: (value) => formatDateTime(value) },
    { title: 'Owner', key: 'owner', render: (_, record) => record.ownerMember?.displayName ?? '-' },
  ];

  const leaveColumns: ColumnsType<LeaveRecord> = [
    { title: 'Member', key: 'member', render: (_, record) => record.member.displayName },
    { title: 'Leave Type', dataIndex: 'leaveType', key: 'leaveType' },
    { title: 'Start', dataIndex: 'startDate', key: 'startDate', render: (value) => formatDate(value) },
    { title: 'End', dataIndex: 'endDate', key: 'endDate', render: (value) => formatDate(value) },
  ];

  return (
    <PermissionBoundary
      allowed={Boolean(user)}
      title="You need to sign in to view the dashboard"
      subtitle="Once authenticated, the dashboard will adapt to the modules you can access."
    >
      <ResourcePageLayout
        eyebrow="Operations Overview"
        title="Dashboard"
        description="A practical workspace for personal execution, team management, and leadership visibility. Sections appear only when your current access level allows them."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void dashboard.refresh()}>
            Refresh
          </Button>
        }
      >
        {dashboard.error ? (
          <Alert
            type="warning"
            showIcon
            message="Some dashboard data could not be loaded"
            description={dashboard.error.message}
          />
        ) : null}

        {!hasOperationalAccess ? (
          <DashboardPanel
            title="Welcome"
            minHeight={180}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Paragraph style={{ marginBottom: 0 }}>
                You are signed in as <Text strong>{user?.displayName ?? user?.email ?? 'current user'}</Text>.
                This dashboard only shows sections backed by modules your account can view.
              </Paragraph>
              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  {
                    key: 'email',
                    label: 'Email',
                    children: user?.email ?? '-',
                  },
                  {
                    key: 'team',
                    label: 'Team',
                    children: user?.team?.name ?? 'Unassigned',
                  },
                  {
                    key: 'roles',
                    label: 'Roles',
                    children: user?.roles.map((role) => role.name).join(', ') || 'No role',
                  },
                ]}
              />
              <Text type="secondary">
                Ask an administrator for additional view permissions if you need more operational widgets here.
              </Text>
            </Space>
          </DashboardPanel>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {canSeeAtAGlance ? (
              <DashboardSection
                title="At a Glance"
                description="Quick indicators that help you understand today’s workload and operational posture."
              >
                <Row gutter={[16, 16]}>
                  {canSeeRequests ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="Open Requests"
                        value={String(openRequestsCount)}
                        hint="Request intake still in motion"
                        icon={<ClockCircleOutlined />}
                      />
                    </Col>
                  ) : null}
                  {canSeeProjects ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="Active Projects"
                        value={String(activeProjectsCount)}
                        hint="Projects not yet delivered"
                        icon={<CheckCircleOutlined />}
                      />
                    </Col>
                  ) : null}
                  {canSeeIncidents ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="Incidents This Week"
                        value={String(incidentsThisWeek)}
                        hint="Last 7 days"
                        icon={<AlertOutlined />}
                      />
                    </Col>
                  ) : null}
                  {canSeeLeaves ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="Members On Leave Today"
                        value={String(leavesToday)}
                        hint="Current day overlap"
                        icon={<CalendarOutlined />}
                      />
                    </Col>
                  ) : null}
                  {canSeeAssignmentWorkload ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="My Current Assignments"
                        value={String(myCurrentAssignments)}
                        hint="Request assignments overlapping today"
                        icon={<PieChartOutlined />}
                      />
                    </Col>
                  ) : null}
                  {canSeeAssignmentWorkload ? (
                    <Col xs={24} sm={12} xl={8}>
                      <DashboardMetricCard
                        label="Total Active Assignments"
                        value={String(totalActiveAssignments)}
                        hint="All active request assignment rows"
                        icon={<TeamOutlined />}
                      />
                    </Col>
                  ) : null}
                </Row>
              </DashboardSection>
            ) : null}

            {canSeePersonalOperational ? (
              <DashboardSection
                title="Personal & Operational"
                description="Your immediate context: ownership, deadlines, and issues connected to current work."
              >
                <Row gutter={[16, 16]}>
                  {canSeeProjects ? (
                    <Col xs={24} lg={12}>
                      <DashboardPanel
                        title="My Projects"
                        loading={dashboard.loading}
                        empty={!myProjects.length}
                        emptyDescription="No projects are currently assigned to you as PM owner."
                      >
                        <List
                          dataSource={myProjects}
                          renderItem={(project) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${project.projectCode} · ${project.name}`}
                                description={`Status: ${project.status} | Planned live: ${formatDate(project.plannedLiveDate)}`}
                              />
                              <Tag>{project.businessPriority}</Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeAssignmentWorkload ? (
                    <Col xs={24} lg={12}>
                      <DashboardPanel
                        title="My Assignments"
                        loading={dashboard.loading}
                        empty={!myAssignments.length}
                        emptyDescription="No request assignments are currently linked to your account."
                      >
                        <List
                          dataSource={myAssignments.slice(0, 5)}
                          renderItem={(assignment) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${assignment.request.requestCode} · ${assignment.member.displayName || assignment.member.email}`}
                                description={`${assignment.roleType} | ${assignment.project.projectCode} · ${assignment.project.name}`}
                              />
                              <Tag color="blue">
                                {assignment.plannedMd ?? 0} MD
                              </Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {(canSeeRequests || canSeeProjects) ? (
                    <Col xs={24} lg={12}>
                      <DashboardPanel
                        title="Upcoming Deadlines"
                        loading={dashboard.loading}
                        empty={!upcomingDeadlines.length}
                        emptyDescription="No upcoming request or project deadlines were found."
                      >
                        <List
                          dataSource={upcomingDeadlines}
                          renderItem={(item) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${item.code} · ${item.title}`}
                                description={`${item.type} | ${item.status}`}
                              />
                              <Text>{formatDate(item.date)}</Text>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeProjects ? (
                    <Col xs={24} lg={12}>
                      <DashboardPanel
                        title="Project Timeline Highlights"
                        loading={dashboard.loading}
                        empty={!recentTimelineHighlights.length}
                        emptyDescription="No recent project events are available."
                      >
                        <List
                          dataSource={recentTimelineHighlights}
                          renderItem={(event) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${event.project.projectCode} · ${event.eventTitle}`}
                                description={`${formatDateTime(event.eventAt)} | ${event.request?.requestCode ?? 'Project-wide'} | ${event.actorUser?.displayName ?? event.sourceType ?? 'system'}`}
                              />
                              <Tag>{event.eventType}</Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeIncidents ? (
                    <Col xs={24} lg={12}>
                      <DashboardPanel
                        title="Recent Incidents Related To My Projects"
                        loading={dashboard.loading}
                        empty={!myRelatedIncidents.length}
                        emptyDescription="No recent incidents are linked to your current project ownership."
                      >
                        <List
                          dataSource={myRelatedIncidents}
                          renderItem={(incident) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${incident.incidentCode} · ${incident.project.name}`}
                                description={incident.impactDescription}
                              />
                              <Tag color={incident.severity === 'critical' ? 'red' : 'orange'}>
                                {incident.severity}
                              </Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                </Row>
              </DashboardSection>
            ) : null}

            {canSeeManagementSnapshot ? (
              <DashboardSection
                title="Management Snapshot"
                description="Aggregated views that help PMs, team leads, and admins spot flow and capacity issues quickly."
              >
                <Row gutter={[16, 16]}>
                  {canSeeRequests ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Requests By Status"
                        loading={dashboard.loading}
                        empty={!requestsByStatus.length}
                        minHeight={screens.xl ? 340 : 300}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={requestsByStatus}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeProjects ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Projects By Status"
                        loading={dashboard.loading}
                        empty={!projectsByStatus.length}
                        minHeight={screens.xl ? 340 : 300}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={projectsByStatus} dataKey="value" nameKey="name" outerRadius={90} innerRadius={56}>
                              {projectsByStatus.map((entry, index) => (
                                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeProjects ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Requests Per Project"
                        loading={dashboard.loading}
                        empty={!requestsPerProject.length}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={requestsPerProject}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeIncidents ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Incidents By Severity"
                        loading={dashboard.loading}
                        empty={!incidentsBySeverity.length}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={incidentsBySeverity}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeLeaves ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Leave Coverage"
                        loading={dashboard.loading}
                        empty={!leaves.length}
                      >
                        <List
                          dataSource={[
                            { label: 'On leave today', value: leavesToday },
                            {
                              label: 'Starting in next 7 days',
                              value: upcomingLeaves.filter((leave) => isThisWeek(leave.startDate)).length,
                            },
                            {
                              label: 'Upcoming leave records',
                              value: upcomingLeaves.length,
                            },
                          ]}
                          renderItem={(item) => (
                            <List.Item>
                              <Text>{item.label}</Text>
                              <Tag color="blue">{item.value}</Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeAssignmentWorkload ? (
                    <Col xs={24}>
                      <DashboardPanel
                        title="Workload Summary By Member"
                        loading={dashboard.loading}
                        empty={!assignmentWorkloadByMember.length}
                        minHeight={360}
                      >
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={assignmentWorkloadByMember} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="member" width={110} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="allocationPct" fill="#0ea5e9" name="Planned MD x10" radius={[0, 8, 8, 0]} />
                            <Bar dataKey="plannedMd" fill="#0f766e" name="Planned MD" radius={[0, 8, 8, 0]} />
                            <Bar dataKey="actualMd" fill="#f59e0b" name="Actual MD" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                </Row>
              </DashboardSection>
            ) : null}

            {canSeeCharts ? (
              <DashboardSection
                title="Charts"
                description="Operational signals for leaders and PMs, composed from the current list endpoints."
              >
                <Row gutter={[16, 16]}>
                  {canSeeIncidents ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Incidents Trend Over Time"
                        loading={dashboard.loading}
                        empty={!incidentTrend.some((entry) => entry.count > 0)}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={incidentTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeAssignmentWorkload ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Team Workload Overview"
                        loading={dashboard.loading}
                        empty={!assignmentWorkloadByTeam.length}
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={assignmentWorkloadByTeam}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="team" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="assignments" fill="#0ea5e9" name="Assignments" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="plannedMd" fill="#14b8a6" name="Planned MD" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="actualMd" fill="#f59e0b" name="Actual MD" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                  {canSeeRequests ? (
                    <Col xs={24}>
                      <DashboardPanel
                        title="Value vs Effort Summary"
                        loading={dashboard.loading}
                        empty={!valueVsEffort.length}
                        emptyDescription="Business value and urgency scores are not available on enough request records yet."
                      >
                        <ResponsiveContainer width="100%" height={320}>
                          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Business Value" />
                            <YAxis type="number" dataKey="y" name="Planned MD" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Requests" data={valueVsEffort} fill="#0f766e" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </DashboardPanel>
                    </Col>
                  ) : null}
                </Row>
              </DashboardSection>
            ) : null}

            {canSeeRecentActivity ? (
              <DashboardSection
                title="Recent Activity"
                description="Fast reference tables for the latest movement across requests, incidents, leaves, and projects."
              >
                <Row gutter={[16, 16]}>
                  {canSeeRequests ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Recent Requests"
                        loading={dashboard.loading}
                        empty={!recentRequests.length}
                        minHeight={360}
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
                        title="Recent Incidents"
                        loading={dashboard.loading}
                        empty={!recentIncidents.length}
                        minHeight={360}
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
                  {canSeeLeaves ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Upcoming Leaves"
                        loading={dashboard.loading}
                        empty={!upcomingLeaves.length}
                        minHeight={320}
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
                  ) : null}
                  {canSeeProjects ? (
                    <Col xs={24} xl={12}>
                      <DashboardPanel
                        title="Latest Project Updates"
                        loading={dashboard.loading}
                        empty={!projects.length}
                        minHeight={320}
                      >
                        <List
                          dataSource={[...projects]
                            .sort(
                              (left, right) =>
                                new Date(right.updatedAt ?? 0).getTime() -
                                new Date(left.updatedAt ?? 0).getTime(),
                            )
                            .slice(0, 5)}
                          renderItem={(project) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${project.projectCode} · ${project.name}`}
                                description={`Status: ${project.status} | Requests: ${project.requestsCount ?? getProjectRequests(project).length} | Planned live: ${formatDate(project.plannedLiveDate)}`}
                              />
                              <Tag>{project.businessPriority}</Tag>
                            </List.Item>
                          )}
                        />
                      </DashboardPanel>
                    </Col>
                  ) : null}
                </Row>
              </DashboardSection>
            ) : null}
          </Space>
        )}
      </ResourcePageLayout>
    </PermissionBoundary>
  );
}
