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
import { formatDateTime, toDateTimeInputValue, toIsoString } from '@/utils/format';
import { incidentDomainOptions, incidentSeverityOptions, incidentStatusOptions } from '@/utils/options';

const { Paragraph, Text } = Typography;

interface IncidentRecord {
  id: string;
  incidentCode: string;
  project: {
    id: string;
    projectCode: string;
    name: string;
    status: string;
  };
  foundAt: string;
  severity: string;
  domain: string;
  impactDescription: string;
  resolvers?: string | null;
  background?: string | null;
  solution?: string | null;
  processingMinutes?: number | null;
  tag?: string | null;
  status: string;
  ownerMember?: {
    id: string;
    email: string;
    displayName: string;
  } | null;
}

export default function IncidentsPage() {
  usePageTitle('Incidents');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('incidents:view');
  const canCreate = hasPermission('incidents:create');
  const canUpdate = hasPermission('incidents:update');
  const canDelete = hasPermission('incidents:delete');
  const { projectOptions, userOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncidentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [form] = Form.useForm();

  const table = useCrudTable<IncidentRecord>({
    resource: 'incidents',
    initialPageSize: 10,
    initialSort: { field: 'foundAt', order: 'descend' },
  });

  const columns = useMemo<ColumnsType<IncidentRecord>>(
    () => [
      { title: 'Incident Code', dataIndex: 'incidentCode', key: 'incidentCode', width: 150, sorter: true },
      {
        title: 'Project',
        key: 'project',
        width: 220,
        render: (_, record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 120,
        render: (value) => <Tag color={value === 'critical' ? 'red' : value === 'high' ? 'orange' : 'blue'}>{value}</Tag>,
      },
      { title: 'Domain', dataIndex: 'domain', key: 'domain', width: 120, render: (value) => <Tag>{value}</Tag> },
      { title: 'Found At', dataIndex: 'foundAt', key: 'foundAt', width: 170, render: (value) => formatDateTime(value) },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value) => <Tag color={value === 'resolved' ? 'green' : 'gold'}>{value}</Tag>,
      },
      {
        title: 'Owner',
        key: 'ownerMember',
        width: 170,
        render: (_, record) => record.ownerMember?.displayName ?? '-',
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
                title="Delete incident?"
                description={`This will remove ${record.incidentCode}.`}
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
      severity: 'medium',
      domain: 'backend',
      status: 'open',
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: IncidentRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      projectId: record.project.id,
      ownerMemberId: record.ownerMember?.id,
      foundAt: toDateTimeInputValue(record.foundAt),
    });
    setDrawerOpen(true);
  }

  async function handleDelete(record: IncidentRecord) {
    try {
      await table.provider.delete({ resource: 'incidents', id: record.id });
      message.success(`Deleted ${record.incidentCode}.`);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete incident.');
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        foundAt: toIsoString(values.foundAt as string | undefined),
      };

      if (editingRecord) {
        await table.provider.update({ resource: 'incidents', id: editingRecord.id, values: payload });
        message.success(`Updated ${editingRecord.incidentCode}.`);
      } else {
        await table.provider.create({ resource: 'incidents', values: payload });
        message.success('Incident created.');
      }

      setDrawerOpen(false);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save incident.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Operational Stability"
        title="Incidents"
        description="Track active incidents, keep ownership visible, and make root cause plus resolution context easy to read."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Incident
              </Button>
            ) : null}
          </Space>
        }
        filters={
          <Space wrap>
            <Select
              allowClear
              placeholder="Severity"
              options={incidentSeverityOptions}
              style={{ width: 150 }}
              value={filterValues.severity as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, severity: value }))}
            />
            <Select
              allowClear
              placeholder="Domain"
              options={incidentDomainOptions}
              style={{ width: 150 }}
              value={filterValues.domain as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, domain: value }))}
            />
            <Select
              allowClear
              placeholder="Status"
              options={incidentStatusOptions}
              style={{ width: 150 }}
              value={filterValues.status as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, status: value }))}
            />
            <Input
              type="date"
              style={{ width: 150 }}
              value={((filterValues.foundAtRange as { from?: string } | undefined)?.from ?? '') as string}
              onChange={(event) =>
                setFilterValues((current) => ({
                  ...current,
                  foundAtRange: {
                    ...(current.foundAtRange as Record<string, unknown> | undefined),
                    from: event.target.value || undefined,
                  },
                }))
              }
            />
            <Input
              type="date"
              style={{ width: 150 }}
              value={((filterValues.foundAtRange as { to?: string } | undefined)?.to ?? '') as string}
              onChange={(event) =>
                setFilterValues((current) => ({
                  ...current,
                  foundAtRange: {
                    ...(current.foundAtRange as Record<string, unknown> | undefined),
                    to: event.target.value || undefined,
                  },
                }))
              }
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
            message="Unable to load incidents"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}
        <Table<IncidentRecord>
          rowKey="id"
          columns={columns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1320 }}
          expandable={{
            expandedRowRender: (record) => (
              <Space direction="vertical" size="small">
                <Text strong>Impact</Text>
                <Paragraph style={{ marginBottom: 0 }}>{record.impactDescription || '-'}</Paragraph>
                <Text strong>Background</Text>
                <Paragraph style={{ marginBottom: 0 }}>{record.background || '-'}</Paragraph>
                <Text strong>Solution</Text>
                <Paragraph style={{ marginBottom: 0 }}>{record.solution || '-'}</Paragraph>
              </Space>
            ),
          }}
          locale={{
            emptyText: table.loading ? 'Loading incidents...' : <Empty description="No incidents found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? `Edit ${editingRecord.incidentCode}` : 'Create Incident'}
        width={680}
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
          <Form.Item label="Incident code" name="incidentCode" rules={[{ required: true }]}>
            <Input placeholder="INC-018" />
          </Form.Item>
          <Form.Item label="Project" name="projectId" rules={[{ required: true }]}>
            <Select options={projectOptions} />
          </Form.Item>
          <Form.Item label="Found at" name="foundAt" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Severity" name="severity" rules={[{ required: true }]} style={{ width: '33%' }}>
              <Select options={incidentSeverityOptions} />
            </Form.Item>
            <Form.Item label="Domain" name="domain" rules={[{ required: true }]} style={{ width: '33%' }}>
              <Select options={incidentDomainOptions} />
            </Form.Item>
            <Form.Item label="Status" name="status" rules={[{ required: true }]} style={{ width: '34%' }}>
              <Select options={incidentStatusOptions} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Impact description" name="impactDescription" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Resolvers" name="resolvers">
            <Input placeholder="Alice, Bob" />
          </Form.Item>
          <Form.Item label="Background" name="background">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Solution" name="solution">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Processing minutes" name="processingMinutes" style={{ width: '50%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Tag" name="tag" style={{ width: '50%' }}>
              <Input placeholder="sev1" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Owner" name="ownerMemberId">
            <Select allowClear options={userOptions} />
          </Form.Item>
        </Form>
      </Drawer>
    </PermissionBoundary>
  );
}
