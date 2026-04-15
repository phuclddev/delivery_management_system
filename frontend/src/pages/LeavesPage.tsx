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
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ListToolbar } from '@/components/table/ListToolbar';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { buildCsvFileName, downloadCsv, type CsvColumnDefinition } from '@/utils/csv';
import { formatDate, toDateInputValue, toIsoString } from '@/utils/format';
import { leaveTypeOptions } from '@/utils/options';

interface LeaveRecord {
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
  leaveType: string;
  startDate: string;
  endDate: string;
  note?: string | null;
}

export default function LeavesPage() {
  usePageTitle('Leaves');
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('leaves:view');
  const canCreate = hasPermission('leaves:create');
  const canUpdate = hasPermission('leaves:update');
  const canDelete = hasPermission('leaves:delete');
  const { userOptions } = useReferenceData(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'leaves-visible-filters',
    ['memberId', 'leaveType'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'leaves-visible-columns',
    ['member', 'leaveType', 'startDate', 'endDate', 'note'],
  );

  const table = useCrudTable<LeaveRecord>({
    resource: 'leaves',
    initialPageSize: 10,
    initialSort: { field: 'startDate', order: 'descend' },
  });

  const columns = useMemo<ColumnsType<LeaveRecord>>(
    () => [
      { title: 'Member', key: 'member', width: 200, render: (_, record) => record.member.displayName },
      { title: 'Leave Type', dataIndex: 'leaveType', key: 'leaveType', width: 160 },
      { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 140, render: (value) => formatDate(value) },
      { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 140, render: (value) => formatDate(value) },
      { title: 'Note', dataIndex: 'note', key: 'note', render: (value) => value || '-' },
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
                title="Delete leave record?"
                description={`This will remove ${record.member.displayName}'s leave.`}
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

  const exportColumns = useMemo<CsvColumnDefinition<LeaveRecord>[]>(
    () => [
      { key: 'member', label: 'Member', getValue: (record) => record.member.displayName },
      { key: 'leaveType', label: 'Leave Type', getValue: (record) => record.leaveType },
      { key: 'startDate', label: 'Start Date', getValue: (record) => formatDate(record.startDate) },
      { key: 'endDate', label: 'End Date', getValue: (record) => formatDate(record.endDate) },
      { key: 'note', label: 'Note', getValue: (record) => record.note ?? '' },
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
            style={{ width: 220 }}
            value={filterValues.memberId as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, memberId: value }))}
          />
        ),
      },
      {
        key: 'leaveType',
        label: 'Leave Type',
        node: (
          <Select
            allowClear
            placeholder="Leave type"
            options={leaveTypeOptions}
            style={{ width: 180 }}
            value={filterValues.leaveType as string | undefined}
            onChange={(value) => setFilterValues((current) => ({ ...current, leaveType: value }))}
          />
        ),
      },
      {
        key: 'leaveFrom',
        label: 'Leave From',
        node: (
          <Input
            type="date"
            style={{ width: 150 }}
            value={((filterValues.leaveRange as { from?: string } | undefined)?.from ?? '') as string}
            onChange={(event) =>
              setFilterValues((current) => ({
                ...current,
                leaveRange: {
                  ...(current.leaveRange as Record<string, unknown> | undefined),
                  from: event.target.value || undefined,
                },
              }))
            }
          />
        ),
      },
      {
        key: 'leaveTo',
        label: 'Leave To',
        node: (
          <Input
            type="date"
            style={{ width: 150 }}
            value={((filterValues.leaveRange as { to?: string } | undefined)?.to ?? '') as string}
            onChange={(event) =>
              setFilterValues((current) => ({
                ...current,
                leaveRange: {
                  ...(current.leaveRange as Record<string, unknown> | undefined),
                  to: event.target.value || undefined,
                },
              }))
            }
          />
        ),
      },
    ],
    [filterValues, userOptions],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      const result = await table.provider.getList<LeaveRecord>({
        resource: 'leaves',
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
      downloadCsv(buildCsvFileName('leaves'), selectedColumns, result.data);
      message.success('Leaves exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export leaves.');
    } finally {
      setExporting(false);
    }
  }, [exportColumns, message, table.filters, table.provider, table.sorter.field, table.sorter.order, visibleColumnKeys]);

  function openCreateDrawer() {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      memberId: user?.id,
      leaveType: 'annual_leave',
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(record: LeaveRecord) {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      memberId: record.member.id,
      startDate: toDateInputValue(record.startDate),
      endDate: toDateInputValue(record.endDate),
    });
    setDrawerOpen(true);
  }

  async function handleDelete(record: LeaveRecord) {
    try {
      await table.provider.delete({ resource: 'leaves', id: record.id });
      message.success('Leave deleted.');
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to delete leave.');
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
        await table.provider.update({ resource: 'leaves', id: editingRecord.id, values: payload });
        message.success('Leave updated.');
      } else {
        await table.provider.create({ resource: 'leaves', values: payload });
        message.success('Leave created.');
      }

      setDrawerOpen(false);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save leave.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="People Availability"
        title="Leaves"
        description="Keep availability visible for planning and quickly record upcoming absences with just the fields PMs actually need."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Leave
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
            message="Unable to load leaves"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}
        <Table<LeaveRecord>
          rowKey="id"
          columns={visibleColumns}
          dataSource={table.rows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: table.loading ? 'Loading leaves...' : <Empty description="No leave records found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRecord ? 'Edit Leave' : 'Create Leave'}
        width={520}
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
          <Form.Item label="Leave type" name="leaveType" rules={[{ required: true }]}>
            <Select options={leaveTypeOptions} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Start date" name="startDate" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="End date" name="endDate" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Input type="date" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Note" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </PermissionBoundary>
  );
}
