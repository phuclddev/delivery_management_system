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
    projects/
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
  - `admin@example.com`
  - `pm@example.com`
  - `dev@example.com`
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
  - 1 request
  - 1 project
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

- Google login expects a Google ID token posted to `POST /api/auth/google`.
- Allowed Google email domains are controlled by `ALLOWED_GOOGLE_DOMAINS` in `.env`.
- RBAC is enforced through `@RequirePermission(...)` plus the shared JWT + permissions guards.
- Request validation is applied globally with Nest `ValidationPipe`.
- Database migrations are committed under `prisma/migrations/`.
