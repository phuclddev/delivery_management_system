import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
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
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PermissionBoundary } from '@/components/PermissionBoundary';
import { ResourcePageLayout } from '@/components/ResourcePageLayout';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePermissions } from '@/hooks/usePermissions';
import { useCrudTable } from '@/hooks/useCrudTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useDataProvider } from '@/providers/dataProvider';
import type { DataProviderError } from '@/providers/dataProvider';
import { formatDateTime } from '@/utils/format';

const { Paragraph, Text } = Typography;

interface UserRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    code: string;
    name: string;
  } | null;
  roles: UserRole[];
}

interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export default function UsersPage() {
  usePageTitle('Users');
  const { message } = App.useApp();
  const { user } = useAuth();
  const provider = useDataProvider();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('users:view');
  const canManageRoles = hasPermission('users:manage');
  const canViewRoles = hasPermission('roles:view');
  const { teamOptions } = useReferenceData(user);

  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<DataProviderError | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleRecord[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<DataProviderError | null>(null);
  const [submittingRoles, setSubmittingRoles] = useState(false);
  const [roleForm] = Form.useForm<{ roleIds: string[] }>();

  const table = useCrudTable<UserRecord>({
    resource: 'users',
    initialPageSize: 10,
    initialSort: { field: 'createdAt', order: 'descend' },
  });

  useEffect(() => {
    if (!drawerOpen || !selectedUserId) {
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      setDrawerLoading(true);
      setDrawerError(null);

      try {
        const result = await provider.getOne<UserRecord>({
          resource: 'users',
          id: selectedUserId,
        });

        if (cancelled) {
          return;
        }

        setSelectedUser(result.data);
        roleForm.setFieldsValue({
          roleIds: result.data.roles.map((role) => role.id),
        });
      } catch (error) {
        if (!cancelled) {
          setDrawerError(error as DataProviderError);
          setSelectedUser(null);
        }
      } finally {
        if (!cancelled) {
          setDrawerLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [drawerOpen, provider, roleForm, selectedUserId]);

  useEffect(() => {
    if (!drawerOpen || !canManageRoles || !canViewRoles) {
      return;
    }

    let cancelled = false;

    const loadRoles = async () => {
      setRolesLoading(true);
      setRolesError(null);

      try {
        const result = await provider.getList<RoleRecord>({
          resource: 'roles',
          pagination: { current: 1, pageSize: 200 },
        });

        if (!cancelled) {
          setAvailableRoles(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setRolesError(error as DataProviderError);
          setAvailableRoles([]);
        }
      } finally {
        if (!cancelled) {
          setRolesLoading(false);
        }
      }
    };

    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, [canManageRoles, canViewRoles, drawerOpen, provider]);

  const columns = useMemo<ColumnsType<UserRecord>>(
    () => [
      {
        title: 'Name',
        dataIndex: 'displayName',
        key: 'displayName',
        sorter: true,
        width: 180,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        sorter: true,
        width: 240,
      },
      {
        title: 'Role(s)',
        key: 'roles',
        width: 240,
        render: (_, record) =>
          record.roles.length > 0 ? (
            <Space wrap size={[4, 4]}>
              {record.roles.map((role) => (
                <Tag key={role.id} color={role.code === 'super_admin' ? 'red' : 'blue'}>
                  {role.name}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">No roles</Text>
          ),
      },
      {
        title: 'Team',
        key: 'team',
        width: 160,
        render: (_, record) => record.team?.name ?? <Text type="secondary">Unassigned</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value) => (
          <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value}</Tag>
        ),
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
        width: 120,
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetailDrawer(record.id)}
            >
              View
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const roleOptions = useMemo(
    () =>
      availableRoles.map((role) => ({
        value: role.id,
        label: role.name,
      })),
    [availableRoles],
  );

  function openDetailDrawer(userId: string) {
    setSelectedUserId(userId);
    setSelectedUser(null);
    setDrawerError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedUserId(null);
    setSelectedUser(null);
    setDrawerError(null);
    roleForm.resetFields();
  }

  async function handleRoleSubmit(values: { roleIds: string[] }) {
    if (!selectedUser) {
      return;
    }

    setSubmittingRoles(true);

    try {
      const result = await provider.update<UserRecord>({
        resource: 'users',
        id: selectedUser.id,
        values: {
          roleIds: values.roleIds,
        },
      });

      setSelectedUser(result.data);
      roleForm.setFieldsValue({
        roleIds: result.data.roles.map((role) => role.id),
      });
      message.success(`Updated roles for ${result.data.displayName}.`);
      await table.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to update user roles.');
    } finally {
      setSubmittingRoles(false);
    }
  }

  return (
    <PermissionBoundary allowed={canView}>
      <ResourcePageLayout
        eyebrow="Access & Ownership"
        title="Users"
        description="Review internal users, inspect their team and role assignments, and update RBAC ownership where the backend currently supports it."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void table.refresh()}>
            Refresh
          </Button>
        }
        filters={
          <Space wrap>
            <Input
              allowClear
              placeholder="Search name or email"
              style={{ width: 240 }}
              value={(filterValues.search as string | undefined) ?? ''}
              onChange={(event) =>
                setFilterValues((current) => ({
                  ...current,
                  search: event.target.value || undefined,
                }))
              }
            />
            <Select
              allowClear
              placeholder="Role"
              style={{ width: 180 }}
              value={filterValues.roleId as string | undefined}
              options={
                table.rows
                  .flatMap((entry) => entry.roles)
                  .filter(
                    (role, index, roles) =>
                      roles.findIndex((candidate) => candidate.id === role.id) === index,
                  )
                  .map((role) => ({
                    label: role.name,
                    value: role.id,
                  }))
              }
              onChange={(value) =>
                setFilterValues((current) => ({
                  ...current,
                  roleId: value,
                }))
              }
            />
            <Select
              allowClear
              placeholder="Team"
              style={{ width: 180 }}
              value={filterValues.teamId as string | undefined}
              options={teamOptions}
              onChange={(value) =>
                setFilterValues((current) => ({
                  ...current,
                  teamId: value,
                }))
              }
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 140 }}
              value={filterValues.status as string | undefined}
              options={[
                { label: 'ACTIVE', value: 'ACTIVE' },
                { label: 'INACTIVE', value: 'INACTIVE' },
              ]}
              onChange={(value) =>
                setFilterValues((current) => ({
                  ...current,
                  status: value,
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
            message="Unable to load users"
            description={table.error.message}
            action={
              <Button size="small" onClick={() => void table.refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <Table<UserRecord>
          rowKey="id"
          columns={columns}
          dataSource={table.rows.filter((entry) => {
            const search = String(filterValues.search ?? '').trim().toLowerCase();
            const status = filterValues.status;

            const matchesSearch =
              !search ||
              entry.displayName.toLowerCase().includes(search) ||
              entry.email.toLowerCase().includes(search);

            const matchesStatus = !status || entry.status === status;

            return matchesSearch && matchesStatus;
          })}
          loading={table.loading}
          onChange={table.handleTableChange}
          pagination={table.pagination}
          scroll={{ x: 1240 }}
          locale={{
            emptyText: table.loading ? 'Loading users...' : <Empty description="No users found" />,
          }}
        />
      </ResourcePageLayout>

      <Drawer
        title={selectedUser ? `User: ${selectedUser.displayName}` : 'User Detail'}
        width={640}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {drawerLoading ? (
          <Spin />
        ) : drawerError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load user detail"
            description={drawerError.message}
          />
        ) : selectedUser ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'name', label: 'Name', children: selectedUser.displayName },
                { key: 'email', label: 'Email', children: selectedUser.email },
                {
                  key: 'team',
                  label: 'Team',
                  children: selectedUser.team?.name ?? 'Unassigned',
                },
                {
                  key: 'status',
                  label: 'Status',
                  children: (
                    <Tag color={selectedUser.status === 'ACTIVE' ? 'green' : 'default'}>
                      {selectedUser.status}
                    </Tag>
                  ),
                },
                {
                  key: 'created',
                  label: 'Created At',
                  children: formatDateTime(selectedUser.createdAt),
                },
                {
                  key: 'lastLogin',
                  label: 'Last Login',
                  children: formatDateTime(selectedUser.lastLoginAt),
                },
              ]}
            />

            <div>
              <Text strong>Assigned roles</Text>
              <div style={{ marginTop: 8 }}>
                {selectedUser.roles.length > 0 ? (
                  <Space wrap size={[6, 6]}>
                    {selectedUser.roles.map((role) => (
                      <Tag
                        key={role.id}
                        color={role.code === 'super_admin' ? 'red' : 'blue'}
                      >
                        {role.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">This user currently has no assigned roles.</Text>
                )}
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              message="Basic profile editing"
              description="The current backend Users API supports viewing users and replacing their assigned role set. Editing name, email, team, or status is not exposed yet, so this page keeps those fields read-only."
            />

            {canManageRoles ? (
              <div>
                <Space align="center" style={{ marginBottom: 12 }}>
                  <SafetyCertificateOutlined />
                  <Text strong>Assign roles to user</Text>
                </Space>

                {rolesError ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Unable to load available roles"
                    description={rolesError.message}
                    style={{ marginBottom: 16 }}
                  />
                ) : null}

                {!canViewRoles ? (
                  <Paragraph type="secondary">
                    Your account can manage users, but this frontend cannot load the role catalog
                    because `roles:view` is not currently available.
                  </Paragraph>
                ) : (
                  <Form
                    form={roleForm}
                    layout="vertical"
                    onFinish={(values) => void handleRoleSubmit(values)}
                  >
                    <Form.Item
                      label="Roles"
                      name="roleIds"
                      rules={[{ required: true, message: 'Please select at least one role.' }]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select one or more roles"
                        options={roleOptions}
                        loading={rolesLoading}
                      />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        loading={submittingRoles}
                        onClick={() => void roleForm.submit()}
                      >
                        Save Roles
                      </Button>
                      <Button
                        onClick={() =>
                          roleForm.setFieldsValue({
                            roleIds: selectedUser.roles.map((role) => role.id),
                          })
                        }
                      >
                        Reset
                      </Button>
                    </Space>
                  </Form>
                )}
              </div>
            ) : null}
          </Space>
        ) : (
          <Empty description="No user selected" />
        )}
      </Drawer>
    </PermissionBoundary>
  );
}
