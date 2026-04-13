# Frontend Spec

## Goal
Build a single internal frontend web app for:
- Admin
- PM
- Dev
- Leaders

## Tech stack
- React
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- Recharts

## Auth
- Login via backend
- JWT-based auth
- Current user endpoint: /auth/me

## Permission model
Use backend RBAC.
Frontend must:
- show/hide menu items by permission
- show/hide create/edit/delete buttons by permission
- block page access if user lacks permission

## Main sections
- Dashboard
- Requests
- Projects
- Allocations
- Incidents
- Artifacts
- Leaves
- Users
- Roles & Permissions
- Reports

## UX priorities
1. Fast data input
2. Easy filtering
3. Clean tables
4. Clear dashboards
5. Role-based visibility

## Dashboard examples
- Team workload
- Personal workload
- Open requests
- Active projects
- Incident trends
- Leave today
- Value vs effort