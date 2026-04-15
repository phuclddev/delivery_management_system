import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProjectPicker } from '@/components/ProjectPicker';
import { useDataProvider } from '@/providers/dataProvider';
import type { DataProviderError } from '@/providers/dataProvider';
import type { ProjectEventRecord } from '@/types/domain';
import { formatDateTime } from '@/utils/format';
import { projectEventSourceOptions, projectEventTypeOptions } from '@/utils/options';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type SelectOption = {
  label: string;
  value: string;
};

interface ProjectEventsSectionProps {
  title: string;
  description?: string;
  projectId?: string;
  requestId?: string;
  projectOptions: SelectOption[];
  requestOptions: SelectOption[];
  userOptions: SelectOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  emptyDescription: string;
}

interface ProjectEventFormValues {
  projectId?: string;
  requestId?: string;
  eventType: string;
  eventTitle: string;
  eventDescription?: string;
  eventAt: string;
  actorUserId?: string;
  sourceType?: string;
  metadataJsonText?: string;
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function prettifyEventType(value: string) {
  const matched = projectEventTypeOptions.find((option) => option.value === value);
  return matched?.label ?? value.split('_').join(' ');
}

function statusColor(eventType: string) {
  if (['incident_opened', 'scope_changed'].includes(eventType)) {
    return 'red';
  }

  if (['live', 'incident_resolved', 'uat_sent'].includes(eventType)) {
    return 'green';
  }

  if (['development_started', 'backend_handover', 'frontend_handover'].includes(eventType)) {
    return 'blue';
  }

  return 'default';
}

function formatMetadata(metadataJson?: Record<string, unknown> | null) {
  if (!metadataJson || Object.keys(metadataJson).length === 0) {
    return null;
  }

  return JSON.stringify(metadataJson, null, 2);
}

export function ProjectEventsSection({
  title,
  description,
  projectId,
  requestId,
  projectOptions,
  requestOptions,
  userOptions,
  canCreate,
  canUpdate,
  canDelete,
  emptyDescription,
}: ProjectEventsSectionProps) {
  const provider = useDataProvider();
  const { message } = App.useApp();
  const [events, setEvents] = useState<ProjectEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DataProviderError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectEventRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ProjectEventFormValues>();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await provider.getList<ProjectEventRecord>({
        resource: 'projectEvents',
        filters: {
          projectId,
          requestId,
        },
        pagination: { current: 1, pageSize: 100 },
        sort: {
          field: 'eventAt',
          order: 'descend',
        },
      });

      setEvents(response.data);
    } catch (caughtError) {
      setError(caughtError as DataProviderError);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, provider, requestId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const scopedRequestOptions = useMemo(() => {
    if (!requestId) {
      return requestOptions;
    }

    return requestOptions.filter((option) => option.value === requestId);
  }, [requestId, requestOptions]);

  const openCreateModal = useCallback(() => {
    setEditingEvent(null);
    form.resetFields();
    form.setFieldsValue({
      projectId,
      requestId,
      eventAt: toDateTimeLocalValue(new Date().toISOString()),
      sourceType: 'manual',
    });
    setModalOpen(true);
  }, [form, projectId, requestId]);

  const openEditModal = useCallback(
    (event: ProjectEventRecord) => {
      setEditingEvent(event);
      form.setFieldsValue({
        projectId: event.project.id,
        requestId: event.request?.id,
        eventType: event.eventType,
        eventTitle: event.eventTitle,
        eventDescription: event.eventDescription ?? undefined,
        eventAt: toDateTimeLocalValue(event.eventAt),
        actorUserId: event.actorUser?.id,
        sourceType: event.sourceType ?? undefined,
        metadataJsonText: formatMetadata(event.metadataJson) ?? undefined,
      });
      setModalOpen(true);
    },
    [form],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    form.resetFields();
  }, [form]);

  const handleDelete = useCallback(
    async (event: ProjectEventRecord) => {
      try {
        await provider.delete({
          resource: 'projectEvents',
          id: event.id,
        });
        message.success(`Deleted event "${event.eventTitle}".`);
        await loadEvents();
      } catch (caughtError) {
        message.error(caughtError instanceof Error ? caughtError.message : 'Unable to delete event.');
      }
    },
    [loadEvents, message, provider],
  );

  const handleSubmit = useCallback(
    async (values: ProjectEventFormValues) => {
      setSubmitting(true);

      try {
        let metadataJson: Record<string, unknown> | undefined;

        if (values.metadataJsonText?.trim()) {
          try {
            const parsed = JSON.parse(values.metadataJsonText);

            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
              throw new Error('Metadata JSON must be an object.');
            }

            metadataJson = parsed as Record<string, unknown>;
          } catch (error) {
            message.error(error instanceof Error ? error.message : 'Invalid metadata JSON.');
            setSubmitting(false);
            return;
          }
        }

        const payload = {
          projectId: values.projectId ?? projectId,
          requestId: values.requestId || requestId || undefined,
          eventType: values.eventType,
          eventTitle: values.eventTitle,
          eventDescription: values.eventDescription || undefined,
          eventAt: toIsoDateTime(values.eventAt),
          actorUserId: values.actorUserId || undefined,
          sourceType: values.sourceType || undefined,
          metadataJson,
        };

        if (!payload.projectId || !payload.eventAt) {
          message.error('Project and event time are required.');
          setSubmitting(false);
          return;
        }

        if (editingEvent) {
          await provider.update({
            resource: 'projectEvents',
            id: editingEvent.id,
            values: payload,
          });
          message.success(`Updated event "${values.eventTitle}".`);
        } else {
          await provider.create({
            resource: 'projectEvents',
            values: payload,
          });
          message.success(`Created event "${values.eventTitle}".`);
        }

        closeModal();
        await loadEvents();
      } catch (caughtError) {
        message.error(caughtError instanceof Error ? caughtError.message : 'Unable to save event.');
      } finally {
        setSubmitting(false);
      }
    },
    [closeModal, editingEvent, loadEvents, message, projectId, provider, requestId],
  );

  const columns = useMemo<ColumnsType<ProjectEventRecord>>(
    () => [
      {
        title: 'Event',
        key: 'event',
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{record.eventTitle}</Text>
            <Space size={[4, 4]} wrap>
              <Tag color={statusColor(record.eventType)}>{prettifyEventType(record.eventType)}</Tag>
              {record.sourceType ? <Tag>{record.sourceType}</Tag> : null}
            </Space>
          </Space>
        ),
      },
      {
        title: 'Request',
        key: 'request',
        width: 180,
        render: (_, record) =>
          record.request ? `${record.request.requestCode} · ${record.request.title}` : '-',
      },
      {
        title: 'Actor',
        key: 'actor',
        width: 160,
        render: (_, record) => record.actorUser?.displayName ?? record.actorUser?.email ?? '-',
      },
      {
        title: 'At',
        dataIndex: 'eventAt',
        key: 'eventAt',
        width: 180,
        render: (value) => formatDateTime(value),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space>
            {canUpdate ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              />
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="Delete event?"
                description={`This will remove "${record.eventTitle}".`}
                onConfirm={() => void handleDelete(record)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canDelete, canUpdate, handleDelete, openEditModal],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
        <Space direction="vertical" size={2}>
          <Text strong>{title}</Text>
          {description ? <Text type="secondary">{description}</Text> : null}
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadEvents()}>
            Refresh
          </Button>
          {canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Add Event
            </Button>
          ) : null}
        </Space>
      </Space>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load events"
          description={error.message}
        />
      ) : null}

      {loading ? <Spin /> : null}

      {!loading && !events.length ? (
        <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : null}

      {!loading && events.length ? (
        <>
          <Timeline
            items={events.map((event) => ({
              color: statusColor(event.eventType),
              children: (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap>
                    <Text strong>{event.eventTitle}</Text>
                    <Tag>{prettifyEventType(event.eventType)}</Tag>
                    {event.request ? <Tag color="blue">{event.request.requestCode}</Tag> : null}
                  </Space>
                  <Text type="secondary">
                    {formatDateTime(event.eventAt)}
                    {event.actorUser ? ` · ${event.actorUser.displayName || event.actorUser.email}` : ''}
                    {event.sourceType ? ` · ${event.sourceType}` : ''}
                  </Text>
                  {event.eventDescription ? <Paragraph style={{ marginBottom: 0 }}>{event.eventDescription}</Paragraph> : null}
                  {event.metadataJson ? (
                    <Paragraph
                      style={{
                        marginBottom: 0,
                        padding: 12,
                        borderRadius: 8,
                        background: '#fafafa',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {formatMetadata(event.metadataJson)}
                    </Paragraph>
                  ) : null}
                </Space>
              ),
            }))}
          />

          <Table<ProjectEventRecord>
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={events}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </>
      ) : null}

      <Modal
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void form.submit()}
        confirmLoading={submitting}
        destroyOnClose
        width={720}
      >
        <Form<ProjectEventFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSubmit(values)}
        >
          {!projectId ? (
            <Form.Item
              label="Project"
              name="projectId"
              rules={[{ required: true, message: 'Please select a project.' }]}
            >
              <ProjectPicker options={projectOptions} placeholder="Select project" />
            </Form.Item>
          ) : null}

          {!requestId ? (
            <Form.Item label="Request" name="requestId">
              <Select
                allowClear
                showSearch
                options={scopedRequestOptions}
                optionFilterProp="label"
                placeholder="Optional related request"
              />
            </Form.Item>
          ) : null}

          <Space.Compact block>
            <Form.Item
              label="Event type"
              name="eventType"
              rules={[{ required: true, message: 'Please select an event type.' }]}
              style={{ width: '50%' }}
            >
              <Select options={projectEventTypeOptions} />
            </Form.Item>
            <Form.Item
              label="Event at"
              name="eventAt"
              rules={[{ required: true, message: 'Please provide event time.' }]}
              style={{ width: '50%' }}
            >
              <Input type="datetime-local" />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            label="Title"
            name="eventTitle"
            rules={[{ required: true, message: 'Please enter an event title.' }]}
          >
            <Input placeholder="Backend handover completed" />
          </Form.Item>

          <Form.Item label="Description" name="eventDescription">
            <TextArea rows={3} placeholder="Optional operational context" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item label="Actor user" name="actorUserId" style={{ width: '50%' }}>
              <Select
                allowClear
                showSearch
                options={userOptions}
                optionFilterProp="label"
                placeholder="Optional actor"
              />
            </Form.Item>
            <Form.Item label="Source type" name="sourceType" style={{ width: '50%' }}>
              <Select
                allowClear
                options={projectEventSourceOptions}
                placeholder="Optional source"
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item label="Metadata JSON" name="metadataJsonText">
            <TextArea
              rows={5}
              placeholder='{"changedBy":"pm@garena.vn","from":"v1","to":"v2"}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
