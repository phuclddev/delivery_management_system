import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DELIVERY_TEAM_CODE = 'CODE';

type TeamSeed = {
  code: string;
  name: string;
  description: string;
};

type UserSeed = {
  email: string;
  displayName: string;
  teamCode: string;
  roleCodes: string[];
  discipline?: 'backend' | 'frontend' | 'pm' | 'admin';
};

type ProjectSeed = {
  projectCode: string;
  name: string;
  teamCode: string;
  pmEmail: string;
  projectType: string;
  scopeType: string;
  status: string;
  businessPriority: string;
  riskLevel: string;
  requestedLiveDate: string;
  plannedStartDate: string;
  plannedLiveDate: string;
  actualStartDate?: string;
  actualLiveDate?: string;
  backendStartDate: string;
  backendEndDate: string;
  frontendStartDate: string;
  frontendEndDate: string;
  currentScopeVersion: string;
  scopeChangeCount: number;
  blockerCount: number;
  chatGroupUrl: string;
  repoUrl: string;
  notes: string;
};

type RequestSeed = {
  requestCode: string;
  projectCode: string;
  requesterTeamCode: string;
  ownerEmail?: string;
  title: string;
  campaignName: string;
  requestType: string;
  scopeType: string;
  priority: string;
  desiredLiveDate: string;
  brief: string;
  status: string;
  backendStartDate?: string;
  backendEndDate?: string;
  frontendStartDate?: string;
  frontendEndDate?: string;
  businessValueScore: number;
  userImpactScore: number;
  urgencyScore: number;
  valueNote: string;
  comment: string;
};

type ProjectEventSeed = {
  id: string;
  projectCode: string;
  requestCode?: string;
  actorEmail?: string;
  eventType: string;
  eventTitle: string;
  eventDescription?: string;
  eventAt: string;
  sourceType?: string;
  metadataJson?: Prisma.InputJsonValue;
};

type AssignmentSeed = {
  id: string;
  requestCode: string;
  projectCode: string;
  memberEmail: string;
  roleType: string;
  plannedMd?: number;
  actualMd?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  note?: string;
  discipline: 'frontend' | 'backend';
  feProfile?: {
    screensViews?: number;
    layoutComplexity?: number;
    componentReuse?: number;
    responsive?: boolean;
    animationLevel?: number;
    userActions?: number;
    userActionsList?: string;
    apiComplexity?: number;
    clientSideLogic?: number;
    heavyAssets?: boolean;
    uiClarity?: number;
    specChangeRisk?: number;
    deviceSupport?: number;
    timelinePressure?: number;
    note?: string;
  };
  beProfile?: {
    userActions?: number;
    businessLogicComplexity?: number;
    dbTables?: number;
    apis?: number;
    requirementClarity?: number;
    changeFrequency?: number;
    realtime?: boolean;
    timelinePressure?: number;
    note?: string;
  };
};

type AllocationSeed = {
  id: string;
  memberEmail: string;
  projectCode: string;
  roleType: string;
  allocationPct: number;
  plannedMd?: number;
  actualMd?: number;
  startDate: string;
  endDate: string;
  priorityWeight?: number;
  isPrimary?: boolean;
  note?: string;
};

type IncidentSeed = {
  incidentCode: string;
  projectCode: string;
  foundAt: string;
  severity: string;
  domain: string;
  impactDescription: string;
  resolvers?: string;
  background?: string;
  solution?: string;
  processingMinutes?: number;
  tag?: string;
  status: string;
  ownerEmail?: string;
};

type ArtifactSeed = {
  id: string;
  projectCode: string;
  artifactType: string;
  title: string;
  contentText?: string;
  fileUrl?: string;
  mimeType?: string;
  uploadedBy?: string;
  isFinal?: boolean;
};

type LeaveSeed = {
  id: string;
  memberEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  note?: string;
};

const teamSeeds: TeamSeed[] = [
  {
    code: 'ADM',
    name: 'Administration',
    description: 'System administration and operations governance',
  },
  {
    code: DELIVERY_TEAM_CODE,
    name: 'CODE',
    description: 'Delivery engineering team measured for workload, performance, and consistency reporting',
  },
  {
    code: 'AOV',
    name: 'AOV',
    description: 'Arena of Valor requester and stakeholder team',
  },
  {
    code: 'FCO',
    name: 'FCO',
    description: 'FCO requester and stakeholder team',
  },
  {
    code: 'FF',
    name: 'FF',
    description: 'Free Fire requester and stakeholder team',
  },
  {
    code: 'DF',
    name: 'DF',
    description: 'DF requester and stakeholder team',
  },
  {
    code: 'FCM',
    name: 'FCM',
    description: 'FCM requester and stakeholder team',
  },
];

const roleSeeds = [
  {
    code: 'super_admin',
    name: 'Super Admin',
    description: 'Platform owner with full system access',
  },
  {
    code: 'admin',
    name: 'Admin',
    description: 'Administrative access to the platform',
  },
  {
    code: 'pm',
    name: 'Project Manager',
    description: 'Can manage delivery planning and reporting modules',
  },
  {
    code: 'dev',
    name: 'Developer',
    description: 'Can access assigned delivery data and execution updates',
  },
  {
    code: 'requester',
    name: 'Requester',
    description: 'Can create requests and manage only their own requests',
  },
];

const permissionModules = [
  'teams',
  'requests',
  'projects',
  'allocations',
  'incidents',
  'artifacts',
  'leaves',
  'users',
  'roles',
  'permissions',
];

const permissionActions = ['view', 'create', 'update', 'delete', 'manage'];
const customPermissionSeeds = [
  {
    module: 'requests',
    action: 'view_own',
    code: 'requests:view_own',
    description: 'View only requests owned by the authenticated user',
  },
  {
    module: 'requests',
    action: 'update_own',
    code: 'requests:update_own',
    description: 'Update only requests owned by the authenticated user',
  },
] as const;

const userSeeds: UserSeed[] = [
  {
    email: 'admin@garena.vn',
    displayName: 'System Admin',
    teamCode: 'ADM',
    roleCodes: ['admin'],
    discipline: 'admin',
  },
  {
    email: 'pm@garena.vn',
    displayName: 'Delivery PM',
    teamCode: 'ADM',
    roleCodes: ['pm'],
    discipline: 'pm',
  },
  {
    email: 'dev@garena.vn',
    displayName: 'Delivery Developer',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'dinhphuc.luu@garena.vn',
    displayName: 'Dinhphuc Luu',
    teamCode: 'ADM',
    roleCodes: ['super_admin'],
    discipline: 'admin',
  },
  {
    email: 'trungkien.tran@garena.vn',
    displayName: 'Trungkien Tran',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'tienhuong.nguyen@garena.vn',
    displayName: 'Tienhuong Nguyen',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'thedung.nguyen@garena.vn',
    displayName: 'Thedung Nguyen',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'ducnam.hoang@garena.vn',
    displayName: 'Ducnam Hoang',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'hoanganh.cao@garena.vn',
    displayName: 'Hoanganh Cao',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'tienquang.nguyen@garena.vn',
    displayName: 'Tienquang Nguyen',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'thequang.pham@garena.vn',
    displayName: 'Thequang Pham',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'quochung.tran@garena.vn',
    displayName: 'Quochung Tran',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'caocuong.tran@garena.vn',
    displayName: 'Caocuong Tran',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'ductrong.duong@garena.vn',
    displayName: 'Ductrong Duong',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'thainam.luong@garena.vn',
    displayName: 'Thainam Luong',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'hoanghiep.ta_ctv@garena.vn',
    displayName: 'Hoanghiep Ta',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'conghoang.bui_ctv@garena.vn',
    displayName: 'Conghoang Bui',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'frontend',
  },
  {
    email: 'anhtu.le@garena.vn',
    displayName: 'Anhtu Le',
    teamCode: DELIVERY_TEAM_CODE,
    roleCodes: ['dev'],
    discipline: 'backend',
  },
  {
    email: 'bao.aov@garena.vn',
    displayName: 'Bao AOV',
    teamCode: 'AOV',
    roleCodes: ['requester'],
    discipline: 'pm',
  },
  {
    email: 'linh.ff@garena.vn',
    displayName: 'Linh FF',
    teamCode: 'FF',
    roleCodes: ['requester'],
    discipline: 'pm',
  },
  {
    email: 'phuong.df@garena.vn',
    displayName: 'Phuong DF',
    teamCode: 'DF',
    roleCodes: ['requester'],
    discipline: 'pm',
  },
  {
    email: 'minh.fco@garena.vn',
    displayName: 'Minh FCO',
    teamCode: 'FCO',
    roleCodes: ['requester'],
    discipline: 'pm',
  },
  {
    email: 'huyen.fcm@garena.vn',
    displayName: 'Huyen FCM',
    teamCode: 'FCM',
    roleCodes: ['requester'],
    discipline: 'pm',
  },
];

const projectSeeds: ProjectSeed[] = [
  {
    projectCode: 'PRJ-AOV-2026-OPS',
    name: 'AOV LiveOps Delivery Hub',
    teamCode: 'AOV',
    pmEmail: 'pm@garena.vn',
    projectType: 'platform',
    scopeType: 'full',
    status: 'in_progress',
    businessPriority: 'high',
    riskLevel: 'medium',
    requestedLiveDate: '2026-06-20T00:00:00.000Z',
    plannedStartDate: '2026-03-18T00:00:00.000Z',
    plannedLiveDate: '2026-06-18T00:00:00.000Z',
    backendStartDate: '2026-03-20T00:00:00.000Z',
    backendEndDate: '2026-05-22T00:00:00.000Z',
    frontendStartDate: '2026-04-03T00:00:00.000Z',
    frontendEndDate: '2026-06-12T00:00:00.000Z',
    currentScopeVersion: 'v1.3',
    scopeChangeCount: 2,
    blockerCount: 1,
    chatGroupUrl: 'https://chat.garena.vn/aov-liveops-delivery',
    repoUrl: 'https://github.com/garena/dms-aov-liveops',
    notes: 'Long-running project for AOV release planning, request intake, and live operations visibility.',
  },
  {
    projectCode: 'PRJ-FCO-2026-CRM',
    name: 'FCO Campaign CRM Upgrade',
    teamCode: 'FCO',
    pmEmail: 'pm@garena.vn',
    projectType: 'feature',
    scopeType: 'full',
    status: 'in_progress',
    businessPriority: 'high',
    riskLevel: 'medium',
    requestedLiveDate: '2026-06-05T00:00:00.000Z',
    plannedStartDate: '2026-02-24T00:00:00.000Z',
    plannedLiveDate: '2026-06-02T00:00:00.000Z',
    backendStartDate: '2026-03-01T00:00:00.000Z',
    backendEndDate: '2026-05-10T00:00:00.000Z',
    frontendStartDate: '2026-03-15T00:00:00.000Z',
    frontendEndDate: '2026-05-28T00:00:00.000Z',
    currentScopeVersion: 'v2.1',
    scopeChangeCount: 3,
    blockerCount: 0,
    chatGroupUrl: 'https://chat.garena.vn/fco-crm-upgrade',
    repoUrl: 'https://github.com/garena/dms-fco-crm',
    notes: 'CRM modernization initiative with multiple marketing and ops requests under one execution stream.',
  },
  {
    projectCode: 'PRJ-FF-2026-MON',
    name: 'FF Monetization Control Center',
    teamCode: 'FF',
    pmEmail: 'pm@garena.vn',
    projectType: 'feature',
    scopeType: 'full',
    status: 'uat',
    businessPriority: 'critical',
    riskLevel: 'high',
    requestedLiveDate: '2026-04-28T00:00:00.000Z',
    plannedStartDate: '2026-01-18T00:00:00.000Z',
    plannedLiveDate: '2026-04-25T00:00:00.000Z',
    backendStartDate: '2026-01-22T00:00:00.000Z',
    backendEndDate: '2026-03-26T00:00:00.000Z',
    frontendStartDate: '2026-02-08T00:00:00.000Z',
    frontendEndDate: '2026-04-16T00:00:00.000Z',
    currentScopeVersion: 'v2.5',
    scopeChangeCount: 4,
    blockerCount: 1,
    chatGroupUrl: 'https://chat.garena.vn/ff-monetization-control',
    repoUrl: 'https://github.com/garena/dms-ff-monetization',
    notes: 'High-priority release for monetization control, under final UAT review.',
  },
  {
    projectCode: 'PRJ-DF-2026-ACQ',
    name: 'DF User Acquisition Cockpit',
    teamCode: 'DF',
    pmEmail: 'pm@garena.vn',
    projectType: 'improvement',
    scopeType: 'partial',
    status: 'in_progress',
    businessPriority: 'medium',
    riskLevel: 'low',
    requestedLiveDate: '2026-07-10T00:00:00.000Z',
    plannedStartDate: '2026-04-01T00:00:00.000Z',
    plannedLiveDate: '2026-07-08T00:00:00.000Z',
    backendStartDate: '2026-04-05T00:00:00.000Z',
    backendEndDate: '2026-06-14T00:00:00.000Z',
    frontendStartDate: '2026-04-20T00:00:00.000Z',
    frontendEndDate: '2026-06-28T00:00:00.000Z',
    currentScopeVersion: 'v1.1',
    scopeChangeCount: 1,
    blockerCount: 0,
    chatGroupUrl: 'https://chat.garena.vn/df-acq-cockpit',
    repoUrl: 'https://github.com/garena/dms-df-acquisition',
    notes: 'Growth analytics and user acquisition cockpit for campaign managers.',
  },
  {
    projectCode: 'PRJ-FCM-2026-CAMP',
    name: 'FCM Campaign Delivery Workspace',
    teamCode: 'FCM',
    pmEmail: 'pm@garena.vn',
    projectType: 'platform',
    scopeType: 'full',
    status: 'live',
    businessPriority: 'high',
    riskLevel: 'medium',
    requestedLiveDate: '2026-03-25T00:00:00.000Z',
    plannedStartDate: '2025-12-15T00:00:00.000Z',
    plannedLiveDate: '2026-03-20T00:00:00.000Z',
    actualStartDate: '2025-12-18T00:00:00.000Z',
    actualLiveDate: '2026-03-21T00:00:00.000Z',
    backendStartDate: '2025-12-18T00:00:00.000Z',
    backendEndDate: '2026-02-14T00:00:00.000Z',
    frontendStartDate: '2026-01-05T00:00:00.000Z',
    frontendEndDate: '2026-03-10T00:00:00.000Z',
    currentScopeVersion: 'v3.0',
    scopeChangeCount: 2,
    blockerCount: 0,
    chatGroupUrl: 'https://chat.garena.vn/fcm-campaign-workspace',
    repoUrl: 'https://github.com/garena/dms-fcm-campaigns',
    notes: 'Already-live workspace used by campaign and revenue operations teams.',
  },
];

const requestSeeds: RequestSeed[] = [
  {
    requestCode: 'REQ-AOV-001',
    projectCode: 'PRJ-AOV-2026-OPS',
    requesterTeamCode: 'AOV',
    title: 'Release milestone dashboard for AOV seasonal events',
    campaignName: 'AOV Spring Clash',
    requestType: 'feature',
    scopeType: 'full',
    priority: 'high',
    desiredLiveDate: '2026-05-30T00:00:00.000Z',
    brief: 'Provide release readiness tracking, blocker visibility, and approval checkpoints for seasonal launches.',
    status: 'in_progress',
    backendStartDate: '2026-03-20T00:00:00.000Z',
    backendEndDate: '2026-04-24T00:00:00.000Z',
    frontendStartDate: '2026-04-05T00:00:00.000Z',
    frontendEndDate: '2026-05-16T00:00:00.000Z',
    businessValueScore: 9,
    userImpactScore: 8,
    urgencyScore: 8,
    valueNote: 'Reduces manual release sync effort for every seasonal deployment.',
    comment: 'Key request driving project-level timeline and reporting.',
  },
  {
    requestCode: 'REQ-AOV-002',
    projectCode: 'PRJ-AOV-2026-OPS',
    requesterTeamCode: 'AOV',
    title: 'Incident readiness checklist and post-live monitoring views',
    campaignName: 'AOV Spring Clash',
    requestType: 'improvement',
    scopeType: 'partial',
    priority: 'medium',
    desiredLiveDate: '2026-06-10T00:00:00.000Z',
    brief: 'Enable monitoring setup verification, runbook links, and incident triage context after launch.',
    status: 'approved',
    backendStartDate: '2026-04-18T00:00:00.000Z',
    backendEndDate: '2026-05-08T00:00:00.000Z',
    frontendStartDate: '2026-05-01T00:00:00.000Z',
    frontendEndDate: '2026-05-28T00:00:00.000Z',
    businessValueScore: 8,
    userImpactScore: 7,
    urgencyScore: 6,
    valueNote: 'Improves launch safety and post-release coordination.',
    comment: 'Scoped as a follow-up request under the same project.',
  },
  {
    requestCode: 'REQ-FCO-001',
    projectCode: 'PRJ-FCO-2026-CRM',
    requesterTeamCode: 'FCO',
    title: 'Audience segment management for CRM operations',
    campaignName: 'FCO CRM Wave 1',
    requestType: 'feature',
    scopeType: 'full',
    priority: 'high',
    desiredLiveDate: '2026-05-25T00:00:00.000Z',
    brief: 'Support dynamic audience segments, exclusions, and campaign handoff to CRM execution.',
    status: 'in_progress',
    backendStartDate: '2026-03-01T00:00:00.000Z',
    backendEndDate: '2026-04-18T00:00:00.000Z',
    frontendStartDate: '2026-03-20T00:00:00.000Z',
    frontendEndDate: '2026-05-10T00:00:00.000Z',
    businessValueScore: 9,
    userImpactScore: 9,
    urgencyScore: 7,
    valueNote: 'Directly supports CRM targeting efficiency and campaign performance.',
    comment: 'Primary request for the CRM upgrade stream.',
  },
  {
    requestCode: 'REQ-FCO-002',
    projectCode: 'PRJ-FCO-2026-CRM',
    requesterTeamCode: 'FCO',
    title: 'Approval trail for CRM campaign changes',
    campaignName: 'FCO CRM Wave 1',
    requestType: 'improvement',
    scopeType: 'partial',
    priority: 'medium',
    desiredLiveDate: '2026-05-30T00:00:00.000Z',
    brief: 'Track campaign change history, approval owners, and rollback notes for operational governance.',
    status: 'approved',
    backendStartDate: '2026-04-08T00:00:00.000Z',
    backendEndDate: '2026-05-02T00:00:00.000Z',
    frontendStartDate: '2026-04-20T00:00:00.000Z',
    frontendEndDate: '2026-05-20T00:00:00.000Z',
    businessValueScore: 7,
    userImpactScore: 7,
    urgencyScore: 5,
    valueNote: 'Improves accountability for operational campaign edits.',
    comment: 'Support request attached to the same CRM project.',
  },
  {
    requestCode: 'REQ-FF-001',
    projectCode: 'PRJ-FF-2026-MON',
    requesterTeamCode: 'FF',
    title: 'Monetization package configuration console',
    campaignName: 'FF Monetization Q2',
    requestType: 'feature',
    scopeType: 'full',
    priority: 'critical',
    desiredLiveDate: '2026-04-24T00:00:00.000Z',
    brief: 'Allow ops teams to configure package bundles, pricing windows, and rollout conditions.',
    status: 'uat',
    backendStartDate: '2026-01-22T00:00:00.000Z',
    backendEndDate: '2026-03-02T00:00:00.000Z',
    frontendStartDate: '2026-02-08T00:00:00.000Z',
    frontendEndDate: '2026-04-04T00:00:00.000Z',
    businessValueScore: 10,
    userImpactScore: 9,
    urgencyScore: 9,
    valueNote: 'Direct monetization impact with executive visibility.',
    comment: 'High-priority request near launch readiness.',
  },
  {
    requestCode: 'REQ-FF-002',
    projectCode: 'PRJ-FF-2026-MON',
    requesterTeamCode: 'FF',
    title: 'Refund and rollback audit log',
    campaignName: 'FF Monetization Q2',
    requestType: 'improvement',
    scopeType: 'partial',
    priority: 'high',
    desiredLiveDate: '2026-04-27T00:00:00.000Z',
    brief: 'Add auditability for manual rollback actions and refund decisions during launch support.',
    status: 'in_progress',
    backendStartDate: '2026-03-05T00:00:00.000Z',
    backendEndDate: '2026-04-08T00:00:00.000Z',
    frontendStartDate: '2026-03-18T00:00:00.000Z',
    frontendEndDate: '2026-04-16T00:00:00.000Z',
    businessValueScore: 8,
    userImpactScore: 7,
    urgencyScore: 8,
    valueNote: 'Reduces risk during a sensitive monetization rollout.',
    comment: 'Operational safety request under the same launch project.',
  },
  {
    requestCode: 'REQ-DF-001',
    projectCode: 'PRJ-DF-2026-ACQ',
    requesterTeamCode: 'DF',
    title: 'Acquisition source performance dashboard',
    campaignName: 'DF UA Cockpit',
    requestType: 'feature',
    scopeType: 'full',
    priority: 'high',
    desiredLiveDate: '2026-06-25T00:00:00.000Z',
    brief: 'Consolidate channel-level performance, cost, and conversion tracking into one workspace.',
    status: 'in_progress',
    backendStartDate: '2026-04-05T00:00:00.000Z',
    backendEndDate: '2026-05-20T00:00:00.000Z',
    frontendStartDate: '2026-04-25T00:00:00.000Z',
    frontendEndDate: '2026-06-12T00:00:00.000Z',
    businessValueScore: 8,
    userImpactScore: 8,
    urgencyScore: 6,
    valueNote: 'Improves decision speed for growth managers across paid channels.',
    comment: 'Main delivery request for the DF cockpit.',
  },
  {
    requestCode: 'REQ-DF-002',
    projectCode: 'PRJ-DF-2026-ACQ',
    requesterTeamCode: 'DF',
    title: 'Creative fatigue alerting and recommendation panel',
    campaignName: 'DF UA Cockpit',
    requestType: 'improvement',
    scopeType: 'partial',
    priority: 'medium',
    desiredLiveDate: '2026-07-02T00:00:00.000Z',
    brief: 'Highlight fatigue signals, trend deterioration, and suggested creative rotation actions.',
    status: 'approved',
    backendStartDate: '2026-05-08T00:00:00.000Z',
    backendEndDate: '2026-06-10T00:00:00.000Z',
    frontendStartDate: '2026-05-20T00:00:00.000Z',
    frontendEndDate: '2026-06-25T00:00:00.000Z',
    businessValueScore: 7,
    userImpactScore: 8,
    urgencyScore: 5,
    valueNote: 'Adds optimization guidance without needing extra analyst review.',
    comment: 'Follow-on request linked to the same growth project.',
  },
  {
    requestCode: 'REQ-FCM-001',
    projectCode: 'PRJ-FCM-2026-CAMP',
    requesterTeamCode: 'FCM',
    title: 'Campaign workspace foundation and approval routing',
    campaignName: 'FCM Campaign Workspace',
    requestType: 'feature',
    scopeType: 'full',
    priority: 'high',
    desiredLiveDate: '2026-03-20T00:00:00.000Z',
    brief: 'Centralize campaign setup, approval routing, and readiness views for FCM operations.',
    status: 'live',
    backendStartDate: '2025-12-18T00:00:00.000Z',
    backendEndDate: '2026-01-28T00:00:00.000Z',
    frontendStartDate: '2026-01-05T00:00:00.000Z',
    frontendEndDate: '2026-02-24T00:00:00.000Z',
    businessValueScore: 9,
    userImpactScore: 8,
    urgencyScore: 7,
    valueNote: 'Created the base workspace now used by campaign operations.',
    comment: 'Already-live foundational request for the FCM platform.',
  },
  {
    requestCode: 'REQ-FCM-002',
    projectCode: 'PRJ-FCM-2026-CAMP',
    requesterTeamCode: 'FCM',
    title: 'Campaign launch retrospective and risk trend reporting',
    campaignName: 'FCM Campaign Workspace',
    requestType: 'improvement',
    scopeType: 'partial',
    priority: 'medium',
    desiredLiveDate: '2026-03-24T00:00:00.000Z',
    brief: 'Provide live campaign retrospectives, issue tagging, and reporting views for leadership review.',
    status: 'live',
    backendStartDate: '2026-01-30T00:00:00.000Z',
    backendEndDate: '2026-02-20T00:00:00.000Z',
    frontendStartDate: '2026-02-08T00:00:00.000Z',
    frontendEndDate: '2026-03-10T00:00:00.000Z',
    businessValueScore: 7,
    userImpactScore: 7,
    urgencyScore: 6,
    valueNote: 'Improves post-launch governance and learnings capture.',
    comment: 'Reporting enhancement layered onto the same live project.',
  },
];

const projectEventSeeds: ProjectEventSeed[] = [
  {
    id: 'seed-event-aov-001',
    projectCode: 'PRJ-AOV-2026-OPS',
    requestCode: 'REQ-AOV-001',
    actorEmail: 'pm@garena.vn',
    eventType: 'design_received',
    eventTitle: 'Design package received for release milestone dashboard',
    eventDescription: 'The first dashboard wireframe and interaction flow were delivered by product design.',
    eventAt: '2026-03-26T09:00:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-aov-002',
    projectCode: 'PRJ-AOV-2026-OPS',
    requestCode: 'REQ-AOV-001',
    actorEmail: 'trungkien.tran@garena.vn',
    eventType: 'estimate_done',
    eventTitle: 'Backend and frontend estimates aligned',
    eventDescription: 'Both engineering tracks confirmed feasible scope for the first AOV request.',
    eventAt: '2026-03-29T10:00:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-aov-003',
    projectCode: 'PRJ-AOV-2026-OPS',
    requestCode: 'REQ-AOV-001',
    actorEmail: 'thequang.pham@garena.vn',
    eventType: 'development_started',
    eventTitle: 'AOV release dashboard development started',
    eventAt: '2026-04-03T08:30:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-aov-004',
    projectCode: 'PRJ-AOV-2026-OPS',
    requestCode: 'REQ-AOV-002',
    actorEmail: 'hoanganh.cao@garena.vn',
    eventType: 'frontend_handover',
    eventTitle: 'Monitoring checklist UI handed over for review',
    eventAt: '2026-05-18T11:00:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-fco-001',
    projectCode: 'PRJ-FCO-2026-CRM',
    requestCode: 'REQ-FCO-001',
    actorEmail: 'pm@garena.vn',
    eventType: 'prd_received',
    eventTitle: 'CRM audience segment PRD approved',
    eventAt: '2026-02-25T07:45:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-fco-002',
    projectCode: 'PRJ-FCO-2026-CRM',
    requestCode: 'REQ-FCO-001',
    actorEmail: 'tienhuong.nguyen@garena.vn',
    eventType: 'development_started',
    eventTitle: 'Segment engine development started',
    eventAt: '2026-03-03T09:30:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-fco-003',
    projectCode: 'PRJ-FCO-2026-CRM',
    requestCode: 'REQ-FCO-002',
    actorEmail: 'quochung.tran@garena.vn',
    eventType: 'uat_sent',
    eventTitle: 'Approval trail module sent to UAT',
    eventAt: '2026-05-21T13:30:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-ff-001',
    projectCode: 'PRJ-FF-2026-MON',
    requestCode: 'REQ-FF-001',
    actorEmail: 'anhtu.le@garena.vn',
    eventType: 'backend_handover',
    eventTitle: 'Monetization rule service handed over to frontend',
    eventAt: '2026-03-04T14:15:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-ff-002',
    projectCode: 'PRJ-FF-2026-MON',
    requestCode: 'REQ-FF-001',
    actorEmail: 'caocuong.tran@garena.vn',
    eventType: 'uat_sent',
    eventTitle: 'Monetization console submitted to UAT',
    eventAt: '2026-04-17T15:00:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-ff-003',
    projectCode: 'PRJ-FF-2026-MON',
    requestCode: 'REQ-FF-002',
    actorEmail: 'thedung.nguyen@garena.vn',
    eventType: 'scope_changed',
    eventTitle: 'Audit log scope expanded with refund tagging',
    eventDescription: 'Additional refund classification tags were added after ops review.',
    eventAt: '2026-04-10T10:10:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-df-001',
    projectCode: 'PRJ-DF-2026-ACQ',
    requestCode: 'REQ-DF-001',
    actorEmail: 'ducnam.hoang@garena.vn',
    eventType: 'estimate_done',
    eventTitle: 'Acquisition cockpit estimate finalized',
    eventAt: '2026-04-07T08:20:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-df-002',
    projectCode: 'PRJ-DF-2026-ACQ',
    requestCode: 'REQ-DF-002',
    actorEmail: 'hoanghiep.ta_ctv@garena.vn',
    eventType: 'design_received',
    eventTitle: 'Creative fatigue insight screens received',
    eventAt: '2026-05-12T09:00:00.000Z',
    sourceType: 'seed',
  },
  {
    id: 'seed-event-fcm-001',
    projectCode: 'PRJ-FCM-2026-CAMP',
    requestCode: 'REQ-FCM-001',
    actorEmail: 'tienquang.nguyen@garena.vn',
    eventType: 'live',
    eventTitle: 'Campaign delivery workspace went live',
    eventDescription: 'The shared campaign workspace was launched for operational use.',
    eventAt: '2026-03-21T08:00:00.000Z',
    sourceType: 'seed',
    metadataJson: {
      deploymentWindow: 'morning',
      releaseVersion: '3.0.0',
    },
  },
  {
    id: 'seed-event-fcm-002',
    projectCode: 'PRJ-FCM-2026-CAMP',
    requestCode: 'REQ-FCM-002',
    actorEmail: 'thainam.luong@garena.vn',
    eventType: 'monitoring_started',
    eventTitle: 'Retrospective reporting monitoring enabled',
    eventAt: '2026-03-22T10:00:00.000Z',
    sourceType: 'seed',
  },
];

const assignmentSeeds: AssignmentSeed[] = [
  {
    id: 'seed-assignment-req-aov-001-be',
    requestCode: 'REQ-AOV-001',
    projectCode: 'PRJ-AOV-2026-OPS',
    memberEmail: 'trungkien.tran@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 12,
    actualMd: 8,
    startDate: '2026-03-25T00:00:00.000Z',
    endDate: '2026-04-30T00:00:00.000Z',
    status: 'in_progress',
    note: 'Builds release milestone APIs and blocker aggregation services.',
    discipline: 'backend',
    beProfile: {
      userActions: 10,
      businessLogicComplexity: 4,
      dbTables: 6,
      apis: 5,
      requirementClarity: 4,
      changeFrequency: 3,
      realtime: false,
      timelinePressure: 4,
      note: 'Moderately complex reporting backend with cross-source aggregation.',
    },
  },
  {
    id: 'seed-assignment-req-aov-001-fe',
    requestCode: 'REQ-AOV-001',
    projectCode: 'PRJ-AOV-2026-OPS',
    memberEmail: 'hoanganh.cao@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 10,
    actualMd: 6,
    startDate: '2026-04-05T00:00:00.000Z',
    endDate: '2026-05-16T00:00:00.000Z',
    status: 'in_progress',
    note: 'Owns the main dashboard screens and timeline interactions.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 6,
      layoutComplexity: 4,
      componentReuse: 4,
      responsive: true,
      animationLevel: 2,
      userActions: 8,
      userActionsList: 'filter, sort, drilldown, export, status update',
      apiComplexity: 4,
      clientSideLogic: 4,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 3,
      deviceSupport: 2,
      timelinePressure: 4,
      note: 'High-visibility PM workflow screens.',
    },
  },
  {
    id: 'seed-assignment-req-aov-002-be',
    requestCode: 'REQ-AOV-002',
    projectCode: 'PRJ-AOV-2026-OPS',
    memberEmail: 'thequang.pham@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 7,
    actualMd: 2,
    startDate: '2026-04-18T00:00:00.000Z',
    endDate: '2026-05-08T00:00:00.000Z',
    status: 'planned',
    note: 'Implements monitoring and checklist persistence APIs.',
    discipline: 'backend',
    beProfile: {
      userActions: 5,
      businessLogicComplexity: 3,
      dbTables: 3,
      apis: 3,
      requirementClarity: 4,
      changeFrequency: 2,
      realtime: false,
      timelinePressure: 3,
      note: 'Focused service work with moderate data modeling changes.',
    },
  },
  {
    id: 'seed-assignment-req-aov-002-fe',
    requestCode: 'REQ-AOV-002',
    projectCode: 'PRJ-AOV-2026-OPS',
    memberEmail: 'hoanganh.cao@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 6,
    actualMd: 1,
    startDate: '2026-05-01T00:00:00.000Z',
    endDate: '2026-05-28T00:00:00.000Z',
    status: 'planned',
    note: 'Adds operational checklists and post-live monitoring views.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 3,
      layoutComplexity: 3,
      componentReuse: 5,
      responsive: true,
      animationLevel: 1,
      userActions: 5,
      userActionsList: 'checklist, note, acknowledge',
      apiComplexity: 2,
      clientSideLogic: 3,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 3,
      deviceSupport: 2,
      timelinePressure: 3,
      note: 'Extension flow built on the main AOV project shell.',
    },
  },
  {
    id: 'seed-assignment-req-fco-001-be',
    requestCode: 'REQ-FCO-001',
    projectCode: 'PRJ-FCO-2026-CRM',
    memberEmail: 'tienhuong.nguyen@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 14,
    actualMd: 11,
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-04-18T00:00:00.000Z',
    status: 'in_progress',
    note: 'Leads audience segment engine and approval data model.',
    discipline: 'backend',
    beProfile: {
      userActions: 12,
      businessLogicComplexity: 5,
      dbTables: 8,
      apis: 6,
      requirementClarity: 4,
      changeFrequency: 4,
      realtime: false,
      timelinePressure: 4,
      note: 'Heavy domain logic across segments, eligibility, and campaign sync.',
    },
  },
  {
    id: 'seed-assignment-req-fco-001-fe',
    requestCode: 'REQ-FCO-001',
    projectCode: 'PRJ-FCO-2026-CRM',
    memberEmail: 'quochung.tran@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 11,
    actualMd: 8,
    startDate: '2026-03-20T00:00:00.000Z',
    endDate: '2026-05-10T00:00:00.000Z',
    status: 'in_progress',
    note: 'Builds CRM audience setup and review flows.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 7,
      layoutComplexity: 4,
      componentReuse: 3,
      responsive: true,
      animationLevel: 1,
      userActions: 9,
      userActionsList: 'create segment, rule builder, preview, approve',
      apiComplexity: 4,
      clientSideLogic: 5,
      heavyAssets: false,
      uiClarity: 3,
      specChangeRisk: 4,
      deviceSupport: 2,
      timelinePressure: 4,
      note: 'Interactive rule-builder style UI.',
    },
  },
  {
    id: 'seed-assignment-req-fco-002-be',
    requestCode: 'REQ-FCO-002',
    projectCode: 'PRJ-FCO-2026-CRM',
    memberEmail: 'tienhuong.nguyen@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 6,
    actualMd: 3,
    startDate: '2026-04-08T00:00:00.000Z',
    endDate: '2026-05-02T00:00:00.000Z',
    status: 'in_progress',
    note: 'Extends audit event model and approval history APIs.',
    discipline: 'backend',
    beProfile: {
      userActions: 4,
      businessLogicComplexity: 3,
      dbTables: 4,
      apis: 3,
      requirementClarity: 5,
      changeFrequency: 2,
      realtime: false,
      timelinePressure: 3,
      note: 'Contained backend enhancement on top of the main CRM request.',
    },
  },
  {
    id: 'seed-assignment-req-fco-002-fe',
    requestCode: 'REQ-FCO-002',
    projectCode: 'PRJ-FCO-2026-CRM',
    memberEmail: 'conghoang.bui_ctv@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 5,
    actualMd: 2,
    startDate: '2026-04-20T00:00:00.000Z',
    endDate: '2026-05-20T00:00:00.000Z',
    status: 'planned',
    note: 'Implements campaign change timeline and approval drawer UI.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 3,
      layoutComplexity: 2,
      componentReuse: 4,
      responsive: true,
      animationLevel: 1,
      userActions: 5,
      userActionsList: 'review, compare, acknowledge',
      apiComplexity: 2,
      clientSideLogic: 2,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 2,
      deviceSupport: 2,
      timelinePressure: 3,
      note: 'Lean extension to the CRM console.',
    },
  },
  {
    id: 'seed-assignment-req-ff-001-be',
    requestCode: 'REQ-FF-001',
    projectCode: 'PRJ-FF-2026-MON',
    memberEmail: 'anhtu.le@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 15,
    actualMd: 14,
    startDate: '2026-01-22T00:00:00.000Z',
    endDate: '2026-03-02T00:00:00.000Z',
    status: 'done',
    note: 'Delivered package rule service and pricing validation.',
    discipline: 'backend',
    beProfile: {
      userActions: 11,
      businessLogicComplexity: 5,
      dbTables: 7,
      apis: 6,
      requirementClarity: 4,
      changeFrequency: 4,
      realtime: true,
      timelinePressure: 5,
      note: 'Critical path service with pricing constraints and launch guardrails.',
    },
  },
  {
    id: 'seed-assignment-req-ff-001-fe',
    requestCode: 'REQ-FF-001',
    projectCode: 'PRJ-FF-2026-MON',
    memberEmail: 'caocuong.tran@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 13,
    actualMd: 12,
    startDate: '2026-02-08T00:00:00.000Z',
    endDate: '2026-04-04T00:00:00.000Z',
    status: 'done',
    note: 'Built monetization package console and review panels.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 8,
      layoutComplexity: 4,
      componentReuse: 3,
      responsive: true,
      animationLevel: 2,
      userActions: 10,
      userActionsList: 'configure, preview, rollback, compare',
      apiComplexity: 4,
      clientSideLogic: 5,
      heavyAssets: true,
      uiClarity: 3,
      specChangeRisk: 4,
      deviceSupport: 2,
      timelinePressure: 5,
      note: 'Critical revenue operation UI with many state transitions.',
    },
  },
  {
    id: 'seed-assignment-req-ff-002-be',
    requestCode: 'REQ-FF-002',
    projectCode: 'PRJ-FF-2026-MON',
    memberEmail: 'thedung.nguyen@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 7,
    actualMd: 5,
    startDate: '2026-03-05T00:00:00.000Z',
    endDate: '2026-04-08T00:00:00.000Z',
    status: 'in_progress',
    note: 'Adds refund tagging and rollback tracking endpoints.',
    discipline: 'backend',
    beProfile: {
      userActions: 5,
      businessLogicComplexity: 4,
      dbTables: 4,
      apis: 3,
      requirementClarity: 3,
      changeFrequency: 4,
      realtime: false,
      timelinePressure: 4,
      note: 'Ops safety request with evolving scope.',
    },
  },
  {
    id: 'seed-assignment-req-ff-002-fe',
    requestCode: 'REQ-FF-002',
    projectCode: 'PRJ-FF-2026-MON',
    memberEmail: 'caocuong.tran@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 4,
    actualMd: 3,
    startDate: '2026-03-18T00:00:00.000Z',
    endDate: '2026-04-16T00:00:00.000Z',
    status: 'in_progress',
    note: 'Adds refund reason capture and audit history UI.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 2,
      layoutComplexity: 2,
      componentReuse: 5,
      responsive: true,
      animationLevel: 1,
      userActions: 4,
      userActionsList: 'view audit, filter, compare changes',
      apiComplexity: 2,
      clientSideLogic: 2,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 3,
      deviceSupport: 2,
      timelinePressure: 4,
      note: 'Lightweight enhancement in a high-pressure release window.',
    },
  },
  {
    id: 'seed-assignment-req-df-001-be',
    requestCode: 'REQ-DF-001',
    projectCode: 'PRJ-DF-2026-ACQ',
    memberEmail: 'ducnam.hoang@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 10,
    actualMd: 4,
    startDate: '2026-04-05T00:00:00.000Z',
    endDate: '2026-05-20T00:00:00.000Z',
    status: 'in_progress',
    note: 'Builds channel ingestion and acquisition performance APIs.',
    discipline: 'backend',
    beProfile: {
      userActions: 8,
      businessLogicComplexity: 4,
      dbTables: 5,
      apis: 4,
      requirementClarity: 4,
      changeFrequency: 3,
      realtime: false,
      timelinePressure: 3,
      note: 'Analytics-focused backend with ingestion and trend computation.',
    },
  },
  {
    id: 'seed-assignment-req-df-001-fe',
    requestCode: 'REQ-DF-001',
    projectCode: 'PRJ-DF-2026-ACQ',
    memberEmail: 'hoanghiep.ta_ctv@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 9,
    actualMd: 2,
    startDate: '2026-04-25T00:00:00.000Z',
    endDate: '2026-06-12T00:00:00.000Z',
    status: 'in_progress',
    note: 'Owns acquisition source dashboard and filter workspace.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 5,
      layoutComplexity: 3,
      componentReuse: 4,
      responsive: true,
      animationLevel: 1,
      userActions: 7,
      userActionsList: 'filter, group, compare trend, export',
      apiComplexity: 3,
      clientSideLogic: 4,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 3,
      deviceSupport: 2,
      timelinePressure: 3,
      note: 'Dashboard-style interface for growth stakeholders.',
    },
  },
  {
    id: 'seed-assignment-req-df-002-be',
    requestCode: 'REQ-DF-002',
    projectCode: 'PRJ-DF-2026-ACQ',
    memberEmail: 'ductrong.duong@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 6,
    actualMd: 0,
    startDate: '2026-05-08T00:00:00.000Z',
    endDate: '2026-06-10T00:00:00.000Z',
    status: 'planned',
    note: 'Implements fatigue heuristics and recommendation service.',
    discipline: 'backend',
    beProfile: {
      userActions: 4,
      businessLogicComplexity: 3,
      dbTables: 3,
      apis: 3,
      requirementClarity: 3,
      changeFrequency: 3,
      realtime: false,
      timelinePressure: 2,
      note: 'Moderate complexity feature relying on upstream analytics.',
    },
  },
  {
    id: 'seed-assignment-req-df-002-fe',
    requestCode: 'REQ-DF-002',
    projectCode: 'PRJ-DF-2026-ACQ',
    memberEmail: 'hoanghiep.ta_ctv@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 5,
    actualMd: 0,
    startDate: '2026-05-20T00:00:00.000Z',
    endDate: '2026-06-25T00:00:00.000Z',
    status: 'planned',
    note: 'Builds insight cards and fatigue recommendation panels.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 3,
      layoutComplexity: 3,
      componentReuse: 4,
      responsive: true,
      animationLevel: 1,
      userActions: 4,
      userActionsList: 'view fatigue, compare creative trend',
      apiComplexity: 2,
      clientSideLogic: 3,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 2,
      deviceSupport: 2,
      timelinePressure: 2,
      note: 'Small feature module on top of the main cockpit.',
    },
  },
  {
    id: 'seed-assignment-req-fcm-001-be',
    requestCode: 'REQ-FCM-001',
    projectCode: 'PRJ-FCM-2026-CAMP',
    memberEmail: 'tienquang.nguyen@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 12,
    actualMd: 12,
    startDate: '2025-12-18T00:00:00.000Z',
    endDate: '2026-01-28T00:00:00.000Z',
    status: 'done',
    note: 'Delivered workflow engine and approval routing APIs.',
    discipline: 'backend',
    beProfile: {
      userActions: 9,
      businessLogicComplexity: 4,
      dbTables: 6,
      apis: 5,
      requirementClarity: 4,
      changeFrequency: 3,
      realtime: false,
      timelinePressure: 3,
      note: 'Foundation backend for campaign workflow execution.',
    },
  },
  {
    id: 'seed-assignment-req-fcm-001-fe',
    requestCode: 'REQ-FCM-001',
    projectCode: 'PRJ-FCM-2026-CAMP',
    memberEmail: 'thainam.luong@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 10,
    actualMd: 10,
    startDate: '2026-01-05T00:00:00.000Z',
    endDate: '2026-02-24T00:00:00.000Z',
    status: 'done',
    note: 'Built campaign workspace shell and routing UI.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 5,
      layoutComplexity: 3,
      componentReuse: 5,
      responsive: true,
      animationLevel: 1,
      userActions: 7,
      userActionsList: 'create campaign, submit approval, review status',
      apiComplexity: 3,
      clientSideLogic: 3,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 2,
      deviceSupport: 2,
      timelinePressure: 3,
      note: 'Foundation UI with reusable workflow components.',
    },
  },
  {
    id: 'seed-assignment-req-fcm-002-be',
    requestCode: 'REQ-FCM-002',
    projectCode: 'PRJ-FCM-2026-CAMP',
    memberEmail: 'tienquang.nguyen@garena.vn',
    roleType: 'backend_dev',
    plannedMd: 5,
    actualMd: 5,
    startDate: '2026-01-30T00:00:00.000Z',
    endDate: '2026-02-20T00:00:00.000Z',
    status: 'done',
    note: 'Implemented reporting and retrospective summary APIs.',
    discipline: 'backend',
    beProfile: {
      userActions: 4,
      businessLogicComplexity: 3,
      dbTables: 2,
      apis: 2,
      requirementClarity: 5,
      changeFrequency: 2,
      realtime: false,
      timelinePressure: 2,
      note: 'Contained reporting extension over live workflow data.',
    },
  },
  {
    id: 'seed-assignment-req-fcm-002-fe',
    requestCode: 'REQ-FCM-002',
    projectCode: 'PRJ-FCM-2026-CAMP',
    memberEmail: 'thainam.luong@garena.vn',
    roleType: 'frontend_dev',
    plannedMd: 4,
    actualMd: 4,
    startDate: '2026-02-08T00:00:00.000Z',
    endDate: '2026-03-10T00:00:00.000Z',
    status: 'done',
    note: 'Adds leadership reporting cards and retrospective list views.',
    discipline: 'frontend',
    feProfile: {
      screensViews: 3,
      layoutComplexity: 2,
      componentReuse: 5,
      responsive: true,
      animationLevel: 1,
      userActions: 4,
      userActionsList: 'view trend, open retrospective, export',
      apiComplexity: 2,
      clientSideLogic: 2,
      heavyAssets: false,
      uiClarity: 4,
      specChangeRisk: 2,
      deviceSupport: 2,
      timelinePressure: 2,
      note: 'Low-risk reporting enhancement on a live product.',
    },
  },
];

const allocationSeeds: AllocationSeed[] = [
  {
    id: 'seed-allocation-aov-be-primary',
    memberEmail: 'trungkien.tran@garena.vn',
    projectCode: 'PRJ-AOV-2026-OPS',
    roleType: 'backend_dev',
    allocationPct: 70,
    plannedMd: 15,
    actualMd: 8,
    startDate: '2026-03-25T00:00:00.000Z',
    endDate: '2026-05-10T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Primary backend owner for the AOV release program.',
  },
  {
    id: 'seed-allocation-aov-fe-primary',
    memberEmail: 'hoanganh.cao@garena.vn',
    projectCode: 'PRJ-AOV-2026-OPS',
    roleType: 'frontend_dev',
    allocationPct: 65,
    plannedMd: 14,
    actualMd: 7,
    startDate: '2026-04-05T00:00:00.000Z',
    endDate: '2026-05-28T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Main frontend owner for the AOV dashboard and monitoring flows.',
  },
  {
    id: 'seed-allocation-aov-be-secondary',
    memberEmail: 'thequang.pham@garena.vn',
    projectCode: 'PRJ-AOV-2026-OPS',
    roleType: 'backend_dev',
    allocationPct: 35,
    plannedMd: 7,
    actualMd: 2,
    startDate: '2026-04-18T00:00:00.000Z',
    endDate: '2026-05-08T00:00:00.000Z',
    priorityWeight: 4,
    isPrimary: false,
    note: 'Support backend owner for monitoring and checklist work.',
  },
  {
    id: 'seed-allocation-fco-be-primary',
    memberEmail: 'tienhuong.nguyen@garena.vn',
    projectCode: 'PRJ-FCO-2026-CRM',
    roleType: 'backend_dev',
    allocationPct: 80,
    plannedMd: 18,
    actualMd: 12,
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-05-02T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Core backend owner for CRM segmentation and audit flows.',
  },
  {
    id: 'seed-allocation-fco-fe-primary',
    memberEmail: 'quochung.tran@garena.vn',
    projectCode: 'PRJ-FCO-2026-CRM',
    roleType: 'frontend_dev',
    allocationPct: 70,
    plannedMd: 11,
    actualMd: 8,
    startDate: '2026-03-20T00:00:00.000Z',
    endDate: '2026-05-10T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Primary frontend owner for the CRM console.',
  },
  {
    id: 'seed-allocation-fco-fe-secondary',
    memberEmail: 'conghoang.bui_ctv@garena.vn',
    projectCode: 'PRJ-FCO-2026-CRM',
    roleType: 'frontend_dev',
    allocationPct: 30,
    plannedMd: 5,
    actualMd: 2,
    startDate: '2026-04-20T00:00:00.000Z',
    endDate: '2026-05-20T00:00:00.000Z',
    priorityWeight: 3,
    isPrimary: false,
    note: 'Secondary FE support for the approval trail module.',
  },
  {
    id: 'seed-allocation-ff-be-primary',
    memberEmail: 'anhtu.le@garena.vn',
    projectCode: 'PRJ-FF-2026-MON',
    roleType: 'backend_dev',
    allocationPct: 75,
    plannedMd: 15,
    actualMd: 14,
    startDate: '2026-01-22T00:00:00.000Z',
    endDate: '2026-04-08T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Primary backend owner for the FF monetization release.',
  },
  {
    id: 'seed-allocation-ff-fe-primary',
    memberEmail: 'caocuong.tran@garena.vn',
    projectCode: 'PRJ-FF-2026-MON',
    roleType: 'frontend_dev',
    allocationPct: 80,
    plannedMd: 14,
    actualMd: 13,
    startDate: '2026-02-08T00:00:00.000Z',
    endDate: '2026-04-16T00:00:00.000Z',
    priorityWeight: 5,
    isPrimary: true,
    note: 'Primary frontend owner for monetization control screens.',
  },
  {
    id: 'seed-allocation-df-be-primary',
    memberEmail: 'ducnam.hoang@garena.vn',
    projectCode: 'PRJ-DF-2026-ACQ',
    roleType: 'backend_dev',
    allocationPct: 60,
    plannedMd: 10,
    actualMd: 4,
    startDate: '2026-04-05T00:00:00.000Z',
    endDate: '2026-06-14T00:00:00.000Z',
    priorityWeight: 4,
    isPrimary: true,
    note: 'Primary backend owner for acquisition analytics.',
  },
  {
    id: 'seed-allocation-df-be-secondary',
    memberEmail: 'ductrong.duong@garena.vn',
    projectCode: 'PRJ-DF-2026-ACQ',
    roleType: 'backend_dev',
    allocationPct: 35,
    plannedMd: 6,
    actualMd: 0,
    startDate: '2026-05-08T00:00:00.000Z',
    endDate: '2026-06-10T00:00:00.000Z',
    priorityWeight: 3,
    isPrimary: false,
    note: 'Planned backend support for recommendation engine work.',
  },
  {
    id: 'seed-allocation-df-fe-primary',
    memberEmail: 'hoanghiep.ta_ctv@garena.vn',
    projectCode: 'PRJ-DF-2026-ACQ',
    roleType: 'frontend_dev',
    allocationPct: 55,
    plannedMd: 9,
    actualMd: 2,
    startDate: '2026-04-25T00:00:00.000Z',
    endDate: '2026-06-25T00:00:00.000Z',
    priorityWeight: 4,
    isPrimary: true,
    note: 'Frontend owner for the growth dashboard workspace.',
  },
  {
    id: 'seed-allocation-fcm-be-primary',
    memberEmail: 'tienquang.nguyen@garena.vn',
    projectCode: 'PRJ-FCM-2026-CAMP',
    roleType: 'backend_dev',
    allocationPct: 45,
    plannedMd: 12,
    actualMd: 12,
    startDate: '2025-12-18T00:00:00.000Z',
    endDate: '2026-02-20T00:00:00.000Z',
    priorityWeight: 4,
    isPrimary: true,
    note: 'Foundational backend owner for the live FCM workspace.',
  },
  {
    id: 'seed-allocation-fcm-fe-primary',
    memberEmail: 'thainam.luong@garena.vn',
    projectCode: 'PRJ-FCM-2026-CAMP',
    roleType: 'frontend_dev',
    allocationPct: 50,
    plannedMd: 10,
    actualMd: 10,
    startDate: '2026-01-05T00:00:00.000Z',
    endDate: '2026-03-10T00:00:00.000Z',
    priorityWeight: 4,
    isPrimary: true,
    note: 'Primary frontend owner for the live campaign workspace.',
  },
];

const incidentSeeds: IncidentSeed[] = [
  {
    incidentCode: 'INC-FF-001',
    projectCode: 'PRJ-FF-2026-MON',
    foundAt: '2026-04-12T10:20:00.000Z',
    severity: 'high',
    domain: 'payment',
    impactDescription: 'Rollback actions were not consistently reflected in the monetization review dashboard.',
    resolvers: 'Anhtu Le, Caocuong Tran',
    background: 'Issue discovered during pre-UAT signoff when rollback simulation returned stale state.',
    solution: 'Cache invalidation and reconciliation endpoint were patched for rollback actions.',
    processingMinutes: 145,
    tag: 'release_risk',
    status: 'resolved',
    ownerEmail: 'anhtu.le@garena.vn',
  },
  {
    incidentCode: 'INC-AOV-001',
    projectCode: 'PRJ-AOV-2026-OPS',
    foundAt: '2026-05-05T08:45:00.000Z',
    severity: 'medium',
    domain: 'reporting',
    impactDescription: 'Milestone delay flag did not update after approval changes in one workflow path.',
    resolvers: 'Trungkien Tran, Hoanganh Cao',
    background: 'Triggered after PMs changed approval owners on an active release.',
    solution: 'Recomputed milestone summary after approval mutation and added regression coverage.',
    processingMinutes: 95,
    tag: 'dashboard_logic',
    status: 'monitoring',
    ownerEmail: 'trungkien.tran@garena.vn',
  },
  {
    incidentCode: 'INC-FCM-001',
    projectCode: 'PRJ-FCM-2026-CAMP',
    foundAt: '2026-03-24T09:15:00.000Z',
    severity: 'low',
    domain: 'workflow',
    impactDescription: 'A small set of campaign retrospective rows were duplicated in the reporting view.',
    resolvers: 'Tienquang Nguyen',
    background: 'Observed shortly after launch during weekly ops review.',
    solution: 'Deduplicated retrospective records by campaign and deployment window.',
    processingMinutes: 40,
    tag: 'post_live',
    status: 'resolved',
    ownerEmail: 'tienquang.nguyen@garena.vn',
  },
];

const artifactSeeds: ArtifactSeed[] = [
  {
    id: 'seed-artifact-aov-prd',
    projectCode: 'PRJ-AOV-2026-OPS',
    artifactType: 'prd',
    title: 'AOV release dashboard PRD summary',
    contentText:
      'This artifact captures the release dashboard goals, milestone visibility requirements, blocker taxonomy, and approval checkpoints for seasonal launches.',
    uploadedBy: 'pm@garena.vn',
    isFinal: true,
  },
  {
    id: 'seed-artifact-aov-design',
    projectCode: 'PRJ-AOV-2026-OPS',
    artifactType: 'design',
    title: 'AOV monitoring and milestone design',
    fileUrl: 'https://drive.example.com/aov-liveops-design-v3',
    mimeType: 'application/pdf',
    uploadedBy: 'hoanganh.cao@garena.vn',
    isFinal: false,
  },
  {
    id: 'seed-artifact-fco-estimation',
    projectCode: 'PRJ-FCO-2026-CRM',
    artifactType: 'estimate',
    title: 'FCO CRM effort breakdown',
    contentText:
      'Estimated effort includes audience engine backend, segment builder frontend, approval history, and rollout safeguards.',
    uploadedBy: 'tienhuong.nguyen@garena.vn',
    isFinal: true,
  },
  {
    id: 'seed-artifact-ff-runbook',
    projectCode: 'PRJ-FF-2026-MON',
    artifactType: 'runbook',
    title: 'FF monetization launch runbook',
    fileUrl: 'https://docs.example.com/ff-monetization-runbook',
    mimeType: 'text/html',
    uploadedBy: 'anhtu.le@garena.vn',
    isFinal: true,
  },
  {
    id: 'seed-artifact-fcm-retro',
    projectCode: 'PRJ-FCM-2026-CAMP',
    artifactType: 'retro',
    title: 'FCM launch retrospective highlights',
    contentText:
      'Launch retrospective highlights stable approval flows, faster campaign onboarding, and one low-severity duplicate reporting issue after go-live.',
    uploadedBy: 'thainam.luong@garena.vn',
    isFinal: true,
  },
];

const leaveSeeds: LeaveSeed[] = [
  {
    id: 'seed-leave-hoanganh-apr',
    memberEmail: 'hoanganh.cao@garena.vn',
    leaveType: 'annual',
    startDate: '2026-04-16T00:00:00.000Z',
    endDate: '2026-04-18T00:00:00.000Z',
    note: 'Planned short leave after milestone handoff.',
  },
  {
    id: 'seed-leave-tienhuong-may',
    memberEmail: 'tienhuong.nguyen@garena.vn',
    leaveType: 'annual',
    startDate: '2026-05-11T00:00:00.000Z',
    endDate: '2026-05-12T00:00:00.000Z',
    note: 'Personal leave after CRM backend milestone completion.',
  },
  {
    id: 'seed-leave-thainam-apr',
    memberEmail: 'thainam.luong@garena.vn',
    leaveType: 'sick',
    startDate: '2026-04-14T00:00:00.000Z',
    endDate: '2026-04-14T00:00:00.000Z',
    note: 'One-day sick leave for dashboard availability testing.',
  },
  {
    id: 'seed-leave-ductrong-may',
    memberEmail: 'ductrong.duong@garena.vn',
    leaveType: 'annual',
    startDate: '2026-05-27T00:00:00.000Z',
    endDate: '2026-05-29T00:00:00.000Z',
    note: 'Planned leave before starting DF recommendation sprint.',
  },
];

const requesterOwnerEmailByTeamCode: Record<string, string> = {
  AOV: 'bao.aov@garena.vn',
  FF: 'linh.ff@garena.vn',
  DF: 'phuong.df@garena.vn',
  FCO: 'minh.fco@garena.vn',
  FCM: 'huyen.fcm@garena.vn',
};

function date(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

async function main(): Promise<void> {
  const teams = await Promise.all(
    teamSeeds.map((team) =>
      prisma.team.upsert({
        where: { code: team.code },
        update: {
          name: team.name,
          description: team.description,
        },
        create: team,
      }),
    ),
  );

  const teamByCode = new Map(teams.map((team) => [team.code, team]));

  const permissions = await Promise.all(
    [
      ...permissionModules.flatMap((module) =>
      permissionActions.map((action) =>
        prisma.permission.upsert({
          where: { code: `${module}:${action}` },
          update: {
            description: `${action} access for ${module}`,
          },
          create: {
            module,
            action,
            code: `${module}:${action}`,
            description: `${action} access for ${module}`,
          },
        }),
      ),
      ),
      ...customPermissionSeeds.map((permission) =>
        prisma.permission.upsert({
          where: { code: permission.code },
          update: {
            description: permission.description,
          },
          create: permission,
        }),
      ),
    ],
  );

  const roles = await Promise.all(
    roleSeeds.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
        },
        create: role,
      }),
    ),
  );

  const roleByCode = new Map(roles.map((role) => [role.code, role]));
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  const superAdminRole = roleByCode.get('super_admin');
  const adminRole = roleByCode.get('admin');
  const pmRole = roleByCode.get('pm');
  const devRole = roleByCode.get('dev');
  const requesterRole = roleByCode.get('requester');

  if (!superAdminRole || !adminRole || !pmRole || !devRole || !requesterRole) {
    throw new Error('Required roles were not created');
  }

  await prisma.rolePermission.createMany({
    data: permissions.flatMap((permission) => [
      {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
      {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    ]),
    skipDuplicates: true,
  });

  const pmPermissionCodes = new Set(
    permissions
      .filter(
        (permission) =>
          permission.action === 'view' ||
          ['requests', 'projects', 'allocations', 'incidents', 'artifacts', 'leaves'].includes(
            permission.module,
          ),
      )
      .map((permission) => permission.code),
  );

  const devPermissionCodes = new Set(
    permissions
      .filter(
        (permission) =>
          permission.action === 'view' ||
          (['projects', 'artifacts', 'incidents'].includes(permission.module) &&
            permission.action === 'update'),
      )
      .map((permission) => permission.code),
  );

  await prisma.rolePermission.createMany({
    data: Array.from(pmPermissionCodes)
      .map((permissionCode) => permissionByCode.get(permissionCode))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .map((permission) => ({
        roleId: pmRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: Array.from(devPermissionCodes)
      .map((permissionCode) => permissionByCode.get(permissionCode))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .map((permission) => ({
        roleId: devRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  const requesterPermissionCodes = ['requests:create', 'requests:view_own', 'requests:update_own'];

  await prisma.rolePermission.createMany({
    data: requesterPermissionCodes
      .map((permissionCode) => permissionByCode.get(permissionCode))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .map((permission) => ({
        roleId: requesterRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  const users = await Promise.all(
    userSeeds.map(async (userSeed) => {
      const team = teamByCode.get(userSeed.teamCode);

      if (!team) {
        throw new Error(`Team ${userSeed.teamCode} not found for user ${userSeed.email}`);
      }

      return prisma.user.upsert({
        where: { email: userSeed.email },
        update: {
          displayName: userSeed.displayName,
          teamId: team.id,
          status: 'ACTIVE',
        },
        create: {
          email: userSeed.email,
          displayName: userSeed.displayName,
          teamId: team.id,
          status: 'ACTIVE',
        },
      });
    }),
  );

  const userByEmail = new Map(users.map((user) => [user.email, user]));

  await prisma.userRole.createMany({
    data: userSeeds.flatMap((userSeed) => {
      const user = userByEmail.get(userSeed.email);

      if (!user) {
        throw new Error(`User ${userSeed.email} was not created`);
      }

      return userSeed.roleCodes.map((roleCode) => {
        const role = roleByCode.get(roleCode);

        if (!role) {
          throw new Error(`Role ${roleCode} was not created`);
        }

        return {
          userId: user.id,
          roleId: role.id,
        };
      });
    }),
    skipDuplicates: true,
  });

  const projects = await Promise.all(
    projectSeeds.map(async (projectSeed) => {
      const team = teamByCode.get(projectSeed.teamCode);
      const pmOwner = userByEmail.get(projectSeed.pmEmail);

      if (!team) {
        throw new Error(`Team ${projectSeed.teamCode} not found for project ${projectSeed.projectCode}`);
      }

      if (!pmOwner) {
        throw new Error(`PM owner ${projectSeed.pmEmail} not found for project ${projectSeed.projectCode}`);
      }

      return prisma.project.upsert({
        where: { projectCode: projectSeed.projectCode },
        update: {
          name: projectSeed.name,
          requesterTeamId: team.id,
          pmOwnerId: pmOwner.id,
          projectType: projectSeed.projectType,
          scopeType: projectSeed.scopeType,
          status: projectSeed.status,
          businessPriority: projectSeed.businessPriority,
          riskLevel: projectSeed.riskLevel,
          requestedLiveDate: date(projectSeed.requestedLiveDate),
          plannedStartDate: date(projectSeed.plannedStartDate),
          plannedLiveDate: date(projectSeed.plannedLiveDate),
          actualStartDate: date(projectSeed.actualStartDate),
          actualLiveDate: date(projectSeed.actualLiveDate),
          backendStartDate: date(projectSeed.backendStartDate),
          backendEndDate: date(projectSeed.backendEndDate),
          frontendStartDate: date(projectSeed.frontendStartDate),
          frontendEndDate: date(projectSeed.frontendEndDate),
          currentScopeVersion: projectSeed.currentScopeVersion,
          scopeChangeCount: projectSeed.scopeChangeCount,
          blockerCount: projectSeed.blockerCount,
          chatGroupUrl: projectSeed.chatGroupUrl,
          repoUrl: projectSeed.repoUrl,
          notes: projectSeed.notes,
        },
        create: {
          projectCode: projectSeed.projectCode,
          name: projectSeed.name,
          requesterTeamId: team.id,
          pmOwnerId: pmOwner.id,
          projectType: projectSeed.projectType,
          scopeType: projectSeed.scopeType,
          status: projectSeed.status,
          businessPriority: projectSeed.businessPriority,
          riskLevel: projectSeed.riskLevel,
          requestedLiveDate: date(projectSeed.requestedLiveDate),
          plannedStartDate: date(projectSeed.plannedStartDate),
          plannedLiveDate: date(projectSeed.plannedLiveDate),
          actualStartDate: date(projectSeed.actualStartDate),
          actualLiveDate: date(projectSeed.actualLiveDate),
          backendStartDate: date(projectSeed.backendStartDate),
          backendEndDate: date(projectSeed.backendEndDate),
          frontendStartDate: date(projectSeed.frontendStartDate),
          frontendEndDate: date(projectSeed.frontendEndDate),
          currentScopeVersion: projectSeed.currentScopeVersion,
          scopeChangeCount: projectSeed.scopeChangeCount,
          blockerCount: projectSeed.blockerCount,
          chatGroupUrl: projectSeed.chatGroupUrl,
          repoUrl: projectSeed.repoUrl,
          notes: projectSeed.notes,
        },
      });
    }),
  );

  const projectByCode = new Map(projects.map((project) => [project.projectCode, project]));

  const requests = await Promise.all(
    requestSeeds.map(async (requestSeed) => {
      const team = teamByCode.get(requestSeed.requesterTeamCode);
      const project = projectByCode.get(requestSeed.projectCode);
      const ownerEmail =
        requestSeed.ownerEmail ?? requesterOwnerEmailByTeamCode[requestSeed.requesterTeamCode];
      const ownerUser = ownerEmail ? userByEmail.get(ownerEmail) : undefined;

      if (!team) {
        throw new Error(
          `Requester team ${requestSeed.requesterTeamCode} not found for request ${requestSeed.requestCode}`,
        );
      }

      if (!project) {
        throw new Error(`Project ${requestSeed.projectCode} not found for request ${requestSeed.requestCode}`);
      }

      if (ownerEmail && !ownerUser) {
        throw new Error(`Owner ${ownerEmail} not found for request ${requestSeed.requestCode}`);
      }

      return prisma.request.upsert({
        where: { requestCode: requestSeed.requestCode },
        update: {
          projectId: project.id,
          ownerUserId: ownerUser?.id,
          title: requestSeed.title,
          requesterTeamId: team.id,
          campaignName: requestSeed.campaignName,
          requestType: requestSeed.requestType,
          scopeType: requestSeed.scopeType,
          priority: requestSeed.priority,
          desiredLiveDate: date(requestSeed.desiredLiveDate),
          brief: requestSeed.brief,
          status: requestSeed.status,
          backendStartDate: date(requestSeed.backendStartDate),
          backendEndDate: date(requestSeed.backendEndDate),
          frontendStartDate: date(requestSeed.frontendStartDate),
          frontendEndDate: date(requestSeed.frontendEndDate),
          businessValueScore: requestSeed.businessValueScore,
          userImpactScore: requestSeed.userImpactScore,
          urgencyScore: requestSeed.urgencyScore,
          valueNote: requestSeed.valueNote,
          comment: requestSeed.comment,
        },
        create: {
          requestCode: requestSeed.requestCode,
          projectId: project.id,
          ownerUserId: ownerUser?.id,
          title: requestSeed.title,
          requesterTeamId: team.id,
          campaignName: requestSeed.campaignName,
          requestType: requestSeed.requestType,
          scopeType: requestSeed.scopeType,
          priority: requestSeed.priority,
          desiredLiveDate: date(requestSeed.desiredLiveDate),
          brief: requestSeed.brief,
          status: requestSeed.status,
          backendStartDate: date(requestSeed.backendStartDate),
          backendEndDate: date(requestSeed.backendEndDate),
          frontendStartDate: date(requestSeed.frontendStartDate),
          frontendEndDate: date(requestSeed.frontendEndDate),
          businessValueScore: requestSeed.businessValueScore,
          userImpactScore: requestSeed.userImpactScore,
          urgencyScore: requestSeed.urgencyScore,
          valueNote: requestSeed.valueNote,
          comment: requestSeed.comment,
        },
      });
    }),
  );

  const requestByCode = new Map(requests.map((request) => [request.requestCode, request]));

  for (const eventSeed of projectEventSeeds) {
    const project = projectByCode.get(eventSeed.projectCode);
    const request = eventSeed.requestCode ? requestByCode.get(eventSeed.requestCode) : undefined;
    const actor = eventSeed.actorEmail ? userByEmail.get(eventSeed.actorEmail) : undefined;

    if (!project) {
      throw new Error(`Project ${eventSeed.projectCode} not found for event ${eventSeed.id}`);
    }

    if (eventSeed.requestCode && !request) {
      throw new Error(`Request ${eventSeed.requestCode} not found for event ${eventSeed.id}`);
    }

    if (eventSeed.actorEmail && !actor) {
      throw new Error(`Actor ${eventSeed.actorEmail} not found for event ${eventSeed.id}`);
    }

    await prisma.projectEvent.upsert({
      where: { id: eventSeed.id },
      update: {
        projectId: project.id,
        requestId: request?.id ?? null,
        actorUserId: actor?.id ?? null,
        eventType: eventSeed.eventType,
        eventTitle: eventSeed.eventTitle,
        eventDescription: eventSeed.eventDescription,
        eventAt: new Date(eventSeed.eventAt),
        sourceType: eventSeed.sourceType ?? 'seed',
        metadataJson: eventSeed.metadataJson,
      },
      create: {
        id: eventSeed.id,
        projectId: project.id,
        requestId: request?.id,
        actorUserId: actor?.id,
        eventType: eventSeed.eventType,
        eventTitle: eventSeed.eventTitle,
        eventDescription: eventSeed.eventDescription,
        eventAt: new Date(eventSeed.eventAt),
        sourceType: eventSeed.sourceType ?? 'seed',
        metadataJson: eventSeed.metadataJson,
      },
    });
  }

  for (const assignmentSeed of assignmentSeeds) {
    const project = projectByCode.get(assignmentSeed.projectCode);
    const request = requestByCode.get(assignmentSeed.requestCode);
    const member = userByEmail.get(assignmentSeed.memberEmail);

    if (!project) {
      throw new Error(`Project ${assignmentSeed.projectCode} not found for assignment ${assignmentSeed.id}`);
    }

    if (!request) {
      throw new Error(`Request ${assignmentSeed.requestCode} not found for assignment ${assignmentSeed.id}`);
    }

    if (!member) {
      throw new Error(`Member ${assignmentSeed.memberEmail} not found for assignment ${assignmentSeed.id}`);
    }

    const assignment = await prisma.requestAssignment.upsert({
      where: { id: assignmentSeed.id },
      update: {
        requestId: request.id,
        projectId: project.id,
        memberId: member.id,
        roleType: assignmentSeed.roleType,
        plannedMd: assignmentSeed.plannedMd,
        actualMd: assignmentSeed.actualMd,
        startDate: date(assignmentSeed.startDate),
        endDate: date(assignmentSeed.endDate),
        status: assignmentSeed.status,
        note: assignmentSeed.note,
      },
      create: {
        id: assignmentSeed.id,
        requestId: request.id,
        projectId: project.id,
        memberId: member.id,
        roleType: assignmentSeed.roleType,
        plannedMd: assignmentSeed.plannedMd,
        actualMd: assignmentSeed.actualMd,
        startDate: date(assignmentSeed.startDate),
        endDate: date(assignmentSeed.endDate),
        status: assignmentSeed.status,
        note: assignmentSeed.note,
      },
    });

    if (assignmentSeed.discipline === 'frontend' && assignmentSeed.feProfile) {
      await prisma.requestAssignmentFeProfile.upsert({
        where: { assignmentId: assignment.id },
        update: assignmentSeed.feProfile,
        create: {
          assignmentId: assignment.id,
          ...assignmentSeed.feProfile,
        },
      });
    }

    if (assignmentSeed.discipline === 'backend' && assignmentSeed.beProfile) {
      await prisma.requestAssignmentBeProfile.upsert({
        where: { assignmentId: assignment.id },
        update: assignmentSeed.beProfile,
        create: {
          assignmentId: assignment.id,
          ...assignmentSeed.beProfile,
        },
      });
    }
  }

  for (const allocationSeed of allocationSeeds) {
    const project = projectByCode.get(allocationSeed.projectCode);
    const member = userByEmail.get(allocationSeed.memberEmail);

    if (!project) {
      throw new Error(`Project ${allocationSeed.projectCode} not found for allocation ${allocationSeed.id}`);
    }

    if (!member) {
      throw new Error(`Member ${allocationSeed.memberEmail} not found for allocation ${allocationSeed.id}`);
    }

    await prisma.projectAllocation.upsert({
      where: { id: allocationSeed.id },
      update: {
        memberId: member.id,
        projectId: project.id,
        roleType: allocationSeed.roleType,
        allocationPct: allocationSeed.allocationPct,
        plannedMd: allocationSeed.plannedMd,
        actualMd: allocationSeed.actualMd,
        startDate: new Date(allocationSeed.startDate),
        endDate: new Date(allocationSeed.endDate),
        priorityWeight: allocationSeed.priorityWeight,
        isPrimary: allocationSeed.isPrimary ?? false,
        note: allocationSeed.note,
      },
      create: {
        id: allocationSeed.id,
        memberId: member.id,
        projectId: project.id,
        roleType: allocationSeed.roleType,
        allocationPct: allocationSeed.allocationPct,
        plannedMd: allocationSeed.plannedMd,
        actualMd: allocationSeed.actualMd,
        startDate: new Date(allocationSeed.startDate),
        endDate: new Date(allocationSeed.endDate),
        priorityWeight: allocationSeed.priorityWeight,
        isPrimary: allocationSeed.isPrimary ?? false,
        note: allocationSeed.note,
      },
    });
  }

  for (const incidentSeed of incidentSeeds) {
    const project = projectByCode.get(incidentSeed.projectCode);
    const owner = incidentSeed.ownerEmail ? userByEmail.get(incidentSeed.ownerEmail) : undefined;

    if (!project) {
      throw new Error(`Project ${incidentSeed.projectCode} not found for incident ${incidentSeed.incidentCode}`);
    }

    if (incidentSeed.ownerEmail && !owner) {
      throw new Error(`Owner ${incidentSeed.ownerEmail} not found for incident ${incidentSeed.incidentCode}`);
    }

    await prisma.incident.upsert({
      where: { incidentCode: incidentSeed.incidentCode },
      update: {
        projectId: project.id,
        foundAt: new Date(incidentSeed.foundAt),
        severity: incidentSeed.severity,
        domain: incidentSeed.domain,
        impactDescription: incidentSeed.impactDescription,
        resolvers: incidentSeed.resolvers,
        background: incidentSeed.background,
        solution: incidentSeed.solution,
        processingMinutes: incidentSeed.processingMinutes,
        tag: incidentSeed.tag,
        status: incidentSeed.status,
        ownerMemberId: owner?.id ?? null,
      },
      create: {
        incidentCode: incidentSeed.incidentCode,
        projectId: project.id,
        foundAt: new Date(incidentSeed.foundAt),
        severity: incidentSeed.severity,
        domain: incidentSeed.domain,
        impactDescription: incidentSeed.impactDescription,
        resolvers: incidentSeed.resolvers,
        background: incidentSeed.background,
        solution: incidentSeed.solution,
        processingMinutes: incidentSeed.processingMinutes,
        tag: incidentSeed.tag,
        status: incidentSeed.status,
        ownerMemberId: owner?.id,
      },
    });
  }

  for (const artifactSeed of artifactSeeds) {
    const project = projectByCode.get(artifactSeed.projectCode);
    const uploader = artifactSeed.uploadedBy ? userByEmail.get(artifactSeed.uploadedBy) : undefined;

    if (!project) {
      throw new Error(`Project ${artifactSeed.projectCode} not found for artifact ${artifactSeed.id}`);
    }

    if (artifactSeed.uploadedBy && !uploader) {
      throw new Error(`Uploader ${artifactSeed.uploadedBy} not found for artifact ${artifactSeed.id}`);
    }

    await prisma.projectArtifact.upsert({
      where: { id: artifactSeed.id },
      update: {
        projectId: project.id,
        artifactType: artifactSeed.artifactType,
        title: artifactSeed.title,
        contentText: artifactSeed.contentText,
        fileUrl: artifactSeed.fileUrl,
        mimeType: artifactSeed.mimeType,
        uploadedBy: uploader?.id ?? null,
        isFinal: artifactSeed.isFinal ?? false,
      },
      create: {
        id: artifactSeed.id,
        projectId: project.id,
        artifactType: artifactSeed.artifactType,
        title: artifactSeed.title,
        contentText: artifactSeed.contentText,
        fileUrl: artifactSeed.fileUrl,
        mimeType: artifactSeed.mimeType,
        uploadedBy: uploader?.id,
        isFinal: artifactSeed.isFinal ?? false,
      },
    });
  }

  for (const leaveSeed of leaveSeeds) {
    const member = userByEmail.get(leaveSeed.memberEmail);

    if (!member) {
      throw new Error(`Member ${leaveSeed.memberEmail} not found for leave ${leaveSeed.id}`);
    }

    await prisma.memberLeave.upsert({
      where: { id: leaveSeed.id },
      update: {
        memberId: member.id,
        leaveType: leaveSeed.leaveType,
        startDate: new Date(leaveSeed.startDate),
        endDate: new Date(leaveSeed.endDate),
        note: leaveSeed.note,
      },
      create: {
        id: leaveSeed.id,
        memberId: member.id,
        leaveType: leaveSeed.leaveType,
        startDate: new Date(leaveSeed.startDate),
        endDate: new Date(leaveSeed.endDate),
        note: leaveSeed.note,
      },
    });
  }

  for (const project of projects) {
    const incidentCount = await prisma.incident.count({
      where: {
        projectId: project.id,
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        incidentCount,
      },
    });
  }

  console.log(
    `Seed completed: ${teams.length} teams, ${users.length} users, ${projects.length} projects, ${requests.length} requests.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
