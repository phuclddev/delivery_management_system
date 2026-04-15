import { useCallback, useMemo, useState } from 'react';
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
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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
import { formatDate, toDateInputValue, toIsoString } from '@/utils/format';
import { allocationRoleOptions } from '@/utils/options';

interface AllocationRecord {
  id: string;
  member: {
    id: string;
    email: string;
    displayName: string;
    team?: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  project: {
    id: string;
    projectCode: string;
    name: string;
    status: string;
  };
  roleType: string;
  allocationPct: number;
  plannedMd?: number | null;
  actualMd?: number | null;
  startDate: string;
  endDate: string;
  priorityWeight?: number | null;
  isPrimary: boolean;
  note?: string | null;
}

export default function AllocationsPage() {
  usePageTitle('Allocations');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('allocations:view');
  const canCreate = hasPermission('allocations:create');
  const canUpdate = hasPermission('allocations:update');
  const canDelete = hasPermission('allocations:delete');
  const { userOptions, projectOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AllocationRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'allocations-visible-filters',
    ['memberId', 'projectId', 'roleType'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'allocations-visible-columns',
    ['member', 'project', 'roleType', 'startDate', 'endDate', 'allocationPct', 'plannedMd', 'actualMd'],
  );

  const table = useCrudTable<AllocationRecord>({
    resource: 'allocations',
    initialPageSize: 10,
    initialSort: { field: 'startDate', order: 'ascend' },
  });

  const columns = useMemo<ColumnsType<AllocationRecord>>(
    () => [
      {
        title: 'Member',
        key: 'member',
        width: 190,
        render: (_, record) => record.member.displayName,
      },
      {
        title: 'Project',
        key: 'project',
        width: 240,
        render: (_, record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      {
        title: 'Role',
        dataIndex: 'roleType',
        key: 'roleType',
        width: 130,
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: 'Start',
        dataIndex: 'startDate',
        key: 'startDate',
        width: 130,
        render: (value) => formatDate(value),
      },
      {
        title: 'End',
        dataIndex: 'endDate',
        key: 'endDate',
        width: 130,
        render: (value) => formatDate(value),
      },
      {
        title: 'Allocation %',
        dataIndex: 'allocationPct',
        key: 'allocationPct',
        width: 130,
        align: 'right',
        render: (value) => `${value}%`,
      },
      {
        title: 'Planned MD',
        dataIndex: 'plannedMd',
        key: 'plannedMd',
        width: 120,
        align: 'right',
        render: (value) => value ?? '-',
      },
      {
        title: 'Actual MD',
        dataIndex: 'actualMd',
        key: 'actualMd',
        width: 120,
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
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete allocation?"
                description={`This will remove ${record.member.displayName}'s allocation.`}
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

  const exportColumns = useMemo<CsvColumnDefinition<AllocationRecord>[]>(
    () => [
      { key: 'member', label: 'Member', getValue: (record) => record.member.displayName },
      {
        key: 'project',
        label: 'Project',
        getValue: (record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      { key: 'roleType', label: 'Role', getValue: (record) => record.roleType },
      { key: 'startDate', label: 'Start', getValue: (record) => formatDate(record.startDate) },
      { key: 'endDate', label: 'End', getValue: (record) => formatDate(record.endDate) },
      { key: 'allocationPct', label: 'Allocation %', getValue: (record) => record.allocationPct },
      { key: 'plannedMd', label: 'Planned MD', getValue: (record) => record.plannedMd ?? '' },
      { key: 'actualMd', label: 'Actual MD', getValue: (record) => record.actualMd ?? '' },
    ],
    [],
  );

  const filterDefinitions = useMemo(
    () => [
      {
        key: 'memberId',
        label: 'Member',
        node: (
          <Select
            allowClear
            placeholder="Member"
            options={userOptions}
            style={{ width: 200 }}
            value={filterValues.memberId as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, memberId: value }))}
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
      {
        key: 'roleType',
        label: 'Role',
        node: (
          <Select
            allowClear
            placeholder="Role"
            options={allocationRoleOptions}
            style={{ width: 160 }}
            value={filterValues.roleType as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, roleType: value }))}
          />
        ),
      },
      {
        key: 'startDate',
        label: 'Start Date',
        node: (
          <Input
            type="date"
            style={{ width: 150 }}
            value={(filterValues.startDate as string | undefined) ?? ''}
            onChange={(event) =>
              setFilterValues((current) => ({ ...current, startDate: event.target.value || undefined }))
            }
          />
        ),
      },
      {
        key: 'endDate',
        label: 'End Date',
        node: (
          <Input
            type="date"
            style={{ width: 150 }}
            value={(filterValues.endDate as string | undefined) ?? ''}
            onChange={(event) =>
              setFilterValues((current) => ({ ...current, endDate: event.target.value || undefined }))
            }
          />
        ),
      },
    ],
    [filterValues, projectOptions, userOptions],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      const result = await table.provider.getList<AllocationRecord>({
        resource: 'allocations',
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
      downloadCsv(buildCsvFileName('allocations'), selectedColumns, result.data);
      message.success('Allocations exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export allocations.');
    } finally {
      setExporting(false);
    }
  }, [exportColumns, message, table.filters, table.provider, table.sorter.field, table.sorter.order, visibleColumnKeys]);

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      allocationPct: 100,
      isPrimary: false,
      roleType: 'pm',
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: AllocationRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      memberId: record.member.id,
      projectId: record.project.id,
      startDate: toDateInputValue(record.startDate),
      endDate: toDateInputValue(record.endDate),
    });
    setDrawerOpen(true);
  }

  async function handleDelete(record: AllocationRecord) {
    try {
      await table.provider.delete({ resource: 'allocations', id: record.id });
      message.success('Allocation deleted.');
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete allocation.');
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        startDate: toIsoString(values.startDate as string | undefined),
        endDate: toIsoString(values.endDate as string | undefined),
      };

      if (editingRecord) {
        await table.provider.update({ resource: 'allocations', id: editingRecord.id, values: payload });
        message.success('Allocation updated.');
      } else {
        await table.provider.create({ resource: 'allocations', values: payload });
        message.success('Allocation created.');
      }

      setDrawerOpen(false);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save allocation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Workload Tracking"
        title="Allocations"
        description="Keep member workload clear, adjust ownership quickly, and spot over-allocation early."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Allocation
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
            message="Unable to load allocations"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <Table<AllocationRecord>
          rowKey="id"
          columns={visibleColumns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1350 }}
          locale={{
            emptyText: table.loading ? 'Loading allocations...' : <Empty description="No allocations found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? 'Edit Allocation' : 'Create Allocation'}
        width={560}
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
          <Form.Item label="Member" name="memberId" rules={[{ required: true }]}>
            <Select options={userOptions} />
          </Form.Item>
          <Form.Item label="Project" name="projectId" rules={[{ required: true }]}>
            <ProjectPicker options={projectOptions} placeholder="Select project" />
          </Form.Item>
          <Form.Item label="Role" name="roleType" rules={[{ required: true }]}>
            <Select options={allocationRoleOptions} />
          </Form.Item>
          <Form.Item
            label="Allocation percentage"
            name="allocationPct"
            rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}
          >
            <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Start date" name="startDate" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="End date" name="endDate" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Input type="date" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Planned MD" name="plannedMd" style={{ width: '33%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Actual MD" name="actualMd" style={{ width: '33%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Priority weight" name="priorityWeight" style={{ width: '34%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Primary allocation" name="isPrimary" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <Input.TextArea rows={3} placeholder="Useful context for PM adjustments" />
          </Form.Item>
        </Form>
      </Drawer>
    </PermissionBoundary>
  );
}
