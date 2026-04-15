export interface TeamSummary {
  id: string;
  code: string;
  name: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  team?: TeamSummary | null;
}

export interface ProjectRequestSummary {
  id: string;
  requestCode: string;
  title: string;
  status?: string | null;
}

export interface RequestProjectSummary {
  id: string;
  projectCode: string;
  name: string;
  status?: string | null;
}

export interface RequestRecord {
  id: string;
  requestCode: string;
  title: string;
  requesterTeam: TeamSummary;
  campaignName?: string | null;
  requestType?: string | null;
  scopeType?: string | null;
  priority?: string | null;
  desiredLiveDate?: string | null;
  brief?: string | null;
  status?: string | null;
  backendStartDate?: string | null;
  backendEndDate?: string | null;
  frontendStartDate?: string | null;
  frontendEndDate?: string | null;
  businessValueScore?: number | null;
  userImpactScore?: number | null;
  urgencyScore?: number | null;
  valueNote?: string | null;
  comment?: string | null;
  projectId?: string | null;
  project?: RequestProjectSummary | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectRecord {
  id: string;
  projectCode: string;
  name: string;
  requesterTeam: TeamSummary;
  pmOwner?: UserSummary | null;
  projectType?: string | null;
  scopeType?: string | null;
  status?: string | null;
  businessPriority?: string | null;
  riskLevel?: string | null;
  requestedLiveDate?: string | null;
  plannedStartDate?: string | null;
  plannedLiveDate?: string | null;
  actualStartDate?: string | null;
  actualLiveDate?: string | null;
  backendStartDate?: string | null;
  backendEndDate?: string | null;
  frontendStartDate?: string | null;
  frontendEndDate?: string | null;
  currentScopeVersion?: string | null;
  scopeChangeCount?: number | null;
  blockerCount?: number | null;
  incidentCount?: number | null;
  chatGroupUrl?: string | null;
  repoUrl?: string | null;
  notes?: string | null;
  requests?: ProjectRequestSummary[] | null;
  requestsCount?: number | null;
  request?: ProjectRequestSummary | null;
  updatedAt?: string | null;
}

export interface ProjectEventRecord {
  id: string;
  project: RequestProjectSummary;
  request?: ProjectRequestSummary | null;
  actorUser?: UserSummary | null;
  eventType: string;
  eventTitle: string;
  eventDescription?: string | null;
  eventAt: string;
  sourceType?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAssignmentFeProfile {
  assignmentId: string;
  screensViews?: number | null;
  layoutComplexity?: number | null;
  componentReuse?: number | null;
  responsive?: boolean | null;
  animationLevel?: number | null;
  userActions?: number | null;
  userActionsList?: string | null;
  apiComplexity?: number | null;
  clientSideLogic?: number | null;
  heavyAssets?: boolean | null;
  uiClarity?: number | null;
  specChangeRisk?: number | null;
  deviceSupport?: number | null;
  timelinePressure?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAssignmentBeProfile {
  assignmentId: string;
  userActions?: number | null;
  businessLogicComplexity?: number | null;
  dbTables?: number | null;
  apis?: number | null;
  requirementClarity?: number | null;
  changeFrequency?: number | null;
  realtime?: boolean | null;
  timelinePressure?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAssignmentSystemProfile {
  assignmentId: string;
  domainComplexity?: number | null;
  integrationCount?: number | null;
  dependencyLevel?: number | null;
  requirementClarity?: number | null;
  unknownFactor?: number | null;
  dataVolume?: number | null;
  scalabilityRequirement?: number | null;
  securityRequirement?: number | null;
  externalApiComplexity?: number | null;
  changeFrequency?: number | null;
  testingComplexity?: number | null;
  timelinePressure?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAssignmentRecord {
  id: string;
  request: ProjectRequestSummary;
  project: RequestProjectSummary & {
    requesterTeam?: TeamSummary | null;
  };
  member: UserSummary;
  roleType: string;
  workType?: string | null;
  uncertaintyLevel?: number | null;
  plannedMd?: number | null;
  actualMd?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  note?: string | null;
  feProfile?: RequestAssignmentFeProfile | null;
  beProfile?: RequestAssignmentBeProfile | null;
  systemProfile?: RequestAssignmentSystemProfile | null;
  createdAt: string;
  updatedAt: string;
}
