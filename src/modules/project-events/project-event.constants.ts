export const PROJECT_EVENT_TYPES = [
  'request_created',
  'prd_received',
  'design_received',
  'estimate_done',
  'development_started',
  'backend_handover',
  'frontend_handover',
  'uat_sent',
  'uat_feedback_received',
  'live',
  'monitoring_started',
  'incident_opened',
  'incident_resolved',
  'scope_changed',
] as const;

export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number];
