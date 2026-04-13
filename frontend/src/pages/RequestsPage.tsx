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
  Typography,
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
import { formatDate, toIsoString, toDateInputValue } from '@/utils/format';
import {
  requestPriorityOptions,
  requestStatusOptions,
  requestTypeOptions,
  scopeTypeOptions,
} from '@/utils/options';

const { TextArea } = Input;
const { Text } = Typography;

interface RequestRecord {
  id: string;
  requestCode: string;
  title: string;
  requesterTeam: {
    id: string;
    code: string;
    name: string;
  };
  campaignName?: string | null;
  requestType: string;
  scopeType: string;
  priority: string;
  desiredLiveDate?: string | null;
  brief?: string | null;
  status: string;
  backendStartDate?: string | null;
  backendEndDate?: string | null;
  frontendStartDate?: string | null;
  frontendEndDate?: string | null;
  businessValueScore?: number | null;
  userImpactScore?: number | null;
  urgencyScore?: number | null;
  valueNote?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RequestsPage() {
  usePageTitle('Requests');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('requests:view');
  const canCreate = hasPermission('requests:create');
  const canUpdate = hasPermission('requests:update');
  const canDelete = hasPermission('requests:delete');
  const { teamOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RequestRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [form] = Form.useForm();

  const table = useCrudTable<RequestRecord>({
    resource: 'requests',
    initialPageSize: 10,
    initialSort: { field: 'createdAt', order: 'descend' },
  });

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
        width: 120,
        render: (_, record) => (
          <Space>
            {canUpdate ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditDrawer(record)}
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
    [canDelete, canUpdate],
  );

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'new',
      priority: 'medium',
      requesterTeamId: user?.team?.id,
      requestType: 'feature',
      scopeType: 'full',
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: RequestRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      requesterTeamId: record.requesterTeam.id,
      desiredLiveDate: toDateInputValue(record.desiredLiveDate),
      backendStartDate: toDateInputValue(record.backendStartDate),
      backendEndDate: toDateInputValue(record.backendEndDate),
      frontendStartDate: toDateInputValue(record.frontendStartDate),
      frontendEndDate: toDateInputValue(record.frontendEndDate),
    });
    setDrawerOpen(true);
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
          <Space wrap>
            <Select
              allowClear
              placeholder="Team"
              options={teamOptions}
              style={{ width: 180 }}
              value={filterValues.teamId as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, teamId: value }))}
            />
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
            <Select
              allowClear
              placeholder="Priority"
              options={requestPriorityOptions}
              style={{ width: 150 }}
              value={filterValues.priority as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, priority: value }))}
            />
            <Select
              allowClear
              placeholder="Status"
              options={requestStatusOptions}
              style={{ width: 150 }}
              value={filterValues.status as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, status: value }))}
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
          columns={columns}
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
    </PermissionBoundary>
  );
}
