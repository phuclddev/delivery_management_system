import { useMemo } from 'react';
import {
  Alert,
  Button,
  Col,
  Empty,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  BarChartOutlined,
  CalendarOutlined,
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
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/utils/format';

const { Paragraph, Text } = Typography;

const chartColors = ['#0f766e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

type RequestRecord = {
  id: string;
  requestCode: string;
  title: string;
  requesterTeam?: { id: string; code: string; name: string } | null;
  campaignName?: string | null;
  requestType?: string | null;
  priority?: string | null;
  desiredLiveDate?: string | null;
  status?: string | null;
  businessValueScore?: number | null;
  urgencyScore?: number | null;
  createdAt: string;
};

type ProjectRecord = {
  id: string;
  projectCode: string;
  name: string;
  requesterTeam?: { id: string; code: string; name: string } | null;
  request?: { id: string; requestCode: string; title: string; status?: string | null } | null;
  pmOwner?: { id: string; email: string; displayName: string } | null;
  status?: string | null;
  businessPriority?: string | null;
  plannedLiveDate?: string | null;
  actualLiveDate?: string | null;
  updatedAt?: string | null;
};

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
    status?: string | null;
    requesterTeam?: { id: string; code: string; name: string } | null;
  };
  roleType?: string | null;
  allocationPct: number;
  plannedMd?: number | null;
  actualMd?: number | null;
  startDate: string;
  endDate: string;
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

function endOfToday() {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

function isInCurrentWindow(value?: string | null, days = 7) {
  const date = asDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return date >= start && date <= now;
}

function overlapsRange(start?: string | null, end?: string | null, rangeStart?: Date, rangeEnd?: Date) {
  const startDate = asDate(start);
  const endDate = asDate(end);

  if (!startDate || !endDate || !rangeStart || !rangeEnd) {
    return false;
  }

  return startDate < rangeEnd && endDate >= rangeStart;
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

export default function ReportsPage() {
  usePageTitle('Reports');
  const { hasPermission } = usePermissions();
  const dashboard = useDashboardData();

  const canSeeRequests = hasPermission('requests:view');
  const canSeeProjects = hasPermission('projects:view');
  const canSeeAllocations = hasPermission('allocations:view');
  const canSeeIncidents = hasPermission('incidents:view');
  const canSeeLeaves = hasPermission('leaves:view');
  const canAccessReports =
    canSeeRequests || canSeeProjects || canSeeAllocations || canSeeIncidents || canSeeLeaves;

  const requests = dashboard.requests as RequestRecord[];
  const projects = dashboard.projects as ProjectRecord[];
  const allocations = dashboard.allocations as AllocationRecord[];
  const incidents = dashboard.incidents as IncidentRecord[];
  const leaves = dashboard.leaves as LeaveRecord[];

  const todayStart = useMemo(() => startOfToday(), []);
  const todayEnd = useMemo(() => endOfToday(), []);

  const activeProjects = useMemo(
    () =>
      projects.filter((project) => {
        const status = (project.status ?? '').toLowerCase();
        return status ? !['done', 'closed', 'cancelled', 'canceled'].includes(status) : true;
      }),
    [projects],
  );

  const currentAllocations = useMemo(
    () =>
      allocations.filter((allocation) =>
        overlapsRange(allocation.startDate, allocation.endDate, todayStart, todayEnd),
      ),
    [allocations, todayEnd, todayStart],
  );

  const openIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const status = (incident.status ?? '').toLowerCase();
        return status ? !['resolved', 'closed'].includes(status) : true;
      }),
    [incidents],
  );

  const leavesToday = useMemo(
    () =>
      leaves.filter((leave) => overlapsRange(leave.startDate, leave.endDate, todayStart, todayEnd)),
    [leaves, todayEnd, todayStart],
  );

  const requestByStatus = useMemo(() => countBy(requests, (item) => item.status), [requests]);
  const requestByPriority = useMemo(() => countBy(requests, (item) => item.priority), [requests]);
  const requestByTeam = useMemo(
    () => countBy(requests, (item) => item.requesterTeam?.name),
    [requests],
  );
  const requestByType = useMemo(() => countBy(requests, (item) => item.requestType), [requests]);

  const projectByStatus = useMemo(() => countBy(projects, (item) => item.status), [projects]);
  const projectByOwner = useMemo(
    () => countBy(projects, (item) => item.pmOwner?.displayName),
    [projects],
  );

  const liveSummary = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let pending = 0;

    for (const project of projects) {
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
  }, [projects]);

  const workloadByMember = useMemo(() => {
    const grouped = new Map<
      string,
      { key: string; member: string; team: string; allocationPct: number; plannedMd: number; actualMd: number }
    >();

    for (const item of currentAllocations) {
      const key = item.member.id;
      const existing = grouped.get(key) ?? {
        key,
        member: item.member.displayName || item.member.email,
        team: item.member.team?.name ?? '-',
        allocationPct: 0,
        plannedMd: 0,
        actualMd: 0,
      };

      existing.allocationPct += item.allocationPct ?? 0;
      existing.plannedMd += item.plannedMd ?? 0;
      existing.actualMd += item.actualMd ?? 0;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values()).sort((left, right) => right.allocationPct - left.allocationPct);
  }, [currentAllocations]);

  const workloadByTeam = useMemo(() => {
    const grouped = new Map<string, { name: string; value: number }>();

    for (const item of currentAllocations) {
      const name = item.member.team?.name ?? item.project.requesterTeam?.name ?? 'Unassigned';
      grouped.set(name, { name, value: (grouped.get(name)?.value ?? 0) + (item.allocationPct ?? 0) });
    }

    return Array.from(grouped.values()).sort((left, right) => right.value - left.value);
  }, [currentAllocations]);

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

  const incidentsBySeverity = useMemo(() => countBy(incidents, (item) => item.severity), [incidents]);
  const incidentsByDomain = useMemo(() => countBy(incidents, (item) => item.domain), [incidents]);
  const incidentTrend = useMemo(() => toTrendData(incidents), [incidents]);

  const leaveByType = useMemo(() => countBy(leaves, (item) => item.leaveType), [leaves]);
  const upcomingLeaves = useMemo(
    () =>
      leaves
        .filter((leave) => {
          const startDate = asDate(leave.startDate);
          return startDate ? startDate >= todayStart : false;
        })
        .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())
        .slice(0, 8),
    [leaves, todayStart],
  );

  const valueVsEffort = useMemo(() => {
    const requestMap = new Map(requests.map((item) => [item.id, item]));
    const effortByProject = new Map<string, number>();

    for (const item of allocations) {
      effortByProject.set(item.project.id, (effortByProject.get(item.project.id) ?? 0) + (item.plannedMd ?? 0));
    }

    return projects
      .map((project) => {
        const request = project.request ? requestMap.get(project.request.id) : null;
        if (!request) {
          return null;
        }

        return {
          name: project.projectCode,
          value: request.businessValueScore ?? 0,
          urgency: request.urgencyScore ?? 0,
          effort: effortByProject.get(project.id) ?? 0,
        };
      })
      .filter((item): item is { name: string; value: number; urgency: number; effort: number } =>
        Boolean(item && (item.value > 0 || item.effort > 0 || item.urgency > 0)),
      );
  }, [allocations, projects, requests]);

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6),
    [requests],
  );

  const recentIncidents = useMemo(
    () =>
      [...incidents]
        .sort((left, right) => new Date(right.foundAt).getTime() - new Date(left.foundAt).getTime())
        .slice(0, 6),
    [incidents],
  );

  const topSummaryCards = [
    canSeeRequests
      ? {
          key: 'openRequests',
          label: 'Open requests',
          value: String(
            requests.filter((request) => !['done', 'closed', 'cancelled', 'canceled'].includes((request.status ?? '').toLowerCase())).length,
          ),
          hint: 'Requests still needing follow-up',
          icon: <BarChartOutlined />,
        }
      : null,
    canSeeProjects
      ? {
          key: 'activeProjects',
          label: 'Active projects',
          value: String(activeProjects.length),
          hint: 'Projects still in execution',
          icon: <ProjectOutlined />,
        }
      : null,
    canSeeIncidents
      ? {
          key: 'incidentsThisWeek',
          label: 'Incidents this week',
          value: String(incidents.filter((item) => isInCurrentWindow(item.foundAt, 7)).length),
          hint: 'Operational issues in the last 7 days',
          icon: <AlertOutlined />,
        }
      : null,
    canSeeLeaves
      ? {
          key: 'leaveToday',
          label: 'Members on leave today',
          value: String(leavesToday.length),
          hint: 'Current daily capacity impact',
          icon: <CalendarOutlined />,
        }
      : null,
    canSeeAllocations
      ? {
          key: 'currentAllocations',
          label: 'Current allocations',
          value: String(currentAllocations.length),
          hint: 'Active member-project allocations',
          icon: <TeamOutlined />,
        }
      : null,
    canSeeAllocations
      ? {
          key: 'avgAllocation',
          label: 'Average load',
          value:
            workloadByMember.length > 0
              ? formatPct(
                  workloadByMember.reduce((total, item) => total + item.allocationPct, 0) /
                    workloadByMember.length,
                )
              : '0%',
          hint: 'Average allocation across active members',
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
                          hint="Projects with comparable live-date signal"
                          icon={<span style={{ color: chartColors[index % chartColors.length] }}>●</span>}
                        />
                      </Col>
                    ))}
                  </Row>
                </DashboardPanel>
              </Col>
            </Row>
          </DashboardSection>
        ) : null}

        {canSeeAllocations ? (
          <DashboardSection
            title="Workload reporting"
            description="Current load split by member and team, with quick signals for over- or under-utilization."
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
                      <YAxis tickFormatter={formatPct} />
                      <Tooltip formatter={(value: number) => formatPct(value)} />
                      <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
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
            description="Leave impact across today, upcoming schedules, and leave-type mix."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="On leave today"
                  value={String(leavesToday.length)}
                  hint="People currently unavailable"
                  icon={<CalendarOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="This week leave entries"
                  value={String(leaves.filter((item) => isInCurrentWindow(item.startDate, 7)).length)}
                  hint="Leave starting within 7 days"
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

        {(canSeeRequests || canSeeProjects || canSeeAllocations) ? (
          <DashboardSection
            title="Value and effort"
            description="A practical lens on business value, urgency, and the planned effort currently attached to delivery."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Total planned MD"
                  value={String(sumBy(allocations, (item) => item.plannedMd).toFixed(1))}
                  hint="Across all visible allocation records"
                  icon={<PieChartOutlined />}
                />
              </Col>
              <Col xs={24} md={8}>
                <DashboardMetricCard
                  label="Average request value"
                  value={
                    requests.length > 0
                      ? (sumBy(requests, (item) => item.businessValueScore) / requests.length).toFixed(1)
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
                    requests.length > 0
                      ? (sumBy(requests, (item) => item.urgencyScore) / requests.length).toFixed(1)
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
            {canSeeAllocations ? (
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
