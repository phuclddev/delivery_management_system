export interface SelectOption {
  label: string;
  value: string;
}

export const requestPriorityOptions: SelectOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export const requestStatusOptions: SelectOption[] = [
  { label: 'New', value: 'new' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'In Review', value: 'in_review' },
];

export const requestTypeOptions: SelectOption[] = [
  { label: 'Feature', value: 'feature' },
  { label: 'Campaign', value: 'campaign' },
  { label: 'Bug Fix', value: 'bugfix' },
  { label: 'Optimization', value: 'optimization' },
];

export const scopeTypeOptions: SelectOption[] = [
  { label: 'Full', value: 'full' },
  { label: 'Partial', value: 'partial' },
  { label: 'Backend', value: 'backend_only' },
  { label: 'Frontend', value: 'frontend_only' },
];

export const projectStatusOptions: SelectOption[] = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const riskLevelOptions: SelectOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const allocationRoleOptions: SelectOption[] = [
  { label: 'PM', value: 'pm' },
  { label: 'Backend Dev', value: 'backend_dev' },
  { label: 'Frontend Dev', value: 'frontend_dev' },
  { label: 'QA', value: 'qa' },
  { label: 'Designer', value: 'designer' },
];

export const requestAssignmentStatusOptions: SelectOption[] = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Done', value: 'done' },
  { label: 'On Hold', value: 'on_hold' },
];

export const requestAssignmentWorkTypeOptions: SelectOption[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'System', value: 'system' },
];

export const uncertaintyLevelOptions: SelectOption[] = [
  { label: '1 - Very clear', value: '1' },
  { label: '2 - Clear', value: '2' },
  { label: '3 - Moderate', value: '3' },
  { label: '4 - Uncertain', value: '4' },
  { label: '5 - Very uncertain', value: '5' },
];

export const incidentSeverityOptions: SelectOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export const incidentDomainOptions: SelectOption[] = [
  { label: 'Backend', value: 'backend' },
  { label: 'Frontend', value: 'frontend' },
  { label: 'Infra', value: 'infra' },
  { label: 'Data', value: 'data' },
];

export const incidentStatusOptions: SelectOption[] = [
  { label: 'Open', value: 'open' },
  { label: 'Monitoring', value: 'monitoring' },
  { label: 'Resolved', value: 'resolved' },
];

export const artifactTypeOptions: SelectOption[] = [
  { label: 'Release Note', value: 'release_note' },
  { label: 'PRD', value: 'prd' },
  { label: 'Checklist', value: 'checklist' },
  { label: 'Design Note', value: 'design_note' },
  { label: 'QA Report', value: 'qa_report' },
];

export const leaveTypeOptions: SelectOption[] = [
  { label: 'Annual Leave', value: 'annual_leave' },
  { label: 'Sick Leave', value: 'sick_leave' },
  { label: 'Personal Leave', value: 'personal_leave' },
  { label: 'Work From Home', value: 'wfh' },
];

export const projectEventTypeOptions: SelectOption[] = [
  { label: 'Request Created', value: 'request_created' },
  { label: 'PRD Received', value: 'prd_received' },
  { label: 'Design Received', value: 'design_received' },
  { label: 'Estimate Done', value: 'estimate_done' },
  { label: 'Development Started', value: 'development_started' },
  { label: 'Backend Handover', value: 'backend_handover' },
  { label: 'Frontend Handover', value: 'frontend_handover' },
  { label: 'UAT Sent', value: 'uat_sent' },
  { label: 'UAT Feedback Received', value: 'uat_feedback_received' },
  { label: 'Live', value: 'live' },
  { label: 'Monitoring Started', value: 'monitoring_started' },
  { label: 'Incident Opened', value: 'incident_opened' },
  { label: 'Incident Resolved', value: 'incident_resolved' },
  { label: 'Scope Changed', value: 'scope_changed' },
];

export const projectEventSourceOptions: SelectOption[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'System', value: 'system' },
  { label: 'Import', value: 'import' },
  { label: 'Sync', value: 'sync' },
];
