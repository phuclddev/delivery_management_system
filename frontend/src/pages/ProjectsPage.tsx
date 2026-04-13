import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatDate, toDateInputValue, toIsoString } from '@/utils/format';
import {
  projectStatusOptions,
  requestPriorityOptions,
  requestTypeOptions,
  riskLevelOptions,
  scopeTypeOptions,
} from '@/utils/options';

interface ProjectRecord {
  id: string;
  projectCode: string;
  request?: {
    id: string;
    requestCode: string;
    title: string;
    status: string;
  } | null;
  name: string;
  requesterTeam: {
    id: string;
    code: string;
    name: string;
  };
  pmOwner?: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  projectType: string;
  scopeType: string;
  status: string;
  businessPriority: string;
  riskLevel?: string | null;
  requestedLiveDate?: string | null;
  plannedStartDate?: string | null;
  plannedLiveDate?: string | null;
  actualStartDate?: string | null;
  actualLiveDate?: string | null;
  backendStartDate?: string | null;
  backendEndDate?: string | null;
  frontendStartDate?: string | null;
  frontendEndDate?: string | null;
  currentScopeVersion?: string | null;
  scopeChangeCount?: number | null;
  blockerCount?: number | null;
  incidentCount?: number | null;
  chatGroupUrl?: string | null;
  repoUrl?: string | null;
  notes?: string | null;
}

export default function ProjectsPage() {
  usePageTitle('Projects');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('projects:view');
  const canCreate = hasPermission('projects:create');
  const canUpdate = hasPermission('projects:update');
  const canDelete = hasPermission('projects:delete');
  const { teamOptions, userOptions, requestOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProjectRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [form] = Form.useForm();

  const table = useCrudTable<ProjectRecord>({
    resource: 'projects',
    initialPageSize: 10,
    initialSort: { field: 'plannedLiveDate', order: 'descend' },
  });

  const columns = useMemo<ColumnsType<ProjectRecord>>(
    () => [
      { title: 'Project Code', dataIndex: 'projectCode', key: 'projectCode', sorter: true, width: 140 },
      { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, width: 220 },
      {
        title: 'Request',
        key: 'request',
        width: 220,
        render: (_, record) =>
          record.request ? `${record.request.requestCode} · ${record.request.title}` : '-',
      },
      {
        title: 'PM Owner',
        key: 'pmOwner',
        width: 160,
        render: (_, record) => record.pmOwner?.displayName ?? '-',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (value) => <Tag color={value === 'delivered' ? 'green' : 'blue'}>{value}</Tag>,
      },
      {
        title: 'Priority',
        dataIndex: 'businessPriority',
        key: 'businessPriority',
        width: 120,
        render: (value) => <Tag color={value === 'high' ? 'red' : 'gold'}>{value}</Tag>,
      },
      {
        title: 'Planned Live',
        dataIndex: 'plannedLiveDate',
        key: 'plannedLiveDate',
        sorter: true,
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: 'Actual Live',
        dataIndex: 'actualLiveDate',
        key: 'actualLiveDate',
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
          <Space>
            {canUpdate ? (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete project?"
                description={`This will remove ${record.projectCode}.`}
                onConfirm={() => void handleDelete(record)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canDelete, canUpdate],
  );

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'planned',
      businessPriority: 'medium',
      requesterTeamId: user?.team?.id,
      projectType: 'feature',
      scopeType: 'full',
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: ProjectRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      requestId: record.request?.id,
      requesterTeamId: record.requesterTeam.id,
      pmOwnerId: record.pmOwner?.id,
      requestedLiveDate: toDateInputValue(record.requestedLiveDate),
      plannedStartDate: toDateInputValue(record.plannedStartDate),
      plannedLiveDate: toDateInputValue(record.plannedLiveDate),
      actualStartDate: toDateInputValue(record.actualStartDate),
      actualLiveDate: toDateInputValue(record.actualLiveDate),
      backendStartDate: toDateInputValue(record.backendStartDate),
      backendEndDate: toDateInputValue(record.backendEndDate),
      frontendStartDate: toDateInputValue(record.frontendStartDate),
      frontendEndDate: toDateInputValue(record.frontendEndDate),
    });
    setDrawerOpen(true);
  }

  async function handleDelete(record: ProjectRecord) {
    try {
      await table.provider.delete({ resource: 'projects', id: record.id });
      message.success(`Deleted ${record.projectCode}.`);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete project.');
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        requestedLiveDate: toIsoString(values.requestedLiveDate as string | undefined),
        plannedStartDate: toIsoString(values.plannedStartDate as string | undefined),
        plannedLiveDate: toIsoString(values.plannedLiveDate as string | undefined),
        actualStartDate: toIsoString(values.actualStartDate as string | undefined),
        actualLiveDate: toIsoString(values.actualLiveDate as string | undefined),
        backendStartDate: toIsoString(values.backendStartDate as string | undefined),
        backendEndDate: toIsoString(values.backendEndDate as string | undefined),
        frontendStartDate: toIsoString(values.frontendStartDate as string | undefined),
        frontendEndDate: toIsoString(values.frontendEndDate as string | undefined),
      };

      if (editingRecord) {
        await table.provider.update({ resource: 'projects', id: editingRecord.id, values: payload });
        message.success(`Updated ${editingRecord.projectCode}.`);
      } else {
        await table.provider.create({ resource: 'projects', values: payload });
        message.success('Project created successfully.');
      }

      setDrawerOpen(false);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save project.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Delivery Execution"
        title="Projects"
        description="Track delivery status, ownership, milestones, and live-date readiness with fast PM updates."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Project
              </Button>
            ) : null}
          </Space>
        }
        filters={
          <Space wrap>
            <Select
              allowClear
              placeholder="Status"
              options={projectStatusOptions}
              style={{ width: 160 }}
              value={filterValues.status as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, status: value }))}
            />
            <Select
              allowClear
              placeholder="Priority"
              options={requestPriorityOptions}
              style={{ width: 160 }}
              value={filterValues.priority as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, priority: value }))}
            />
            <Select
              allowClear
              placeholder="PM owner"
              options={userOptions}
              style={{ width: 200 }}
              value={filterValues.pmOwnerId as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, pmOwnerId: value }))}
            />
            <Button type="primary" onClick={() => table.setFilters(filterValues)}>
              Apply Filters
            </Button>
            <Button
              onClick={() => {
                setFilterValues({});
                table.setFilters({});
              }}
            >
              Reset
            </Button>
          </Space>
        }
      >
        {table.error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load projects"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}
        <Table<ProjectRecord>
          rowKey="id"
          columns={columns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1450 }}
          locale={{
            emptyText: table.loading ? 'Loading projects...' : <Empty description="No projects found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? `Edit ${editingRecord.projectCode}` : 'Create Project'}
        width={760}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={submitting} onClick={() => void form.submit()}>
              Save
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
          <Form.Item label="Project code" name="projectCode" rules={[{ required: true }]}>
            <Input placeholder="PRJ-031" />
          </Form.Item>
          <Form.Item label="Linked request" name="requestId">
            <Select allowClear options={requestOptions} placeholder="Optional request linkage" />
          </Form.Item>
          <Form.Item label="Project name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Requester team" name="requesterTeamId" rules={[{ required: true }]}>
            <Select options={teamOptions} />
          </Form.Item>
          <Form.Item label="PM owner" name="pmOwnerId">
            <Select allowClear options={userOptions} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Project type" name="projectType" rules={[{ required: true }]} style={{ width: '25%' }}>
              <Select options={requestTypeOptions} />
            </Form.Item>
            <Form.Item label="Scope type" name="scopeType" rules={[{ required: true }]} style={{ width: '25%' }}>
              <Select options={scopeTypeOptions} />
            </Form.Item>
            <Form.Item label="Status" name="status" rules={[{ required: true }]} style={{ width: '25%' }}>
              <Select options={projectStatusOptions} />
            </Form.Item>
            <Form.Item
              label="Priority"
              name="businessPriority"
              rules={[{ required: true }]}
              style={{ width: '25%' }}
            >
              <Select options={requestPriorityOptions} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Risk level" name="riskLevel" style={{ width: '25%' }}>
              <Select allowClear options={riskLevelOptions} />
            </Form.Item>
            <Form.Item label="Requested live" name="requestedLiveDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Planned start" name="plannedStartDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Planned live" name="plannedLiveDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Actual start" name="actualStartDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Actual live" name="actualLiveDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Backend start" name="backendStartDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Backend end" name="backendEndDate" style={{ width: '25%' }}>
              <Input type="date" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Frontend start" name="frontendStartDate" style={{ width: '33%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Frontend end" name="frontendEndDate" style={{ width: '33%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Scope version" name="currentScopeVersion" style={{ width: '34%' }}>
              <Input placeholder="v1.2" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Scope changes" name="scopeChangeCount" style={{ width: '33%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Blockers" name="blockerCount" style={{ width: '33%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Incident count" name="incidentCount" style={{ width: '34%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Chat group URL" name="chatGroupUrl">
            <Input type="url" />
          </Form.Item>
          <Form.Item label="Repo URL" name="repoUrl">
            <Input type="url" />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </PermissionBoundary>
  );
}
