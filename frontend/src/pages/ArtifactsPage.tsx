import { useMemo, useState } from 'react';
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
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
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
  const [form] = Form.useForm();

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
          <Space wrap>
            <Select
              allowClear
              placeholder="Project"
              options={projectOptions}
              style={{ width: 220 }}
              value={filterValues.projectId as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, projectId: value }))}
            />
            <Select
              allowClear
              placeholder="Type"
              options={artifactTypeOptions}
              style={{ width: 170 }}
              value={filterValues.artifactType as string | undefined}
              onChange={(value) => setFilterValues((current) => ({ ...current, artifactType: value }))}
            />
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
          columns={columns}
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
            <Select options={projectOptions} />
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
