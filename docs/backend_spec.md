# Backend Spec - Delivery Management System

## 1. Goal
Build a simple backend for an internal delivery management system used by PMs and admins to manage requests, projects, member workload, incidents, leaves, and artifacts.

The backend should:
- support Google login
- support dynamic role/permission-based authorization
- allow admins to configure which users can view or edit which data modules
- provide REST APIs for frontend and BI tools

## 2. Tech Stack
- Language: TypeScript
- Runtime: Node.js 20+
- Framework: NestJS
- Database: MySQL 8
- ORM: Prisma
- Auth: Google OAuth 2.0 + JWT session
- Validation: class-validator or zod
- API style: REST
- Docs: Swagger/OpenAPI
- Migrations: Prisma migrations
- Testing: basic unit tests + e2e tests for auth and RBAC

## 3. Core Modules
The system should include these modules:
- Auth
- Users / Members
- Teams
- Requests
- Projects
- Project Members
- Project Allocations
- Project Events
- Incidents
- Project Artifacts
- Member Leaves
- Roles
- Permissions

## 4. Core Business Requirements

### 4.1 Authentication
- Users login with Google account
- On first login, create user if not exists
- Only approved domains are allowed to sign in
- Backend returns JWT access token and basic user profile

### 4.2 Authorization
Implement dynamic RBAC:
- Admin can create roles
- Admin can assign permissions to roles
- Admin can assign roles to users
- Permission model should support module-level actions:
  - view
  - create
  - update
  - delete
  - manage
- Example modules:
  - requests
  - projects
  - allocations
  - incidents
  - artifacts
  - leaves
  - users
  - roles
  - permissions

### 4.3 Requests
Store incoming requester demand:
- request_code
- title
- requester_team_id
- campaign_name
- request_type
- scope_type
- priority
- desired_live_date
- brief
- status
- backend_start_date
- backend_end_date
- frontend_start_date
- frontend_end_date
- business_value_score
- user_impact_score
- urgency_score
- value_note
- comment

### 4.4 Projects
Each request can become a project.
Store:
- project_code
- request_id
- name
- requester_team_id
- pm_owner_id
- project_type
- scope_type
- status
- business_priority
- risk_level
- requested_live_date
- planned_start_date
- planned_live_date
- actual_start_date
- actual_live_date
- backend_start_date
- backend_end_date
- frontend_start_date
- frontend_end_date
- current_scope_version
- scope_change_count
- blocker_count
- incident_count
- chat_group_url
- repo_url
- notes

### 4.5 Allocations
Track member workload over time:
- member_id
- project_id
- role_type
- allocation_pct
- planned_md
- actual_md
- start_date
- end_date
- priority_weight
- is_primary
- note

### 4.6 Incidents
Track incidents:
- incident_code
- project_id
- found_at
- severity
- domain
- impact_description
- resolvers
- background
- solution
- processing_minutes
- tag
- status
- owner_member_id

### 4.7 Artifacts
Store project-related text or file references:
- project_id
- artifact_type
- title
- content_text
- file_url
- mime_type
- uploaded_by
- is_final

Use this table for:
- PRD short text
- event rules
- screenshots
- release notes
- design notes

### 4.8 Leaves
Track member leave periods:
- member_id
- leave_type
- start_date
- end_date
- note

## 5. Required APIs for MVP

### Auth
- POST /auth/google
- GET /auth/me

### Users / Roles / Permissions
- GET /users
- GET /users/:id
- PATCH /users/:id/roles
- GET /roles
- POST /roles
- PATCH /roles/:id
- GET /permissions
- PATCH /roles/:id/permissions

### Teams
- CRUD teams

### Requests
- CRUD requests
- list with filters: team, type, priority, status, date range

### Projects
- CRUD projects
- list with filters
- endpoint to convert request -> project

### Project Allocations
- CRUD allocations
- endpoint to get workload by member and date range
- endpoint to get team utilization by date range

### Incidents
- CRUD incidents
- filters by severity, project, date range

### Artifacts
- CRUD artifacts
- support text-only records and URL-based file records

### Leaves
- CRUD leaves
- endpoint to check who is on leave in a date range

## 6. Non-functional Requirements
- Use environment variables for config
- Add Swagger docs
- Add DB migrations
- Add seed data for:
  - admin user
  - sample teams
  - sample roles
  - sample permissions
- Add request validation
- Add error handling with standard response format
- Add audit fields: created_at, updated_at
- Use soft delete only if really necessary; otherwise use hard delete for MVP

## 7. Authorization Rules
- Admin has full access
- PM can manage requests, projects, allocations, artifacts, incidents
- FE/BE members can view projects assigned to them and update allowed modules
- Permission checks must be reusable via guards/middleware

## 8. Implementation Order
1. Scaffold project
2. Prisma schema and migrations
3. Google auth + JWT
4. Roles/permissions/RBAC guard
5. Teams/users
6. Requests/projects
7. Allocations
8. Incidents
9. Artifacts
10. Leaves
11. Swagger
12. Seed data
13. Basic tests

## 9. Acceptance Criteria
The backend is considered done for MVP if:
- user can login with Google
- admin can create roles and assign permissions dynamically
- RBAC is enforced on all protected APIs
- CRUD works for requests, projects, allocations, incidents, artifacts, leaves
- Swagger is available
- Prisma migrations run successfully
- seed script creates initial admin/roles/permissions
- project starts with docker-compose for MySQL and local dev
- README explains setup and commands