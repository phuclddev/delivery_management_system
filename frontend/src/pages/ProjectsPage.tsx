import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ListToolbar } from '@/components/table/ListToolbar';
import { ProjectEventsSection } from '@/components/project-events/ProjectEventsSection';
import { RequestAssignmentsSection } from '@/components/request-assignments/RequestAssignmentsSection';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useDataProvider } from '@/providers/dataProvider';
import type { DataProviderError } from '@/providers/dataProvider';
import type { ProjectRecord } from '@/types/domain';
import { buildCsvFileName, downloadCsv, type CsvColumnDefinition } from '@/utils/csv';
import { formatDate, toDateInputValue, toIsoString } from '@/utils/format';
import { getPrimaryProjectRequest, getProjectRequests } from '@/utils/project-relations';
import {
  projectStatusOptions,
  requestPriorityOptions,
  requestTypeOptions,
  riskLevelOptions,
  scopeTypeOptions,
} from '@/utils/options';

const { Text } = Typography;

export default function ProjectsPage() {
  usePageTitle('Projects');
  const { message } = App.useApp();
  const { user } = useAuth();
  const provider = useDataProvider();
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DataProviderError | null>(null);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'projects-visible-filters',
    ['status', 'priority', 'pmOwnerId'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'projects-visible-columns',
    [
      'projectCode',
      'name',
      'request',
      'requestsCount',
      'pmOwner',
      'status',
      'businessPriority',
      'plannedLiveDate',
      'actualLiveDate',
    ],
  );

  const table = useCrudTable<ProjectRecord>({
    resource: 'projects',
    initialPageSize: 10,
    initialSort: { field: 'plannedLiveDate', order: 'descend' },
  });

  useEffect(() => {
    if (!detailOpen || !selectedProjectId) {
      return;
    }

    let cancelled = false;

    const loadProject = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const result = await provider.getOne<ProjectRecord>({
          resource: 'projects',
          id: selectedProjectId,
        });

        if (!cancelled) {
          setSelectedProject(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailError(error as DataProviderError);
          setSelectedProject(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [detailOpen, provider, selectedProjectId]);

  const columns = useMemo<ColumnsType<ProjectRecord>>(
    () => [
      { title: 'Project Code', dataIndex: 'projectCode', key: 'projectCode', sorter: true, width: 140 },
      { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, width: 220 },
      {
        title: 'Requests',
        key: 'request',
        width: 220,
        render: (_, record) => {
          const linkedRequests = getProjectRequests(record);
          const primaryRequest = linkedRequests[0];

          if (!primaryRequest) {
            return '-';
          }

          const suffix =
            linkedRequests.length > 1 ? ` +${linkedRequests.length - 1} more` : '';

          return `${primaryRequest.requestCode} · ${primaryRequest.title}${suffix}`;
        },
      },
      {
        title: 'Count',
        key: 'requestsCount',
        width: 90,
        align: 'right',
        render: (_, record) => record.requestsCount ?? getProjectRequests(record).length,
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
        width: 170,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailDrawer(record.id)} />
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

  const visibleColumns = useMemo(
    () =>
      columns.filter((column) => {
        const key = String(column.key ?? '');
        return key === 'actions' || visibleColumnKeys.includes(key);
      }),
    [columns, visibleColumnKeys],
  );

  const exportColumns = useMemo<CsvColumnDefinition<ProjectRecord>[]>(
    () =>
      [
        { key: 'projectCode', label: 'Project Code', getValue: (record: ProjectRecord) => record.projectCode },
        { key: 'name', label: 'Name', getValue: (record: ProjectRecord) => record.name },
        {
          key: 'request',
          label: 'Requests',
          getValue: (record: ProjectRecord) => {
            const linkedRequests = getProjectRequests(record);
            return linkedRequests.map((item) => `${item.requestCode} · ${item.title}`).join(' | ');
          },
        },
        {
          key: 'requestsCount',
          label: 'Count',
          getValue: (record: ProjectRecord) => record.requestsCount ?? getProjectRequests(record).length,
        },
        {
          key: 'pmOwner',
          label: 'PM Owner',
          getValue: (record: ProjectRecord) => record.pmOwner?.displayName ?? '',
        },
        { key: 'status', label: 'Status', getValue: (record: ProjectRecord) => record.status ?? '' },
        {
          key: 'businessPriority',
          label: 'Priority',
          getValue: (record: ProjectRecord) => record.businessPriority ?? '',
        },
        {
          key: 'plannedLiveDate',
          label: 'Planned Live',
          getValue: (record: ProjectRecord) => formatDate(record.plannedLiveDate),
        },
        {
          key: 'actualLiveDate',
          label: 'Actual Live',
          getValue: (record: ProjectRecord) => formatDate(record.actualLiveDate),
        },
      ].filter((column) => visibleColumnKeys.includes(column.key)),
    [visibleColumnKeys],
  );

  const filterDefinitions = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        node: (
          <Select
            allowClear
            placeholder="Status"
            options={projectStatusOptions}
            style={{ width: 160 }}
            value={filterValues.status as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, status: value }))}
          />
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        node: (
          <Select
            allowClear
            placeholder="Priority"
            options={requestPriorityOptions}
            style={{ width: 160 }}
            value={filterValues.priority as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, priority: value }))}
          />
        ),
      },
      {
        key: 'pmOwnerId',
        label: 'PM owner',
        node: (
          <Select
            allowClear
            placeholder="PM owner"
            options={userOptions}
            style={{ width: 200 }}
            value={filterValues.pmOwnerId as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, pmOwnerId: value }))}
          />
        ),
      },
    ],
    [filterValues.pmOwnerId, filterValues.priority, filterValues.status, userOptions],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      const result = await table.provider.getList<ProjectRecord>({
        resource: 'projects',
        filters: table.filters,
        pagination: { current: 1, pageSize: 500 },
        sort:
          typeof table.sorter.field === 'string'
            ? {
                field: table.sorter.field,
                order: table.sorter.order ?? undefined,
              }
            : undefined,
      });

      downloadCsv(buildCsvFileName('projects'), exportColumns, result.data);
      message.success('CSV exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export projects.');
    } finally {
      setExporting(false);
    }
  }, [exportColumns, message, table.filters, table.provider, table.sorter.field, table.sorter.order]);

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
      requestId: undefined,
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

  function openDetailDrawer(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedProject(null);
    setDetailError(null);
    setDetailOpen(true);
  }

  function closeDetailDrawer() {
    setDetailOpen(false);
    setSelectedProjectId(null);
    setSelectedProject(null);
    setDetailError(null);
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
          <ListToolbar
            filterDefinitions={filterDefinitions}
            visibleFilterKeys={visibleFilterKeys}
            onVisibleFilterKeysChange={setVisibleFilterKeys}
            onApply={() => table.setFilters(filterValues)}
            onReset={() => {
              setFilterValues({});
              table.setFilters({});
            }}
            onExport={() => void handleExport()}
            exporting={exporting}
            columnDefinitions={[
              { key: 'projectCode', label: 'Project Code' },
              { key: 'name', label: 'Name' },
              { key: 'request', label: 'Requests' },
              { key: 'requestsCount', label: 'Count' },
              { key: 'pmOwner', label: 'PM Owner' },
              { key: 'status', label: 'Status' },
              { key: 'businessPriority', label: 'Priority' },
              { key: 'plannedLiveDate', label: 'Planned Live' },
              { key: 'actualLiveDate', label: 'Actual Live' },
              { key: 'actions', label: 'Actions', alwaysVisible: true },
            ]}
            visibleColumnKeys={visibleColumnKeys}
            onVisibleColumnKeysChange={setVisibleColumnKeys}
          />
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
          columns={visibleColumns}
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
          <Form.Item label="Attach one request now" name="requestId">
            <Select
              allowClear
              options={requestOptions}
              placeholder="Optional quick-link for one request"
            />
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

      <Drawer
        title={selectedProject ? `Project: ${selectedProject.projectCode}` : 'Project Detail'}
        width={760}
        open={detailOpen}
        onClose={closeDetailDrawer}
        destroyOnClose
      >
        {detailLoading ? <Spin /> : null}
        {detailError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load project"
            description={detailError.message}
          />
        ) : null}
        {selectedProject && !detailLoading ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                { key: 'code', label: 'Project code', children: selectedProject.projectCode },
                { key: 'name', label: 'Name', children: selectedProject.name },
                { key: 'team', label: 'Requester team', children: selectedProject.requesterTeam.name },
                { key: 'owner', label: 'PM owner', children: selectedProject.pmOwner?.displayName ?? '-' },
                { key: 'status', label: 'Status', children: selectedProject.status ?? '-' },
                { key: 'priority', label: 'Priority', children: selectedProject.businessPriority ?? '-' },
                {
                  key: 'requestsCount',
                  label: 'Linked requests',
                  children:
                    selectedProject.requestsCount ?? getProjectRequests(selectedProject).length,
                },
                {
                  key: 'plannedLive',
                  label: 'Planned live date',
                  children: formatDate(selectedProject.plannedLiveDate),
                },
                {
                  key: 'actualLive',
                  label: 'Actual live date',
                  children: formatDate(selectedProject.actualLiveDate),
                },
                { key: 'notes', label: 'Notes', children: selectedProject.notes || '-' },
              ]}
            />

            <div>
              <Text strong>Related requests</Text>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                style={{ marginTop: 12 }}
                dataSource={getProjectRequests(selectedProject)}
                locale={{
                  emptyText: <Empty description="No linked requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
                columns={[
                  {
                    title: 'Request Code',
                    dataIndex: 'requestCode',
                    key: 'requestCode',
                    width: 160,
                  },
                  {
                    title: 'Title',
                    dataIndex: 'title',
                    key: 'title',
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    width: 140,
                    render: (value) => value ? <Tag>{value}</Tag> : '-',
                  },
                ]}
              />
            </div>

            <ProjectEventsSection
              title="Project Timeline"
              description="Track operational milestones, scope shifts, handovers, and live-history for this project."
              projectId={selectedProject.id}
              projectOptions={[
                {
                  value: selectedProject.id,
                  label: `${selectedProject.projectCode} · ${selectedProject.name}`,
                },
              ]}
              requestOptions={getProjectRequests(selectedProject).map((request) => ({
                value: request.id,
                label: `${request.requestCode} · ${request.title}`,
              }))}
              userOptions={userOptions}
              canCreate={canUpdate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              emptyDescription="No timeline events have been recorded for this project yet."
            />

            <RequestAssignmentsSection
              title="Project Assignments"
              description="Review request-level ownership across this project, with member filters and FE/BE complexity details where estimation is needed."
              projectId={selectedProject.id}
              requestOptions={getProjectRequests(selectedProject).map((request) => ({
                value: request.id,
                label: `${request.requestCode} · ${request.title}`,
              }))}
              projectOptions={[
                {
                  value: selectedProject.id,
                  label: `${selectedProject.projectCode} · ${selectedProject.name}`,
                },
              ]}
              userOptions={userOptions}
              canCreate={canUpdate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              emptyDescription="No request assignments have been added for this project yet."
            />
          </Space>
        ) : null}
      </Drawer>
    </PermissionBoundary>
  );
}
