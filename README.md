# Delivery Management Backend

NestJS backend for the Delivery Management System with Google login, JWT auth, RBAC, Prisma/MySQL persistence, Swagger docs, and the core workload/delivery modules implemented.

## Implemented Modules

- Auth
- Users
- Teams
- Roles
- Permissions
- Requests
- Projects
- Project Events
- Request Assignments
- Project Allocations
- Incidents
- Project Artifacts
- Member Leaves

## Tech Stack

- Node.js 20+
- NestJS 10
- Prisma ORM
- MySQL 8
- Swagger / OpenAPI
- class-validator

## API Conventions

- Base prefix: `/api`
- Swagger UI: `/api/docs`
- Success responses are wrapped as:

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {},
  "timestamp": "2026-04-10T10:00:00.000Z",
  "path": "/api/example"
}
```

- Error responses are wrapped as:

```json
{
  "success": false,
  "message": "Validation failed.",
  "error": "Bad Request",
  "details": [],
  "timestamp": "2026-04-10T10:00:00.000Z",
  "path": "/api/example"
}
```

## Project Structure

```text
src/
  common/
    filters/
    interceptors/
    interfaces/
    swagger/
  config/
  modules/
    auth/
    incidents/
    member-leaves/
    permissions/
    prisma/
    project-allocations/
    project-artifacts/
    project-events/
    projects/
    request-assignments/
    requests/
    roles/
    teams/
    users/
prisma/
  migrations/
  schema.prisma
  seed.ts
test/
```

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

For Google sign-in with the current frontend/backend flow, make sure these backend env vars are set:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id
ALLOWED_GOOGLE_DOMAINS=garena.vn
SUPER_ADMIN_EMAILS=dinhphuc.luu@garena.vn
JWT_SECRET=change-me
DATABASE_URL="mysql://root:root@localhost:3306/delivery_management_system"
```

2. Start MySQL:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Apply migrations:

```bash
npm run prisma:deploy
```

For local iterative development:

```bash
npm run prisma:migrate
```

6. Seed the database:

```bash
npm run prisma:seed
```

7. Start the API:

```bash
npm run start:dev
```

## Seed Data

The seed script creates:

- Teams: `Administration`, `Engineering`, `Project Management`
- Users:
  - `admin@garena.vn`
  - `pm@garena.vn`
  - `dev@garena.vn`
- Roles: `admin`, `pm`, `dev`
- Permissions for:
  - `teams`
  - `requests`
  - `projects`
  - `allocations`
  - `incidents`
  - `artifacts`
  - `leaves`
  - `users`
  - `roles`
  - `permissions`
- Sample domain data:
  - 2 requests linked to 1 project
  - 1 project
  - 2 project events
  - 2 request assignments
  - 1 FE complexity profile
  - 1 BE complexity profile
  - 1 project allocation
  - 1 incident
  - 1 project artifact
  - 1 member leave

Each permission module includes:

- `view`
- `create`
- `update`
- `delete`
- `manage`

## Main Endpoints

- Auth:
  - `POST /api/auth/google`
  - `GET /api/auth/me`
- RBAC:
  - `GET /api/users`
  - `PATCH /api/users/:id/roles`
  - `GET /api/roles`
  - `POST /api/roles`
  - `PATCH /api/roles/:id`
  - `PATCH /api/roles/:id/permissions`
  - `GET /api/permissions`
- Requests / Projects:
  - `GET /api/requests`
  - `POST /api/requests/:id/convert-to-project`
  - `GET /api/projects`
- Project Timeline / Estimation:
  - `GET /api/project-events`
  - `GET /api/project-events/project/:projectId`
  - `GET /api/project-events/request/:requestId`
  - `GET /api/request-assignments`
  - `GET /api/request-assignments/request/:requestId`
  - `GET /api/request-assignments/project/:projectId`
  - `GET /api/request-assignments/member/:memberId`
- Workload Tracking:
  - `GET /api/project-allocations`
  - `GET /api/project-allocations/workload/member/:memberId`
  - `GET /api/project-allocations/utilization/team/:teamId`
- Operations:
  - `GET /api/incidents`
  - `GET /api/project-artifacts`
  - `GET /api/member-leaves`

## Commands

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

## Notes

- Google login expects the frontend Google credential posted to `POST /api/auth/google` as `{ "credential": "<google_id_token>" }`.
- Backend Google token verification uses `GOOGLE_CLIENT_ID`, and it must match the frontend `VITE_GOOGLE_CLIENT_ID`.
- Allowed Google email domains are restricted to `garena.vn` through `ALLOWED_GOOGLE_DOMAINS`.
- `dinhphuc.luu@garena.vn` is automatically ensured to have the `super_admin` role on first login through `SUPER_ADMIN_EMAILS`.
- Failed Google login attempts now log the backend failure reason, including missing backend config, Google verification errors, invalid email verification state, blocked domains, and inactive users.
- For local frontend Google sign-in, `http://localhost:5173` must be added to the Google OAuth client as an Authorized JavaScript origin.
- RBAC is enforced through `@RequirePermission(...)` plus the shared JWT + permissions guards.
- Request validation is applied globally with Nest `ValidationPipe`.
- Database migrations are committed under `prisma/migrations/`.

## Refactor Notes

### New Relation Model

- `projects` are now treated as long-lived delivery/codebase containers.
- `requests.project_id` is the new source of truth for linking requests to projects.
- One project can now own many requests.
- The old `projects.request_id` field has been removed from the schema and backend internals.

### New Modules

- `project-events`
  Timeline/history events across projects and requests.
- `request-assignments`
  Request-level ownership and effort tracking.
- `request_assignment_fe_profiles`
  Frontend complexity breakdown linked 1:1 to an assignment.
- `request_assignment_be_profiles`
  Backend complexity breakdown linked 1:1 to an assignment.

### API Compatibility Behavior

- Request responses expose `projectId` and `project`.
- Project responses expose:
  - `requests`
  - `requestsCount`
  - compatibility field `request`
- `POST /api/requests/:id/convert-to-project` still exists.
  Its behavior is now:
  - attach the request to an existing project if `projectId` is provided
  - otherwise create a new project and attach the request
- `CreateProjectDto.requestId` is now only a compatibility input alias.
  It does not map to a column on `projects`; it simply attaches the referenced request through `requests.project_id`.

### List Endpoint Conventions

- Standardized list endpoints support defensive query parsing.
- Pagination fields:
  - `page`
  - `pageSize`
- Sorting fields:
  - `sortBy`
  - `sortOrder`
- Most list endpoints now also return `meta` with page/sort information.

### Migration Notes

- Phase 1 added `requests.project_id` and backfilled it from existing `projects.request_id`.
- The final cleanup phase removes `projects.request_id` and the old 1:1 relation assumption.
- Frontend or external consumers should now treat:
  - `project.requests` as the canonical project-to-requests relation
  - `request.projectId` / `request.project` as the canonical request-to-project relation
- The compatibility field `project.request` is still returned for older frontend screens that have not yet switched to `project.requests`.
