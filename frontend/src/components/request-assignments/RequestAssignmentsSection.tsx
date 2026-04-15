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
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  createRequestAssignmentBeProfile,
  createRequestAssignmentFeProfile,
  createRequestAssignmentSystemProfile,
  getRequestAssignment,
  updateRequestAssignmentBeProfile,
  updateRequestAssignmentFeProfile,
  updateRequestAssignmentSystemProfile,
} from '@/api/request-assignments';
import { ProjectPicker } from '@/components/ProjectPicker';
import { useDataProvider } from '@/providers/dataProvider';
import type { DataProviderError } from '@/providers/dataProvider';
import type {
  RequestAssignmentBeProfile,
  RequestAssignmentFeProfile,
  RequestAssignmentRecord,
  RequestAssignmentSystemProfile,
} from '@/types/domain';
import { formatDate, formatDateTime, toDateInputValue, toIsoString } from '@/utils/format';
import {
  allocationRoleOptions,
  requestAssignmentStatusOptions,
  requestAssignmentWorkTypeOptions,
} from '@/utils/options';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type SelectOption = {
  label: string;
  value: string;
};

interface RequestAssignmentsSectionProps {
  title: string;
  description?: string;
  requestId?: string;
  projectId?: string;
  memberId?: string;
  requestOptions: SelectOption[];
  projectOptions: SelectOption[];
  userOptions: SelectOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  emptyDescription: string;
}

interface AssignmentFormValues {
  requestId?: string;
  projectId?: string;
  memberId?: string;
  roleType: string;
  workType?: string;
  uncertaintyLevel?: number;
  plannedMd?: number;
  actualMd?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  note?: string;
}

type FeProfileFormValues = Omit<RequestAssignmentFeProfile, 'assignmentId' | 'createdAt' | 'updatedAt'>;
type BeProfileFormValues = Omit<RequestAssignmentBeProfile, 'assignmentId' | 'createdAt' | 'updatedAt'>;
type SystemProfileFormValues = Omit<RequestAssignmentSystemProfile, 'assignmentId' | 'createdAt' | 'updatedAt'>;

function isFrontendRole(roleType?: string | null) {
  const normalized = (roleType ?? '').toLowerCase();
  return normalized.includes('frontend') || normalized.includes('fe');
}

function isBackendRole(roleType?: string | null) {
  const normalized = (roleType ?? '').toLowerCase();
  return normalized.includes('backend') || normalized.includes('be');
}

function resolveWorkType(workType?: string | null, roleType?: string | null) {
  const normalizedWorkType = (workType ?? '').toLowerCase();

  if (normalizedWorkType === 'frontend' || normalizedWorkType === 'backend' || normalizedWorkType === 'system') {
    return normalizedWorkType;
  }

  if (isFrontendRole(roleType)) {
    return 'frontend';
  }

  if (isBackendRole(roleType)) {
    return 'backend';
  }

  return undefined;
}

function toProfileSummary(profile: Record<string, unknown> | null | undefined) {
  if (!profile) {
    return null;
  }

  return Object.entries(profile)
    .filter(([key, value]) => !['assignmentId', 'createdAt', 'updatedAt', 'note'].includes(key) && value !== null && value !== undefined && value !== '')
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

function toFeProfilePayload(values: FeProfileFormValues) {
  return {
    screensViews: values.screensViews ?? undefined,
    layoutComplexity: values.layoutComplexity ?? undefined,
    componentReuse: values.componentReuse ?? undefined,
    responsive: values.responsive ?? undefined,
    animationLevel: values.animationLevel ?? undefined,
    userActions: values.userActions ?? undefined,
    userActionsList: values.userActionsList ?? undefined,
    apiComplexity: values.apiComplexity ?? undefined,
    clientSideLogic: values.clientSideLogic ?? undefined,
    heavyAssets: values.heavyAssets ?? undefined,
    uiClarity: values.uiClarity ?? undefined,
    specChangeRisk: values.specChangeRisk ?? undefined,
    deviceSupport: values.deviceSupport ?? undefined,
    timelinePressure: values.timelinePressure ?? undefined,
    note: values.note ?? undefined,
  };
}

function toBeProfilePayload(values: BeProfileFormValues) {
  return {
    userActions: values.userActions ?? undefined,
    businessLogicComplexity: values.businessLogicComplexity ?? undefined,
    dbTables: values.dbTables ?? undefined,
    apis: values.apis ?? undefined,
    requirementClarity: values.requirementClarity ?? undefined,
    changeFrequency: values.changeFrequency ?? undefined,
    realtime: values.realtime ?? undefined,
    timelinePressure: values.timelinePressure ?? undefined,
    note: values.note ?? undefined,
  };
}

function toSystemProfilePayload(values: SystemProfileFormValues) {
  return {
    domainComplexity: values.domainComplexity ?? undefined,
    integrationCount: values.integrationCount ?? undefined,
    dependencyLevel: values.dependencyLevel ?? undefined,
    requirementClarity: values.requirementClarity ?? undefined,
    unknownFactor: values.unknownFactor ?? undefined,
    dataVolume: values.dataVolume ?? undefined,
    scalabilityRequirement: values.scalabilityRequirement ?? undefined,
    securityRequirement: values.securityRequirement ?? undefined,
    externalApiComplexity: values.externalApiComplexity ?? undefined,
    changeFrequency: values.changeFrequency ?? undefined,
    testingComplexity: values.testingComplexity ?? undefined,
    timelinePressure: values.timelinePressure ?? undefined,
    note: values.note ?? undefined,
  };
}

export function RequestAssignmentsSection({
  title,
  description,
  requestId,
  projectId,
  memberId,
  requestOptions,
  projectOptions,
  userOptions,
  canCreate,
  canUpdate,
  canDelete,
  emptyDescription,
}: RequestAssignmentsSectionProps) {
  const provider = useDataProvider();
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<RequestAssignmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DataProviderError | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RequestAssignmentRecord | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<RequestAssignmentRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DataProviderError | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [submittingFeProfile, setSubmittingFeProfile] = useState(false);
  const [submittingBeProfile, setSubmittingBeProfile] = useState(false);
  const [submittingSystemProfile, setSubmittingSystemProfile] = useState(false);
  const [inlineFilters, setInlineFilters] = useState<Record<string, unknown>>({});
  const [assignmentForm] = Form.useForm<AssignmentFormValues>();
  const [feProfileForm] = Form.useForm<FeProfileFormValues>();
  const [beProfileForm] = Form.useForm<BeProfileFormValues>();
  const [systemProfileForm] = Form.useForm<SystemProfileFormValues>();

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await provider.getList<RequestAssignmentRecord>({
        resource: 'requestAssignments',
        filters: {
          requestId,
          projectId,
          memberId,
          memberIdFilter: undefined,
          ...inlineFilters,
        },
        pagination: { current: 1, pageSize: 100 },
        sort: {
          field: 'startDate',
          order: 'ascend',
        },
      });

      setAssignments(response.data);
    } catch (caughtError) {
      setAssignments([]);
      setError(caughtError as DataProviderError);
    } finally {
      setLoading(false);
    }
  }, [inlineFilters, memberId, projectId, provider, requestId]);

  const loadAssignmentDetail = useCallback(async (assignmentId: string) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const assignment = await getRequestAssignment(assignmentId);
      setSelectedAssignment(assignment);
      assignmentForm.setFieldsValue({
        requestId: assignment.request.id,
        projectId: assignment.project.id,
        memberId: assignment.member.id,
        roleType: assignment.roleType,
        workType: assignment.workType ?? resolveWorkType(undefined, assignment.roleType),
        uncertaintyLevel: assignment.uncertaintyLevel ?? undefined,
        plannedMd: assignment.plannedMd ?? undefined,
        actualMd: assignment.actualMd ?? undefined,
        startDate: toDateInputValue(assignment.startDate),
        endDate: toDateInputValue(assignment.endDate),
        status: assignment.status ?? undefined,
        note: assignment.note ?? undefined,
      });
      feProfileForm.setFieldsValue({
        ...assignment.feProfile,
      });
      beProfileForm.setFieldsValue({
        ...assignment.beProfile,
      });
      systemProfileForm.setFieldsValue({
        ...assignment.systemProfile,
      });
    } catch (caughtError) {
      setSelectedAssignment(null);
      setDetailError(caughtError as DataProviderError);
    } finally {
      setDetailLoading(false);
    }
  }, [assignmentForm, beProfileForm, feProfileForm, systemProfileForm]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const openCreateDrawer = useCallback(() => {
    setEditingAssignment(null);
    setSelectedAssignmentId(null);
    setSelectedAssignment(null);
    setDetailError(null);
    assignmentForm.resetFields();
    feProfileForm.resetFields();
    beProfileForm.resetFields();
    systemProfileForm.resetFields();
    assignmentForm.setFieldsValue({
      requestId,
      projectId,
      memberId,
      roleType: 'pm',
      workType: resolveWorkType(undefined, 'pm'),
      status: 'planned',
    });
    setDrawerOpen(true);
  }, [assignmentForm, beProfileForm, feProfileForm, memberId, projectId, requestId, systemProfileForm]);

  const openDetailDrawer = useCallback(async (assignment: RequestAssignmentRecord, editing = false) => {
    setEditingAssignment(editing ? assignment : null);
    setSelectedAssignmentId(assignment.id);
    setDrawerOpen(true);
    await loadAssignmentDetail(assignment.id);
  }, [loadAssignmentDetail]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingAssignment(null);
    setSelectedAssignmentId(null);
    setSelectedAssignment(null);
    setDetailError(null);
    assignmentForm.resetFields();
    feProfileForm.resetFields();
    beProfileForm.resetFields();
    systemProfileForm.resetFields();
  }, [assignmentForm, beProfileForm, feProfileForm, systemProfileForm]);

  const refreshAfterMutation = useCallback(async (assignmentId?: string) => {
    await loadAssignments();
    if (assignmentId) {
      await loadAssignmentDetail(assignmentId);
    }
  }, [loadAssignmentDetail, loadAssignments]);

  const handleDelete = useCallback(async (assignment: RequestAssignmentRecord) => {
    try {
      await provider.delete({
        resource: 'requestAssignments',
        id: assignment.id,
      });
      message.success(`Deleted assignment for ${assignment.member.displayName}.`);
      await loadAssignments();
      if (selectedAssignmentId === assignment.id) {
        closeDrawer();
      }
    } catch (caughtError) {
      message.error(caughtError instanceof Error ? caughtError.message : 'Unable to delete assignment.');
    }
  }, [closeDrawer, loadAssignments, message, provider, selectedAssignmentId]);

  const handleAssignmentSubmit = useCallback(async (values: AssignmentFormValues) => {
    setSubmittingAssignment(true);

    try {
      const payload = {
        requestId: values.requestId ?? requestId,
        projectId: values.projectId ?? projectId,
        memberId: values.memberId ?? memberId,
        roleType: values.roleType,
        workType: values.workType || undefined,
        uncertaintyLevel: values.uncertaintyLevel,
        plannedMd: values.plannedMd,
        actualMd: values.actualMd,
        startDate: toIsoString(values.startDate),
        endDate: toIsoString(values.endDate),
        status: values.status || undefined,
        note: values.note || undefined,
      };

      if (!payload.requestId || !payload.projectId || !payload.memberId) {
        message.error('Request, project, and member are required.');
        setSubmittingAssignment(false);
        return;
      }

      if (selectedAssignmentId) {
        await provider.update({
          resource: 'requestAssignments',
          id: selectedAssignmentId,
          values: payload,
        });
        message.success('Assignment updated.');
        await refreshAfterMutation(selectedAssignmentId);
      } else {
        const result = await provider.create<RequestAssignmentRecord>({
          resource: 'requestAssignments',
          values: payload,
        });
        message.success('Assignment created.');
        setSelectedAssignmentId(result.data.id);
        setEditingAssignment(result.data);
        await refreshAfterMutation(result.data.id);
      }
    } catch (caughtError) {
      message.error(caughtError instanceof Error ? caughtError.message : 'Unable to save assignment.');
    } finally {
      setSubmittingAssignment(false);
    }
  }, [memberId, message, projectId, provider, refreshAfterMutation, requestId, selectedAssignmentId]);

  const handleSystemProfileSubmit = useCallback(async (values: SystemProfileFormValues) => {
    if (!selectedAssignmentId) {
      return;
    }

    setSubmittingSystemProfile(true);

    try {
      if (selectedAssignment?.systemProfile) {
        await updateRequestAssignmentSystemProfile(selectedAssignmentId, toSystemProfilePayload(values));
        message.success('System profile updated.');
      } else {
        await createRequestAssignmentSystemProfile(selectedAssignmentId, toSystemProfilePayload(values));
        message.success('System profile created.');
      }

      await refreshAfterMutation(selectedAssignmentId);
    } catch (caughtError) {
      message.error(caughtError instanceof Error ? caughtError.message : 'Unable to save system profile.');
    } finally {
      setSubmittingSystemProfile(false);
    }
  }, [message, refreshAfterMutation, selectedAssignment?.systemProfile, selectedAssignmentId]);

  const handleFeProfileSubmit = useCallback(async (values: FeProfileFormValues) => {
    if (!selectedAssignmentId) {
      return;
    }

    setSubmittingFeProfile(true);

      try {
        if (selectedAssignment?.feProfile) {
        await updateRequestAssignmentFeProfile(selectedAssignmentId, toFeProfilePayload(values));
        message.success('FE profile updated.');
      } else {
        await createRequestAssignmentFeProfile(selectedAssignmentId, toFeProfilePayload(values));
        message.success('FE profile created.');
      }

      await refreshAfterMutation(selectedAssignmentId);
    } catch (caughtError) {
      message.error(caughtError instanceof Error ? caughtError.message : 'Unable to save FE profile.');
    } finally {
      setSubmittingFeProfile(false);
    }
  }, [message, refreshAfterMutation, selectedAssignment?.feProfile, selectedAssignmentId]);

  const handleBeProfileSubmit = useCallback(async (values: BeProfileFormValues) => {
    if (!selectedAssignmentId) {
      return;
    }

    setSubmittingBeProfile(true);

      try {
        if (selectedAssignment?.beProfile) {
        await updateRequestAssignmentBeProfile(selectedAssignmentId, toBeProfilePayload(values));
        message.success('BE profile updated.');
      } else {
        await createRequestAssignmentBeProfile(selectedAssignmentId, toBeProfilePayload(values));
        message.success('BE profile created.');
      }

      await refreshAfterMutation(selectedAssignmentId);
    } catch (caughtError) {
      message.error(caughtError instanceof Error ? caughtError.message : 'Unable to save BE profile.');
    } finally {
      setSubmittingBeProfile(false);
    }
  }, [message, refreshAfterMutation, selectedAssignment?.beProfile, selectedAssignmentId]);

  const columns = useMemo<ColumnsType<RequestAssignmentRecord>>(
    () => [
      {
        title: 'Request',
        key: 'request',
        width: 200,
        render: (_, record) => `${record.request.requestCode} · ${record.request.title}`,
      },
      {
        title: 'Project',
        key: 'project',
        width: 210,
        render: (_, record) => `${record.project.projectCode} · ${record.project.name}`,
      },
      {
        title: 'Member',
        key: 'member',
        width: 180,
        render: (_, record) => record.member.displayName || record.member.email,
      },
      {
        title: 'Role',
        dataIndex: 'roleType',
        key: 'roleType',
        width: 130,
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: 'Work type',
        dataIndex: 'workType',
        key: 'workType',
        width: 120,
        render: (value) => value ? <Tag color={value === 'system' ? 'purple' : value === 'frontend' ? 'blue' : 'green'}>{value}</Tag> : '-',
      },
      {
        title: 'Uncertainty',
        dataIndex: 'uncertaintyLevel',
        key: 'uncertaintyLevel',
        width: 110,
        align: 'center',
        render: (value) => value ?? '-',
      },
      {
        title: 'Window',
        key: 'window',
        width: 180,
        render: (_, record) => `${formatDate(record.startDate)} - ${formatDate(record.endDate)}`,
      },
      {
        title: 'Planned MD',
        dataIndex: 'plannedMd',
        key: 'plannedMd',
        width: 110,
        align: 'right',
        render: (value) => value ?? '-',
      },
      {
        title: 'Actual MD',
        dataIndex: 'actualMd',
        key: 'actualMd',
        width: 110,
        align: 'right',
        render: (value) => value ?? '-',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value) => value ? <Tag color={value === 'done' ? 'green' : 'blue'}>{value}</Tag> : '-',
      },
      {
        title: 'Profiles',
        key: 'profiles',
        width: 220,
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            {record.feProfile ? <Text type="secondary">FE: {toProfileSummary(record.feProfile as unknown as Record<string, unknown>) ?? 'Ready'}</Text> : null}
            {record.beProfile ? <Text type="secondary">BE: {toProfileSummary(record.beProfile as unknown as Record<string, unknown>) ?? 'Ready'}</Text> : null}
            {record.systemProfile ? <Text type="secondary">System: {toProfileSummary(record.systemProfile as unknown as Record<string, unknown>) ?? 'Ready'}</Text> : null}
            {!record.feProfile && !record.beProfile && !record.systemProfile ? <Text type="secondary">No complexity profile</Text> : null}
          </Space>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 160,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => void openDetailDrawer(record, false)} />
            {canUpdate ? (
              <Button size="small" icon={<EditOutlined />} onClick={() => void openDetailDrawer(record, true)} />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete assignment?"
                description={`This will remove ${record.member.displayName}'s assignment.`}
                onConfirm={() => void handleDelete(record)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canDelete, canUpdate, handleDelete, openDetailDrawer],
  );

  const canEditAssignment = canUpdate && Boolean(selectedAssignmentId || !selectedAssignment);
  const feLockedByBe = Boolean(selectedAssignment?.beProfile);
  const beLockedByFe = Boolean(selectedAssignment?.feProfile);
  const selectedWorkType = Form.useWatch('workType', assignmentForm) ?? selectedAssignment?.workType ?? resolveWorkType(undefined, selectedAssignment?.roleType);
  const feLocked = Boolean(selectedAssignment?.beProfile || selectedAssignment?.systemProfile) || (selectedWorkType ? selectedWorkType !== 'frontend' : false);
  const beLocked = Boolean(selectedAssignment?.feProfile || selectedAssignment?.systemProfile) || (selectedWorkType ? selectedWorkType !== 'backend' : false);
  const systemLocked = Boolean(selectedAssignment?.feProfile || selectedAssignment?.beProfile) || (selectedWorkType ? selectedWorkType !== 'system' : false);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
        <Space direction="vertical" size={2}>
          <Text strong>{title}</Text>
          {description ? <Text type="secondary">{description}</Text> : null}
        </Space>
        <Space wrap>
          {!memberId ? (
            <Select
              allowClear
              placeholder="Filter by member"
              options={userOptions}
              style={{ width: 200 }}
              value={inlineFilters.memberId as string | undefined}
              onChange={(value) => setInlineFilters((current) => ({ ...current, memberId: value }))}
            />
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={() => void loadAssignments()}>
            Refresh
          </Button>
          {canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              Add Assignment
            </Button>
          ) : null}
        </Space>
      </Space>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load assignments"
          description={error.message}
        />
      ) : null}

      <Table<RequestAssignmentRecord>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={assignments}
        loading={loading}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        scroll={{ x: 1400 }}
        locale={{
          emptyText: loading ? 'Loading assignments...' : <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
      />

      <Drawer
        title={
          selectedAssignment
            ? `Assignment: ${selectedAssignment.member.displayName || selectedAssignment.member.email}`
            : 'New Request Assignment'
        }
        width={860}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {detailLoading ? <Spin /> : null}
        {detailError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load assignment"
            description={detailError.message}
          />
        ) : null}

        <Tabs
          items={[
            {
              key: 'assignment',
              label: 'Assignment',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {selectedAssignment ? (
                    <Descriptions
                      bordered
                      size="small"
                      column={1}
                      items={[
                        { key: 'request', label: 'Request', children: `${selectedAssignment.request.requestCode} · ${selectedAssignment.request.title}` },
                        { key: 'project', label: 'Project', children: `${selectedAssignment.project.projectCode} · ${selectedAssignment.project.name}` },
                        { key: 'member', label: 'Member', children: selectedAssignment.member.displayName || selectedAssignment.member.email },
                        { key: 'created', label: 'Created at', children: formatDateTime(selectedAssignment.createdAt) },
                        { key: 'updated', label: 'Updated at', children: formatDateTime(selectedAssignment.updatedAt) },
                      ]}
                    />
                  ) : null}

                  <Form<AssignmentFormValues>
                    form={assignmentForm}
                    layout="vertical"
                    onFinish={(values) => void handleAssignmentSubmit(values)}
                  >
                    {!requestId ? (
                      <Form.Item label="Request" name="requestId" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={requestOptions} />
                      </Form.Item>
                    ) : null}

                    {!projectId ? (
                      <Form.Item label="Project" name="projectId" rules={[{ required: true }]}>
                        <ProjectPicker options={projectOptions} placeholder="Select project" />
                      </Form.Item>
                    ) : null}

                    {!memberId ? (
                      <Form.Item label="Member" name="memberId" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={userOptions} />
                      </Form.Item>
                    ) : null}

                    <Space.Compact block>
                      <Form.Item label="Role type" name="roleType" rules={[{ required: true }]} style={{ width: '34%' }}>
                        <Select
                          options={allocationRoleOptions}
                          onChange={(value) => {
                            const inferredWorkType = resolveWorkType(undefined, value);
                            if (inferredWorkType && !assignmentForm.getFieldValue('workType')) {
                              assignmentForm.setFieldValue('workType', inferredWorkType);
                            }
                          }}
                        />
                      </Form.Item>
                      <Form.Item label="Status" name="status" style={{ width: '33%' }}>
                        <Select allowClear options={requestAssignmentStatusOptions} />
                      </Form.Item>
                      <Form.Item label="Planned MD" name="plannedMd" style={{ width: '33%' }}>
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>

                    <Space.Compact block>
                      <Form.Item label="Work type" name="workType" style={{ width: '34%' }}>
                        <Select allowClear options={requestAssignmentWorkTypeOptions} />
                      </Form.Item>
                      <Form.Item label="Uncertainty (1-5)" name="uncertaintyLevel" style={{ width: '33%' }}>
                        <InputNumber min={1} max={5} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Actual MD" name="actualMd" style={{ width: '34%' }}>
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>

                    <Space.Compact block>
                      <Form.Item label="Start date" name="startDate" style={{ width: '50%' }}>
                        <Input type="date" />
                      </Form.Item>
                      <Form.Item label="End date" name="endDate" style={{ width: '50%' }}>
                        <Input type="date" />
                      </Form.Item>
                    </Space.Compact>

                    <Form.Item label="Note" name="note">
                      <TextArea rows={3} placeholder="Operational ownership, assumptions, or delivery context" />
                    </Form.Item>

                    {canUpdate || (!selectedAssignmentId && canCreate) ? (
                      <Button type="primary" loading={submittingAssignment} onClick={() => void assignmentForm.submit()}>
                        {selectedAssignmentId ? 'Save Assignment' : 'Create Assignment'}
                      </Button>
                    ) : null}
                  </Form>
                </Space>
              ),
            },
            {
              key: 'fe-profile',
              label: 'FE Profile',
              children: selectedAssignmentId ? (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {feLockedByBe && !selectedAssignment?.feProfile ? (
                    <Alert
                      type="info"
                      showIcon
                      message="This assignment already has a BE profile. Backend allows only one complexity profile type per assignment."
                    />
                  ) : null}
                  {selectedWorkType && selectedWorkType !== 'frontend' ? (
                    <Alert
                      type="info"
                      showIcon
                      message="FE profile is available when work type is Frontend."
                    />
                  ) : null}

                  <Form<FeProfileFormValues>
                    form={feProfileForm}
                    layout="vertical"
                    onFinish={(values) => void handleFeProfileSubmit(values)}
                    disabled={!canUpdate || feLocked}
                  >
                    <Space.Compact block>
                      <Form.Item label="Screens / views" name="screensViews" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Layout complexity" name="layoutComplexity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Component reuse" name="componentReuse" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Animation level" name="animationLevel" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="User actions" name="userActions" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="API complexity" name="apiComplexity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Client-side logic" name="clientSideLogic" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="UI clarity" name="uiClarity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="Spec change risk" name="specChangeRisk" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Device support" name="deviceSupport" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Timeline pressure" name="timelinePressure" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Responsive" name="responsive" valuePropName="checked" style={{ width: '25%' }}>
                        <Switch />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="Heavy assets" name="heavyAssets" valuePropName="checked" style={{ width: '25%' }}>
                        <Switch />
                      </Form.Item>
                      <Form.Item label="User actions list" name="userActionsList" style={{ width: '75%' }}>
                        <Input placeholder="approve, reject, export, filter, assign" />
                      </Form.Item>
                    </Space.Compact>
                    <Form.Item label="Note" name="note">
                      <TextArea rows={3} />
                    </Form.Item>
                    {canUpdate && !feLocked ? (
                      <Button type="primary" loading={submittingFeProfile} onClick={() => void feProfileForm.submit()}>
                        {selectedAssignment?.feProfile ? 'Save FE Profile' : 'Create FE Profile'}
                      </Button>
                    ) : null}
                  </Form>
                </Space>
              ) : (
                <Alert type="info" showIcon message="Create the assignment first, then add FE complexity details." />
              ),
            },
            {
              key: 'be-profile',
              label: 'BE Profile',
              children: selectedAssignmentId ? (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {beLockedByFe && !selectedAssignment?.beProfile ? (
                    <Alert
                      type="info"
                      showIcon
                      message="This assignment already has a FE profile. Backend allows only one complexity profile type per assignment."
                    />
                  ) : null}
                  {selectedWorkType && selectedWorkType !== 'backend' ? (
                    <Alert
                      type="info"
                      showIcon
                      message="BE profile is available when work type is Backend."
                    />
                  ) : null}

                  <Form<BeProfileFormValues>
                    form={beProfileForm}
                    layout="vertical"
                    onFinish={(values) => void handleBeProfileSubmit(values)}
                    disabled={!canUpdate || beLocked}
                  >
                    <Space.Compact block>
                      <Form.Item label="User actions" name="userActions" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Business logic" name="businessLogicComplexity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="DB tables" name="dbTables" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="APIs" name="apis" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="Requirement clarity" name="requirementClarity" style={{ width: '34%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Change frequency" name="changeFrequency" style={{ width: '33%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Timeline pressure" name="timelinePressure" style={{ width: '33%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Form.Item label="Realtime" name="realtime" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item label="Note" name="note">
                      <TextArea rows={3} />
                    </Form.Item>
                    {canUpdate && !beLocked ? (
                      <Button type="primary" loading={submittingBeProfile} onClick={() => void beProfileForm.submit()}>
                        {selectedAssignment?.beProfile ? 'Save BE Profile' : 'Create BE Profile'}
                      </Button>
                    ) : null}
                  </Form>
                </Space>
              ) : (
                <Alert type="info" showIcon message="Create the assignment first, then add BE complexity details." />
              ),
            },
            {
              key: 'system-profile',
              label: 'System Profile',
              children: selectedAssignmentId ? (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {selectedWorkType && selectedWorkType !== 'system' ? (
                    <Alert
                      type="info"
                      showIcon
                      message="System profile is available when work type is System."
                    />
                  ) : null}

                  <Form<SystemProfileFormValues>
                    form={systemProfileForm}
                    layout="vertical"
                    onFinish={(values) => void handleSystemProfileSubmit(values)}
                    disabled={!canUpdate || systemLocked}
                  >
                    <Space.Compact block>
                      <Form.Item label="Domain complexity" name="domainComplexity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Integration count" name="integrationCount" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Dependency level" name="dependencyLevel" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Requirement clarity" name="requirementClarity" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="Unknown factor" name="unknownFactor" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Data volume" name="dataVolume" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Scalability" name="scalabilityRequirement" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Security" name="securityRequirement" style={{ width: '25%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="External API complexity" name="externalApiComplexity" style={{ width: '34%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Change frequency" name="changeFrequency" style={{ width: '33%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Testing complexity" name="testingComplexity" style={{ width: '33%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Space.Compact block>
                      <Form.Item label="Timeline pressure" name="timelinePressure" style={{ width: '100%' }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Space.Compact>
                    <Form.Item label="Note" name="note">
                      <TextArea rows={3} />
                    </Form.Item>
                    {canUpdate && !systemLocked ? (
                      <Button type="primary" loading={submittingSystemProfile} onClick={() => void systemProfileForm.submit()}>
                        {selectedAssignment?.systemProfile ? 'Save System Profile' : 'Create System Profile'}
                      </Button>
                    ) : null}
                  </Form>
                </Space>
              ) : (
                <Alert type="info" showIcon message="Create the assignment first, then add system complexity details." />
              ),
            },
          ]}
        />

        {selectedAssignment ? (
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            {resolveWorkType(selectedAssignment.workType, selectedAssignment.roleType) === 'frontend'
              ? 'This role looks frontend-oriented, so FE complexity is usually the practical profile to maintain.'
              : resolveWorkType(selectedAssignment.workType, selectedAssignment.roleType) === 'backend'
                ? 'This role looks backend-oriented, so BE complexity is usually the practical profile to maintain.'
                : resolveWorkType(selectedAssignment.workType, selectedAssignment.roleType) === 'system'
                  ? 'This assignment is marked as system work, so the system complexity profile is usually the practical one to maintain.'
                  : 'Pick the profile type that best matches how this assignment is estimated in practice.'}
          </Paragraph>
        ) : null}
      </Drawer>
    </Space>
  );
}
