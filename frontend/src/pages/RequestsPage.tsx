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
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderAddOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { convertRequestToProject } from '@/api/requests';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ListToolbar } from '@/components/table/ListToolbar';
import { ProjectPicker } from '@/components/ProjectPicker';
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
import type { RequestRecord } from '@/types/domain';
import { buildCsvFileName, downloadCsv, type CsvColumnDefinition } from '@/utils/csv';
import { formatDate, toIsoString, toDateInputValue } from '@/utils/format';
import {
  projectStatusOptions,
  requestPriorityOptions,
  requestStatusOptions,
  requestTypeOptions,
  riskLevelOptions,
  scopeTypeOptions,
} from '@/utils/options';

const { TextArea } = Input;
const { Text } = Typography;

export default function RequestsPage() {
  usePageTitle('Requests');
  const { message } = App.useApp();
  const { user } = useAuth();
  const provider = useDataProvider();
  const { hasPermission } = usePermissions();
  const canView =
    hasPermission('requests:view') ||
    hasPermission('requests:view_own') ||
    hasPermission('requests:create') ||
    hasPermission('requests:update_own');
  const canCreate = hasPermission('requests:create');
  const canUpdate = hasPermission('requests:update') || hasPermission('requests:update_own');
  const canDelete = hasPermission('requests:delete');
  const canCreateProjects = hasPermission('projects:create');
  const canManageProjectEvents = hasPermission('projects:update');
  const canDeleteProjectEvents = hasPermission('projects:delete');
  const canManageAssignments = hasPermission('projects:update');
  const canDeleteAssignments = hasPermission('projects:delete');
  const { teamOptions, projectOptions, userOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RequestRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DataProviderError | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [attachForm] = Form.useForm<{ projectId: string }>();
  const [createProjectForm] = Form.useForm<Record<string, unknown>>();
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'requests-visible-filters',
    ['teamId', 'requestType', 'priority', 'status'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'requests-visible-columns',
    [
      'requestCode',
      'title',
      'requesterTeam',
      'campaignName',
      'project',
      'requestType',
      'priority',
      'desiredLiveDate',
      'status',
      'businessValueScore',
      'urgencyScore',
    ],
  );

  const table = useCrudTable<RequestRecord>({
    resource: 'requests',
    initialPageSize: 10,
    initialSort: { field: 'createdAt', order: 'descend' },
  });

  useEffect(() => {
    if (!detailOpen || !selectedRequestId) {
      return;
    }

    let cancelled = false;

    const loadRequest = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const result = await provider.getOne<RequestRecord>({
          resource: 'requests',
          id: selectedRequestId,
        });

        if (!cancelled) {
          setSelectedRequest(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailError(error as DataProviderError);
          setSelectedRequest(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadRequest();

    return () => {
      cancelled = true;
    };
  }, [detailOpen, provider, selectedRequestId]);

  const columns = useMemo<ColumnsType<RequestRecord>>(
    () => [
      {
        title: 'Request Code',
        dataIndex: 'requestCode',
        key: 'requestCode',
        sorter: true,
        width: 130,
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        sorter: true,
        width: 240,
      },
      {
        title: 'Team',
        key: 'requesterTeam',
        render: (_, record) => record.requesterTeam.name,
        width: 160,
      },
      {
        title: 'Campaign',
        dataIndex: 'campaignName',
        key: 'campaignName',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: 'Linked Project',
        key: 'project',
        width: 220,
        render: (_, record) =>
          record.project ? `${record.project.projectCode} · ${record.project.name}` : (
            <Text type="secondary">Unlinked</Text>
          ),
      },
      {
        title: 'Type',
        dataIndex: 'requestType',
        key: 'requestType',
        width: 120,
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: 'Priority',
        dataIndex: 'priority',
        key: 'priority',
        width: 120,
        render: (value) => <Tag color={value === 'high' ? 'red' : 'gold'}>{value}</Tag>,
      },
      {
        title: 'Deadline',
        dataIndex: 'desiredLiveDate',
        key: 'desiredLiveDate',
        width: 130,
        render: (value) => formatDate(value),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (value) => <Tag color={value === 'approved' ? 'green' : 'blue'}>{value}</Tag>,
      },
      {
        title: 'Business Value',
        dataIndex: 'businessValueScore',
        key: 'businessValueScore',
        width: 140,
        align: 'right',
        render: (value) => value ?? '-',
      },
      {
        title: 'Urgency',
        dataIndex: 'urgencyScore',
        key: 'urgencyScore',
        width: 110,
        align: 'right',
        render: (value) => value ?? '-',
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 240,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetailDrawer(record.id)}
            >
              View
            </Button>
            {canUpdate ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditDrawer(record)}
              />
            ) : null}
            {canCreateProjects && !record.project ? (
              <Button
                size="small"
                icon={<FolderAddOutlined />}
                onClick={() => openAttachProjectModal(record)}
              />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete request?"
                description={`This will remove ${record.requestCode}.`}
                onConfirm={() => void handleDelete(record)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canCreateProjects, canDelete, canUpdate],
  );

  const visibleColumns = useMemo(
    () =>
      columns.filter((column) => {
        const key = String(column.key ?? '');
        return key === 'actions' || visibleColumnKeys.includes(key);
      }),
    [columns, visibleColumnKeys],
  );

  const exportColumns = useMemo<CsvColumnDefinition<RequestRecord>[]>(
    () =>
      [
        { key: 'requestCode', label: 'Request Code', getValue: (record: RequestRecord) => record.requestCode },
        { key: 'title', label: 'Title', getValue: (record: RequestRecord) => record.title },
        { key: 'requesterTeam', label: 'Team', getValue: (record: RequestRecord) => record.requesterTeam.name },
        { key: 'campaignName', label: 'Campaign', getValue: (record: RequestRecord) => record.campaignName ?? '' },
        {
          key: 'project',
          label: 'Linked Project',
          getValue: (record: RequestRecord) =>
            record.project ? `${record.project.projectCode} · ${record.project.name}` : '',
        },
        { key: 'requestType', label: 'Type', getValue: (record: RequestRecord) => record.requestType ?? '' },
        { key: 'priority', label: 'Priority', getValue: (record: RequestRecord) => record.priority ?? '' },
        { key: 'desiredLiveDate', label: 'Deadline', getValue: (record: RequestRecord) => formatDate(record.desiredLiveDate) },
        { key: 'status', label: 'Status', getValue: (record: RequestRecord) => record.status ?? '' },
        { key: 'businessValueScore', label: 'Business Value', getValue: (record: RequestRecord) => record.businessValueScore ?? '' },
        { key: 'urgencyScore', label: 'Urgency', getValue: (record: RequestRecord) => record.urgencyScore ?? '' },
      ].filter((column) => visibleColumnKeys.includes(column.key)),
    [visibleColumnKeys],
  );

  const filterDefinitions = useMemo(
    () => [
      {
        key: 'teamId',
        label: 'Team',
        node: (
          <Select
            allowClear
            placeholder="Team"
            options={teamOptions}
            style={{ width: 180 }}
            value={filterValues.teamId as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, teamId: value }))}
          />
        ),
      },
      {
        key: 'requestType',
        label: 'Request type',
        node: (
          <Select
            allowClear
            placeholder="Request type"
            options={requestTypeOptions}
            style={{ width: 160 }}
            value={filterValues.requestType as string | undefined}
            onChange={(value) =>
              setFilterValues((current) => ({ ...current, requestType: value }))
            }
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
            style={{ width: 150 }}
            value={filterValues.priority as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, priority: value }))}
          />
        ),
      },
      {
        key: 'status',
        label: 'Status',
        node: (
          <Select
            allowClear
            placeholder="Status"
            options={requestStatusOptions}
            style={{ width: 150 }}
            value={filterValues.status as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, status: value }))}
          />
        ),
      },
      {
        key: 'projectId',
        label: 'Project',
        node: (
          <ProjectPicker
            allowClear
            placeholder="Project"
            options={projectOptions}
            style={{ width: 220 }}
            value={filterValues.projectId as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, projectId: value }))}
          />
        ),
      },
    ],
    [filterValues.priority, filterValues.projectId, filterValues.requestType, filterValues.status, filterValues.teamId, projectOptions, teamOptions],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      const result = await table.provider.getList<RequestRecord>({
        resource: 'requests',
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

      downloadCsv(buildCsvFileName('requests'), exportColumns, result.data);
      message.success('CSV exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export requests.');
    } finally {
      setExporting(false);
    }
  }, [exportColumns, message, table.filters, table.provider, table.sorter.field, table.sorter.order]);

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'new',
      priority: 'medium',
      requesterTeamId: user?.team?.id,
      requestType: 'feature',
      scopeType: 'full',
      projectId: undefined,
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: RequestRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      requesterTeamId: record.requesterTeam.id,
      projectId: record.projectId ?? record.project?.id,
      desiredLiveDate: toDateInputValue(record.desiredLiveDate),
      backendStartDate: toDateInputValue(record.backendStartDate),
      backendEndDate: toDateInputValue(record.backendEndDate),
      frontendStartDate: toDateInputValue(record.frontendStartDate),
      frontendEndDate: toDateInputValue(record.frontendEndDate),
    });
    setDrawerOpen(true);
  }

  function openDetailDrawer(requestId: string) {
    setSelectedRequestId(requestId);
    setSelectedRequest(null);
    setDetailError(null);
    setDetailOpen(true);
  }

  function closeDetailDrawer() {
    setDetailOpen(false);
    setSelectedRequestId(null);
    setSelectedRequest(null);
    setDetailError(null);
  }

  function openAttachProjectModal(record: RequestRecord) {
    setSelectedRequest(record);
    attachForm.setFieldsValue({
      projectId: record.project?.id,
    });
    createProjectForm.setFieldsValue({
      projectCode: `${record.requestCode}-PRJ`,
      name: record.title,
      pmOwnerId: undefined,
      projectType: record.requestType ?? 'feature',
      status: 'planned',
      businessPriority: record.priority ?? 'medium',
      plannedLiveDate: toDateInputValue(record.desiredLiveDate),
    });
    setAttachModalOpen(true);
  }

  function closeProjectLinkModals() {
    setAttachModalOpen(false);
    setCreateProjectModalOpen(false);
    attachForm.resetFields();
    createProjectForm.resetFields();
  }

  async function handleDelete(record: RequestRecord) {
    try {
      await table.provider.delete({ resource: 'requests', id: record.id });
      message.success(`Deleted ${record.requestCode}.`);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete request.');
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        projectId: values.projectId || null,
        desiredLiveDate: toIsoString(values.desiredLiveDate as string | undefined),
        backendStartDate: toIsoString(values.backendStartDate as string | undefined),
        backendEndDate: toIsoString(values.backendEndDate as string | undefined),
        frontendStartDate: toIsoString(values.frontendStartDate as string | undefined),
        frontendEndDate: toIsoString(values.frontendEndDate as string | undefined),
      };

      if (editingRecord) {
        await table.provider.update({
          resource: 'requests',
          id: editingRecord.id,
          values: payload,
        });
        message.success(`Updated ${editingRecord.requestCode}.`);
      } else {
        await table.provider.create({
          resource: 'requests',
          values: payload,
        });
        message.success('Request created successfully.');
      }

      setDrawerOpen(false);
      form.resetFields();
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAttachToExistingProject(values: { projectId: string }) {
    if (!selectedRequest) {
      return;
    }

    setConverting(true);

    try {
      const project = await convertRequestToProject(selectedRequest.id, {
        projectId: values.projectId,
      });
      message.success(`Attached ${selectedRequest.requestCode} to ${project.projectCode}.`);
      closeProjectLinkModals();
      closeDetailDrawer();
      await Promise.all([table.refresh()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to attach request to project.');
    } finally {
      setConverting(false);
    }
  }

  async function handleCreateProjectFromRequest(values: Record<string, unknown>) {
    if (!selectedRequest) {
      return;
    }

    setConverting(true);

    try {
      const project = await convertRequestToProject(selectedRequest.id, {
        ...values,
        plannedStartDate: toIsoString(values.plannedStartDate as string | undefined),
        plannedLiveDate: toIsoString(values.plannedLiveDate as string | undefined),
        actualStartDate: toIsoString(values.actualStartDate as string | undefined),
        actualLiveDate: toIsoString(values.actualLiveDate as string | undefined),
        backendStartDate: toIsoString(values.backendStartDate as string | undefined),
        backendEndDate: toIsoString(values.backendEndDate as string | undefined),
        frontendStartDate: toIsoString(values.frontendStartDate as string | undefined),
        frontendEndDate: toIsoString(values.frontendEndDate as string | undefined),
      });
      message.success(`Created ${project.projectCode} and linked ${selectedRequest.requestCode}.`);
      closeProjectLinkModals();
      closeDetailDrawer();
      await Promise.all([table.refresh()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to create project from request.');
    } finally {
      setConverting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Demand Intake"
        title="Requests"
        description="Capture incoming work, keep intake quality high, and let PMs update demand quickly without leaving the table."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Request
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
              { key: 'requestCode', label: 'Request Code' },
              { key: 'title', label: 'Title' },
              { key: 'requesterTeam', label: 'Team' },
              { key: 'campaignName', label: 'Campaign' },
              { key: 'project', label: 'Linked Project' },
              { key: 'requestType', label: 'Type' },
              { key: 'priority', label: 'Priority' },
              { key: 'desiredLiveDate', label: 'Deadline' },
              { key: 'status', label: 'Status' },
              { key: 'businessValueScore', label: 'Business Value' },
              { key: 'urgencyScore', label: 'Urgency' },
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
            message="Unable to load requests"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <Table<RequestRecord>
          rowKey="id"
          columns={visibleColumns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1480 }}
          locale={{
            emptyText: table.loading ? 'Loading requests...' : <Empty description="No requests found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? `Edit ${editingRecord.requestCode}` : 'Create Request'}
        width={720}
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
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Form.Item label="Request code" name="requestCode" rules={[{ required: true }]}>
              <Input placeholder="REQ-024" />
            </Form.Item>
            <Form.Item label="Title" name="title" rules={[{ required: true }]}>
              <Input placeholder="Improve campaign delivery reporting" />
            </Form.Item>
            <Form.Item
              label="Requester team"
              name="requesterTeamId"
              rules={[{ required: true, message: 'Please select a team.' }]}
            >
              <Select options={teamOptions} placeholder="Select team" />
            </Form.Item>
            <Form.Item label="Campaign name" name="campaignName">
              <Input placeholder="Q2 Growth Sprint" />
            </Form.Item>
            <Form.Item label="Linked project" name="projectId">
              <ProjectPicker
                allowClear
                options={projectOptions}
                placeholder="Optional project linkage"
              />
            </Form.Item>
            <Space.Compact block>
              <Form.Item
                label="Request type"
                name="requestType"
                rules={[{ required: true }]}
                style={{ width: '33%' }}
              >
                <Select options={requestTypeOptions} />
              </Form.Item>
              <Form.Item
                label="Scope type"
                name="scopeType"
                rules={[{ required: true }]}
                style={{ width: '33%' }}
              >
                <Select options={scopeTypeOptions} />
              </Form.Item>
              <Form.Item
                label="Priority"
                name="priority"
                rules={[{ required: true }]}
                style={{ width: '34%' }}
              >
                <Select options={requestPriorityOptions} />
              </Form.Item>
            </Space.Compact>
            <Space.Compact block>
              <Form.Item
                label="Desired live date"
                name="desiredLiveDate"
                style={{ width: '50%' }}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Status" name="status" rules={[{ required: true }]} style={{ width: '50%' }}>
                <Select options={requestStatusOptions} />
              </Form.Item>
            </Space.Compact>
            <Form.Item label="Brief" name="brief">
              <TextArea rows={3} placeholder="What should this request achieve?" />
            </Form.Item>
            <Space.Compact block>
              <Form.Item label="Backend start" name="backendStartDate" style={{ width: '25%' }}>
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Backend end" name="backendEndDate" style={{ width: '25%' }}>
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Frontend start" name="frontendStartDate" style={{ width: '25%' }}>
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Frontend end" name="frontendEndDate" style={{ width: '25%' }}>
                <Input type="date" />
              </Form.Item>
            </Space.Compact>
            <Space.Compact block>
              <Form.Item label="Business value" name="businessValueScore" style={{ width: '33%' }}>
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="User impact" name="userImpactScore" style={{ width: '33%' }}>
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Urgency" name="urgencyScore" style={{ width: '34%' }}>
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Space.Compact>
            <Form.Item label="Value note" name="valueNote">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item label="Comment" name="comment">
              <TextArea rows={2} />
            </Form.Item>
          </Space>
        </Form>
        {!teamOptions.length ? (
          <Text type="secondary">
            Team choices come from existing users, requests, projects, and your current profile.
          </Text>
        ) : null}
      </Drawer>

      <Drawer
        title={selectedRequest ? `Request: ${selectedRequest.requestCode}` : 'Request Detail'}
        width={720}
        open={detailOpen}
        onClose={closeDetailDrawer}
        destroyOnClose
        extra={
          selectedRequest && canCreateProjects && !selectedRequest.project ? (
            <Space>
              <Button icon={<LinkOutlined />} onClick={() => openAttachProjectModal(selectedRequest)}>
                Link Project
              </Button>
            </Space>
          ) : null
        }
      >
        {detailLoading ? <Spin /> : null}
        {detailError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load request"
            description={detailError.message}
          />
        ) : null}
        {selectedRequest && !detailLoading ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                { key: 'code', label: 'Request code', children: selectedRequest.requestCode },
                { key: 'title', label: 'Title', children: selectedRequest.title },
                { key: 'team', label: 'Requester team', children: selectedRequest.requesterTeam.name },
                {
                  key: 'project',
                  label: 'Linked project',
                  children: selectedRequest.project
                    ? `${selectedRequest.project.projectCode} · ${selectedRequest.project.name}`
                    : 'Not linked yet',
                },
                { key: 'type', label: 'Type', children: selectedRequest.requestType ?? '-' },
                { key: 'priority', label: 'Priority', children: selectedRequest.priority ?? '-' },
                { key: 'status', label: 'Status', children: selectedRequest.status ?? '-' },
                {
                  key: 'deadline',
                  label: 'Desired live date',
                  children: formatDate(selectedRequest.desiredLiveDate),
                },
                {
                  key: 'value',
                  label: 'Value / urgency',
                  children: `Value ${selectedRequest.businessValueScore ?? '-'} · Urgency ${selectedRequest.urgencyScore ?? '-'}`,
                },
                { key: 'brief', label: 'Brief', children: selectedRequest.brief || '-' },
                { key: 'comment', label: 'Comment', children: selectedRequest.comment || '-' },
              ]}
            />

            {selectedRequest.project ? (
              <>
                <RequestAssignmentsSection
                  title="Request Assignments"
                  description="Track delivery ownership, planned effort, actual effort, and FE/BE estimation complexity for this request."
                  requestId={selectedRequest.id}
                  projectId={selectedRequest.project.id}
                  requestOptions={[
                    {
                      value: selectedRequest.id,
                      label: `${selectedRequest.requestCode} · ${selectedRequest.title}`,
                    },
                  ]}
                  projectOptions={[
                    {
                      value: selectedRequest.project.id,
                      label: `${selectedRequest.project.projectCode} · ${selectedRequest.project.name}`,
                    },
                  ]}
                  userOptions={userOptions}
                  canCreate={canManageAssignments}
                  canUpdate={canManageAssignments}
                  canDelete={canDeleteAssignments}
                  emptyDescription="No request assignments have been recorded yet."
                />

                <ProjectEventsSection
                  title="Request Timeline"
                  description="Request-level events scoped to this request within its linked project."
                  projectId={selectedRequest.project.id}
                  requestId={selectedRequest.id}
                  projectOptions={[
                    {
                      value: selectedRequest.project.id,
                      label: `${selectedRequest.project.projectCode} · ${selectedRequest.project.name}`,
                    },
                  ]}
                  requestOptions={[
                    {
                      value: selectedRequest.id,
                      label: `${selectedRequest.requestCode} · ${selectedRequest.title}`,
                    },
                  ]}
                  userOptions={userOptions}
                  canCreate={canManageProjectEvents}
                  canUpdate={canManageProjectEvents}
                  canDelete={canDeleteProjectEvents}
                  emptyDescription="No request-specific events have been recorded yet."
                />
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                  message="Project events become available after this request is linked to a project."
              />
            )}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="Attach request to a project"
        open={attachModalOpen}
        onCancel={closeProjectLinkModals}
        onOk={() => void attachForm.submit()}
        confirmLoading={converting}
        okText="Attach"
        destroyOnClose
        footer={(_, { OkBtn, CancelBtn }) => (
          <Space>
            <Button onClick={() => {
              setAttachModalOpen(false);
              setCreateProjectModalOpen(true);
            }}>
              Create New Project Instead
            </Button>
            <CancelBtn />
            <OkBtn />
          </Space>
        )}
      >
        <Form form={attachForm} layout="vertical" onFinish={(values) => void handleAttachToExistingProject(values)}>
          <Form.Item
            label="Existing project"
            name="projectId"
            rules={[{ required: true, message: 'Please select a project.' }]}
          >
            <ProjectPicker
              options={projectOptions}
              placeholder="Choose a project to attach this request"
            />
          </Form.Item>
          <Text type="secondary">
            This keeps the request as the source of truth and links it to the selected project.
          </Text>
        </Form>
      </Modal>

      <Modal
        title="Create project from request"
        open={createProjectModalOpen}
        onCancel={closeProjectLinkModals}
        onOk={() => void createProjectForm.submit()}
        confirmLoading={converting}
        okText="Create Project"
        width={720}
        destroyOnClose
      >
        <Form
          form={createProjectForm}
          layout="vertical"
          onFinish={(values) => void handleCreateProjectFromRequest(values)}
        >
          <Form.Item label="Project code" name="projectCode" rules={[{ required: true }]}>
            <Input placeholder="REQ-024-PRJ" />
          </Form.Item>
          <Form.Item label="Project name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="PM owner" name="pmOwnerId" style={{ width: '34%' }}>
              <Select allowClear options={userOptions} />
            </Form.Item>
            <Form.Item label="Project type" name="projectType" style={{ width: '33%' }}>
              <Select options={requestTypeOptions} />
            </Form.Item>
            <Form.Item label="Status" name="status" style={{ width: '33%' }}>
              <Select options={projectStatusOptions} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Priority" name="businessPriority" style={{ width: '34%' }}>
              <Select options={requestPriorityOptions} />
            </Form.Item>
            <Form.Item label="Risk level" name="riskLevel" style={{ width: '33%' }}>
              <Select allowClear options={riskLevelOptions} />
            </Form.Item>
            <Form.Item label="Planned live" name="plannedLiveDate" style={{ width: '33%' }}>
              <Input type="date" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Optional delivery context for the new project" />
          </Form.Item>
        </Form>
      </Modal>
    </PermissionBoundary>
  );
}
