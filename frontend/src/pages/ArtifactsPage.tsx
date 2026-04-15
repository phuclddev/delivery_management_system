import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ListToolbar } from '@/components/table/ListToolbar';
import { ProjectPicker } from '@/components/ProjectPicker';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { buildCsvFileName, downloadCsv, type CsvColumnDefinition } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';
import { artifactTypeOptions } from '@/utils/options';

const { Paragraph, Text } = Typography;

interface ArtifactRecord {
  id: string;
  project: {
    id: string;
    projectCode: string;
    name: string;
    status: string;
  };
  artifactType: string;
  title: string;
  contentText?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  uploader?: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ArtifactsPage() {
  usePageTitle('Artifacts');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('artifacts:view');
  const canCreate = hasPermission('artifacts:create');
  const canUpdate = hasPermission('artifacts:update');
  const canDelete = hasPermission('artifacts:delete');
  const { projectOptions, userOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ArtifactRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ArtifactRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'artifacts-visible-filters',
    ['projectId', 'artifactType', 'isFinal'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'artifacts-visible-columns',
    ['artifactType', 'title', 'project', 'isFinal', 'createdAt'],
  );

  const table = useCrudTable<ArtifactRecord>({
    resource: 'artifacts',
    initialPageSize: 10,
    initialSort: { field: 'createdAt', order: 'descend' },
  });

  const columns = useMemo<ColumnsType<ArtifactRecord>>(
    () => [
      { title: 'Type', dataIndex: 'artifactType', key: 'artifactType', width: 140, render: (value) => <Tag>{value}</Tag> },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        width: 260,
        render: (_, record) => (
          <Button type="link" style={{ padding: 0 }} onClick={() => openPreview(record)}>
            {record.title}
          </Button>
        ),
      },
      {
        title: 'Project',
        key: 'project',
        width: 230,
        render: (_, record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      {
        title: 'Final',
        dataIndex: 'isFinal',
        key: 'isFinal',
        width: 100,
        render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Final' : 'Draft'}</Tag>,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (value) => formatDateTime(value),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 150,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)} />
            {canUpdate ? (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete artifact?"
                description={`This will remove ${record.title}.`}
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

  const exportColumns = useMemo<CsvColumnDefinition<ArtifactRecord>[]>(
    () => [
      { key: 'artifactType', label: 'Type', getValue: (record) => record.artifactType },
      { key: 'title', label: 'Title', getValue: (record) => record.title },
      {
        key: 'project',
        label: 'Project',
        getValue: (record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      { key: 'isFinal', label: 'Final', getValue: (record) => (record.isFinal ? 'Final' : 'Draft') },
      { key: 'createdAt', label: 'Created At', getValue: (record) => formatDateTime(record.createdAt) },
    ],
    [],
  );

  const filterDefinitions = useMemo(
    () => [
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
      {
        key: 'artifactType',
        label: 'Type',
        node: (
          <Select
            allowClear
            placeholder="Type"
            options={artifactTypeOptions}
            style={{ width: 170 }}
            value={filterValues.artifactType as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, artifactType: value }))}
          />
        ),
      },
      {
        key: 'isFinal',
        label: 'Final State',
        node: (
          <Select
            allowClear
            placeholder="Final state"
            options={[
              { label: 'Final', value: 'true' },
              { label: 'Draft', value: 'false' },
            ]}
            style={{ width: 160 }}
            value={typeof filterValues.isFinal === 'boolean' ? String(filterValues.isFinal) : undefined}
            onChange={(value) =>
              setFilterValues((current) => ({
                ...current,
                isFinal: value === undefined ? undefined : value === 'true',
              }))
            }
          />
        ),
      },
    ],
    [filterValues, projectOptions],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      const result = await table.provider.getList<ArtifactRecord>({
        resource: 'artifacts',
        pagination: { current: 1, pageSize: 500 },
        filters: table.filters,
        sort: table.sorter.field
          ? {
              field: String(table.sorter.field),
              order: table.sorter.order ?? undefined,
            }
          : undefined,
      });

      const selectedColumns = exportColumns.filter((column) => visibleColumnKeys.includes(column.key));
      downloadCsv(buildCsvFileName('artifacts'), selectedColumns, result.data);
      message.success('Artifacts exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export artifacts.');
    } finally {
      setExporting(false);
    }
  }, [exportColumns, message, table.filters, table.provider, table.sorter.field, table.sorter.order, visibleColumnKeys]);

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      isFinal: false,
      uploadedBy: user?.id,
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: ArtifactRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      projectId: record.project.id,
      uploadedBy: record.uploader?.id,
    });
    setDrawerOpen(true);
  }

  function openPreview(record: ArtifactRecord) {
    setPreviewRecord(record);
    setPreviewOpen(true);
  }

  async function handleDelete(record: ArtifactRecord) {
    try {
      await table.provider.delete({ resource: 'artifacts', id: record.id });
      message.success('Artifact deleted.');
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete artifact.');
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    if (!values.contentText && !values.fileUrl) {
      message.error('Please provide either text content or a file URL.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingRecord) {
        await table.provider.update({ resource: 'artifacts', id: editingRecord.id, values });
        message.success(`Updated ${editingRecord.title}.`);
      } else {
        await table.provider.create({ resource: 'artifacts', values });
        message.success('Artifact created.');
      }

      setDrawerOpen(false);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save artifact.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Delivery Assets"
        title="Artifacts"
        description="Keep release notes, PRD snippets, QA links, and final references attached to delivery work where the team can find them."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Artifact
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
            columnDefinitions={columns.map((column) => ({
              key: String(column.key ?? ''),
              label: typeof column.title === 'string' ? column.title : String(column.key ?? ''),
              alwaysVisible: String(column.key ?? '') === 'actions',
            }))}
            visibleColumnKeys={visibleColumnKeys}
            onVisibleColumnKeysChange={setVisibleColumnKeys}
          />
        }
      >
        {table.error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load artifacts"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}
        <Table<ArtifactRecord>
          rowKey="id"
          columns={visibleColumns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: table.loading ? 'Loading artifacts...' : <Empty description="No artifacts found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? `Edit ${editingRecord.title}` : 'Create Artifact'}
        width={640}
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
          <Form.Item label="Project" name="projectId" rules={[{ required: true }]}>
            <ProjectPicker options={projectOptions} placeholder="Select project" />
          </Form.Item>
          <Form.Item label="Artifact type" name="artifactType" rules={[{ required: true }]}>
            <Select options={artifactTypeOptions} />
          </Form.Item>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Text content" name="contentText">
            <Input.TextArea rows={6} placeholder="Release notes, design summary, checklist..." />
          </Form.Item>
          <Form.Item label="File URL" name="fileUrl">
            <Input type="url" placeholder="https://..." />
          </Form.Item>
          <Form.Item label="MIME type" name="mimeType">
            <Input placeholder="application/pdf" />
          </Form.Item>
          <Form.Item label="Uploaded by" name="uploadedBy">
            <Select allowClear options={userOptions} />
          </Form.Item>
          <Form.Item label="Final artifact" name="isFinal" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={previewRecord?.title ?? 'Artifact Detail'}
        width={560}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        {previewRecord ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Tag>{previewRecord.artifactType}</Tag>
              <Tag color={previewRecord.isFinal ? 'green' : 'default'}>
                {previewRecord.isFinal ? 'Final' : 'Draft'}
              </Tag>
            </Space>
            <Text strong>Project</Text>
            <Paragraph style={{ marginBottom: 0 }}>
              {previewRecord.project.projectCode} · {previewRecord.project.name}
            </Paragraph>
            <Text strong>Text content</Text>
            <div className="artifact-preview">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {previewRecord.contentText || 'No text content provided.'}
              </Paragraph>
            </div>
            <Text strong>File URL</Text>
            <Paragraph style={{ marginBottom: 0 }}>
              {previewRecord.fileUrl ? (
                <a href={previewRecord.fileUrl} target="_blank" rel="noreferrer">
                  {previewRecord.fileUrl}
                </a>
              ) : (
                'No file URL provided.'
              )}
            </Paragraph>
          </Space>
        ) : null}
      </Drawer>
    </PermissionBoundary>
  );
}
