import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ListToolbar } from '@/components/table/ListToolbar';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useDataProvider } from '@/providers/dataProvider';
import type { DataProviderError } from '@/providers/dataProvider';
import { useCrudTable } from '@/hooks/useCrudTable';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { usePersistentState } from '@/hooks/usePersistentState';
import { buildCsvFileName, downloadCsv, type CsvColumnDefinition } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';

const { Paragraph, Text } = Typography;

interface PermissionRecord {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
}

interface RoleUser {
  id: string;
  email: string;
  displayName: string;
}

interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: PermissionRecord[];
  users: RoleUser[];
}

interface RoleFormValues {
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissionIds: string[];
}

const moduleDisplayOrder = [
  'users',
  'roles',
  'permissions',
  'requests',
  'projects',
  'allocations',
  'incidents',
  'artifacts',
  'leaves',
  'reports',
];

function sortModules(left: string, right: string) {
  const leftIndex = moduleDisplayOrder.indexOf(left);
  const rightIndex = moduleDisplayOrder.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right);
  }

  if (leftIndex === -1) {
    return 1;
  }

  if (rightIndex === -1) {
    return -1;
  }

  return leftIndex - rightIndex;
}

export default function RolesPage() {
  usePageTitle('Roles & Permissions');
  const { message } = App.useApp();
  const provider = useDataProvider();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('roles:view');
  const canCreate = hasPermission('roles:create');
  const canUpdate = hasPermission('roles:update');
  const canManagePermissions = hasPermission('roles:manage');
  const canViewPermissions = hasPermission('permissions:view');

  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<DataProviderError | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<DataProviderError | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<RoleFormValues>();
  const [exporting, setExporting] = useState(false);
  const [visibleFilterKeys, setVisibleFilterKeys] = usePersistentState<string[]>(
    'roles-visible-filters',
    ['search', 'systemState'],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = usePersistentState<string[]>(
    'roles-visible-columns',
    ['name', 'code', 'description', 'permissions', 'createdAt'],
  );

  const table = useCrudTable<RoleRecord>({
    resource: 'roles',
    initialPageSize: 10,
    initialSort: { field: 'createdAt', order: 'descend' },
  });

  useEffect(() => {
    if (!drawerOpen || !editingRoleId) {
      return;
    }

    let cancelled = false;

    const loadRole = async () => {
      setDrawerLoading(true);
      setDrawerError(null);

      try {
        const result = await provider.getOne<RoleRecord>({
          resource: 'roles',
          id: editingRoleId,
        });

        if (cancelled) {
          return;
        }

        setSelectedRole(result.data);
        form.setFieldsValue({
          code: result.data.code,
          name: result.data.name,
          description: result.data.description ?? undefined,
          isSystem: result.data.isSystem,
          permissionIds: result.data.permissions.map((permission) => permission.id),
        });
      } catch (error) {
        if (!cancelled) {
          setDrawerError(error as DataProviderError);
          setSelectedRole(null);
        }
      } finally {
        if (!cancelled) {
          setDrawerLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [drawerOpen, editingRoleId, form, provider]);

  useEffect(() => {
    if (!drawerOpen || !canViewPermissions) {
      return;
    }

    let cancelled = false;

    const loadPermissions = async () => {
      setPermissionsLoading(true);
      setPermissionsError(null);

      try {
        const result = await provider.getList<PermissionRecord>({
          resource: 'permissions',
          pagination: { current: 1, pageSize: 500 },
        });

        if (!cancelled) {
          setAvailablePermissions(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setPermissionsError(error as DataProviderError);
          setAvailablePermissions([]);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    };

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [canViewPermissions, drawerOpen, provider]);

  const permissionModules = useMemo(() => {
    const grouped = new Map<string, PermissionRecord[]>();

    for (const permission of availablePermissions) {
      const current = grouped.get(permission.module) ?? [];
      current.push(permission);
      grouped.set(permission.module, current);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => sortModules(left, right))
      .map(([module, permissions]) => ({
        module,
        permissions: [...permissions].sort((left, right) => left.action.localeCompare(right.action)),
      }));
  }, [availablePermissions]);

  const columns = useMemo<ColumnsType<RoleRecord>>(
    () => [
      {
        title: 'Role Name',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        width: 200,
        render: (_, record) => (
          <Space>
            <Text strong>{record.name}</Text>
            {record.isSystem ? <Tag color="purple">System</Tag> : null}
          </Space>
        ),
      },
      {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
        width: 160,
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        width: 300,
        render: (value) => value || <Text type="secondary">No description</Text>,
      },
      {
        title: 'Permissions',
        key: 'permissions',
        width: 140,
        align: 'right',
        render: (_, record) => record.permissions.length,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: true,
        width: 180,
        render: (value) => formatDateTime(value),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 140,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openEditDrawer(record.id)}
            >
              View
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const visibleColumns = useMemo(
    () =>
      columns.filter((column) => {
        const key = String(column.key ?? '');
        return key === 'actions' || visibleColumnKeys.includes(key);
      }),
    [columns, visibleColumnKeys],
  );

  function openCreateDrawer() {
    setEditingRoleId(null);
    setSelectedRole(null);
    setDrawerError(null);
    form.resetFields();
    form.setFieldsValue({
      isSystem: false,
      permissionIds: [],
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(roleId: string) {
    setEditingRoleId(roleId);
    setSelectedRole(null);
    setDrawerError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRoleId(null);
    setSelectedRole(null);
    setDrawerError(null);
    form.resetFields();
  }

  async function handleSubmit(values: RoleFormValues) {
    setSubmitting(true);

    try {
      const permissionIds = values.permissionIds ?? [];
      const rolePayload = {
        code: values.code,
        name: values.name,
        description: values.description,
        isSystem: values.isSystem ?? false,
      };

      if (editingRoleId) {
        const updatedRole = await provider.update<RoleRecord>({
          resource: 'roles',
          id: editingRoleId,
          values: canManagePermissions
            ? {
                ...rolePayload,
                permissionIds,
              }
            : rolePayload,
        });

        setSelectedRole(updatedRole.data);
        form.setFieldsValue({
          code: updatedRole.data.code,
          name: updatedRole.data.name,
          description: updatedRole.data.description ?? undefined,
          isSystem: updatedRole.data.isSystem,
          permissionIds: updatedRole.data.permissions.map((permission) => permission.id),
        });
        message.success(`Updated role ${updatedRole.data.name}.`);
      } else {
        const createdRole = await provider.create<RoleRecord>({
          resource: 'roles',
          values: rolePayload,
        });

        let finalRole = createdRole.data;

        if (canManagePermissions && permissionIds.length > 0) {
          const updatedRole = await provider.update<RoleRecord>({
            resource: 'roles',
            id: createdRole.data.id,
            values: {
              permissionIds,
            },
          });
          finalRole = updatedRole.data;
        }

        setEditingRoleId(finalRole.id);
        setSelectedRole(finalRole);
        form.setFieldsValue({
          code: finalRole.code,
          name: finalRole.name,
          description: finalRole.description ?? undefined,
          isSystem: finalRole.isSystem,
          permissionIds: finalRole.permissions.map((permission) => permission.id),
        });
        message.success(`Created role ${finalRole.name}.`);
      }

      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to save role.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRows = useMemo(() => {
    const search = String(filterValues.search ?? '').trim().toLowerCase();
    const systemState = filterValues.systemState;

    return table.rows.filter((role) => {
      const matchesSearch =
        !search ||
        role.name.toLowerCase().includes(search) ||
        role.code.toLowerCase().includes(search) ||
        (role.description ?? '').toLowerCase().includes(search);

      const matchesSystemState =
        systemState === undefined ||
        (systemState === 'system' && role.isSystem) ||
        (systemState === 'custom' && !role.isSystem);

      return matchesSearch && matchesSystemState;
    });
  }, [filterValues.search, filterValues.systemState, table.rows]);

  const filterDefinitions = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        node: (
          <Input
            allowClear
            placeholder="Search role name, code, description"
            style={{ width: 280 }}
            value={(filterValues.search as string | undefined) ?? ''}
            onChange={(event) =>
              setFilterValues((current) => ({
                ...current,
                search: event.target.value || undefined,
              }))
            }
          />
        ),
      },
      {
        key: 'systemState',
        label: 'Role Type',
        node: (
          <Select
            allowClear
            placeholder="Role type"
            style={{ width: 160 }}
            value={filterValues.systemState as string | undefined}
            options={[
              { label: 'System role', value: 'system' },
              { label: 'Custom role', value: 'custom' },
            ]}
            onChange={(value) =>
              setFilterValues((current) => ({
                ...current,
                systemState: value,
              }))
            }
          />
        ),
      },
    ],
    [filterValues.search, filterValues.systemState],
  );

  const exportColumns = useMemo<CsvColumnDefinition<RoleRecord>[]>(
    () => [
      { key: 'name', label: 'Role Name', getValue: (record) => record.name },
      { key: 'code', label: 'Code', getValue: (record) => record.code },
      { key: 'description', label: 'Description', getValue: (record) => record.description ?? '' },
      { key: 'permissions', label: 'Permissions', getValue: (record) => record.permissions.length },
      { key: 'createdAt', label: 'Created At', getValue: (record) => formatDateTime(record.createdAt) },
    ],
    [],
  );

  async function handleExport() {
    setExporting(true);

    try {
      const selectedColumns = exportColumns.filter((column) => visibleColumnKeys.includes(column.key));
      downloadCsv(buildCsvFileName('roles'), selectedColumns, filteredRows);
      message.success('Roles exported.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export roles.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="RBAC Configuration"
        title="Roles & Permissions"
        description="Manage access roles, review what each role can use, and update permission coverage where the backend currently supports it."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                New Role
              </Button>
            ) : null}
          </Space>
        }
        filters={
          <ListToolbar
            filterDefinitions={filterDefinitions}
            visibleFilterKeys={visibleFilterKeys}
            onVisibleFilterKeysChange={setVisibleFilterKeys}
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
            message="Unable to load roles"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <Table<RoleRecord>
          rowKey="id"
          columns={visibleColumns}
          dataSource={filteredRows}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1160 }}
          locale={{
            emptyText: table.loading ? 'Loading roles...' : <Empty description="No roles found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={editingRoleId ? 'Role Detail' : 'Create Role'}
        width={760}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        extra={
          canCreate || canUpdate || canManagePermissions ? (
            <Space>
              <Button onClick={closeDrawer}>Close</Button>
              {(editingRoleId ? canUpdate || canManagePermissions : canCreate) ? (
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={() => void form.submit()}
                >
                  Save
                </Button>
              ) : null}
            </Space>
          ) : undefined
        }
      >
        {drawerLoading ? (
          <Spin />
        ) : drawerError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load role detail"
            description={drawerError.message}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {selectedRole ? (
              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  { key: 'name', label: 'Role name', children: selectedRole.name },
                  { key: 'code', label: 'Role code', children: selectedRole.code },
                  {
                    key: 'description',
                    label: 'Description',
                    children: selectedRole.description ?? 'No description',
                  },
                  {
                    key: 'type',
                    label: 'Role type',
                    children: selectedRole.isSystem ? (
                      <Tag color="purple">System role</Tag>
                    ) : (
                      <Tag>Custom role</Tag>
                    ),
                  },
                  {
                    key: 'created',
                    label: 'Created at',
                    children: formatDateTime(selectedRole.createdAt),
                  },
                  {
                    key: 'users',
                    label: 'Assigned users',
                    children:
                      selectedRole.users.length > 0 ? (
                        <Space wrap size={[6, 6]}>
                          {selectedRole.users.map((roleUser) => (
                            <Tag key={roleUser.id}>{roleUser.displayName}</Tag>
                          ))}
                        </Space>
                      ) : (
                        'No assigned users'
                      ),
                  },
                ]}
              />
            ) : null}

            <Form<RoleFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => void handleSubmit(values)}
            >
              <Form.Item
                label="Role code"
                name="code"
                rules={[{ required: true, message: 'Please enter role code.' }]}
              >
                <Input
                  placeholder="support_lead"
                  disabled={Boolean(editingRoleId && !canUpdate)}
                />
              </Form.Item>

              <Form.Item
                label="Role name"
                name="name"
                rules={[{ required: true, message: 'Please enter role name.' }]}
              >
                <Input
                  placeholder="Support Lead"
                  disabled={Boolean(editingRoleId && !canUpdate)}
                />
              </Form.Item>

              <Form.Item label="Description" name="description">
                <Input.TextArea
                  rows={3}
                  placeholder="What this role is for"
                  disabled={Boolean(editingRoleId && !canUpdate)}
                />
              </Form.Item>

              <Form.Item
                label="Role type"
                name="isSystem"
                rules={[{ required: true, message: 'Please choose role type.' }]}
              >
                <Select
                  disabled={Boolean(editingRoleId && !canUpdate)}
                  options={[
                    { label: 'Custom role', value: false },
                    { label: 'System role', value: true },
                  ]}
                />
              </Form.Item>

              <div>
                <Space align="center" style={{ marginBottom: 12 }}>
                  <SafetyCertificateOutlined />
                  <Text strong>Assigned permissions</Text>
                </Space>

                {!canViewPermissions ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Permission catalog is not available"
                    description="This frontend can only show and edit permission assignments when your account has `permissions:view`."
                  />
                ) : permissionsError ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Unable to load available permissions"
                    description={permissionsError.message}
                  />
                ) : permissionsLoading ? (
                  <Spin />
                ) : (
                  <>
                    <Paragraph type="secondary" style={{ marginTop: 0 }}>
                      Permissions are grouped by module so it is easier to understand what this
                      role can access.
                    </Paragraph>

                    <Form.Item name="permissionIds" initialValue={[]}>
                      <Checkbox.Group style={{ width: '100%' }}>
                        <Collapse
                          items={permissionModules.map((entry) => ({
                            key: entry.module,
                            label: `${entry.module} (${entry.permissions.length})`,
                            children: (
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                {entry.permissions.map((permission) => (
                                  <Checkbox
                                    key={permission.id}
                                    value={permission.id}
                                    disabled={editingRoleId ? !canManagePermissions : !canManagePermissions}
                                  >
                                    <Space size="small" wrap>
                                      <Text strong>{permission.action}</Text>
                                      <Text type="secondary">{permission.code}</Text>
                                    </Space>
                                    {permission.description ? (
                                      <div>
                                        <Text type="secondary">{permission.description}</Text>
                                      </div>
                                    ) : null}
                                  </Checkbox>
                                ))}
                              </Space>
                            ),
                          }))}
                        />
                      </Checkbox.Group>
                    </Form.Item>
                  </>
                )}
              </div>
            </Form>

            {selectedRole ? (
              <div>
                <Text strong>Current access summary</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedRole.permissions.length > 0 ? (
                    <Space wrap size={[6, 6]}>
                      {selectedRole.permissions.map((permission) => (
                        <Tag key={permission.id} color="blue">
                          {permission.code}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">This role currently has no permissions.</Text>
                  )}
                </div>
              </div>
            ) : null}

            {!editingRoleId ? (
              <Alert
                type="info"
                showIcon
                message="Role deletion"
                description="The current backend API does not expose delete-role yet, so this page focuses on create, edit, and permission assignment."
              />
            ) : null}
          </Space>
        )}
      </Drawer>
    </PermissionBoundary>
  );
}
