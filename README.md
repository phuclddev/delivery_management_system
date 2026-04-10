# Delivery Management Backend

NestJS backend scaffold for the Delivery Management System. This step includes the project foundation only:

- NestJS application structure
- Prisma configured for MySQL
- Initial RBAC schema and migration
- Seed data for admin, teams, roles, and permissions
- Docker Compose for local MySQL
- Swagger, config loading, and validation baseline

Business modules such as requests, projects, allocations, incidents, artifacts, and leaves are intentionally not implemented yet.

## Tech Stack

- Node.js 20+
- NestJS 10
- Prisma
- MySQL 8
- Swagger / OpenAPI

## Project Structure

```text
src/
  config/
  modules/
    auth/
    permissions/
    prisma/
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

For local development, you can also use:

```bash
npm run prisma:migrate
```

6. Seed initial data:

```bash
npm run prisma:seed
```

7. Start the app:

```bash
npm run start:dev
```

## Default Seed Data

- Admin user: `admin@example.com`
- Roles: `admin`, `pm`, `dev`
- Sample teams: `Administration`, `Engineering`
- Permissions: module/action permissions for:
  - `requests`
  - `projects`
  - `allocations`
  - `incidents`
  - `artifacts`
  - `leaves`
  - `users`
  - `roles`
  - `permissions`

Each module gets these actions:

- `view`
- `create`
- `update`
- `delete`
- `manage`

## Available Commands

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

## Notes

- `POST /api/auth/google` and related auth endpoints are scaffolded only, not implemented yet.
- CRUD endpoints for users, teams, roles, and permissions are placeholders to preserve module structure for later implementation.
- Swagger UI will be available at `/api/docs`.
