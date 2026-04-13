# AGENTS.md

## Repository structure
- Root project is the NestJS backend
- Frontend must be created inside /frontend
- Do not refactor backend structure unless explicitly asked

## Frontend stack
- React
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- Recharts

## Product goal
Build one internal web application for the Delivery Management System.
This is not a separate admin product.
Different users will see different menus and actions based on backend permissions.

## Frontend requirements
- Use backend JWT auth
- Use backend RBAC to control menu visibility and actions
- Keep UI practical, clean, and optimized for internal operations
- Prefer reusable pages and components
- Use tables, filters, forms, drawers, and charts where suitable
- Add README instructions for running frontend

## Safety
- Work only inside /frontend unless explicitly asked
- Do not modify backend APIs unless required and clearly stated

## Backend refactor rules
- Preserve working Google login, JWT auth, and RBAC behavior
- Prefer additive, backward-compatible migrations when possible
- Do not silently remove working endpoints
- If a schema change is breaking, also update Prisma schema, migrations, DTOs, services, controllers, and frontend API expectations
- Keep API behavior stable unless explicitly changed
- Add clear migration notes in README or docs