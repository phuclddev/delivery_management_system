# Frontend

React + TypeScript + Vite frontend for the Delivery Management System.

## Stack

- React
- TypeScript
- Vite
- Ant Design
- React Router
- Axios

## Current Scope

This frontend is scaffolded only. It includes:

- Clean folder structure under `src/`
- Application layout with sidebar and header
- Placeholder pages and routes for:
  - Dashboard
  - Requests
  - Projects
  - Allocations
  - Incidents
  - Artifacts
  - Leaves
  - Users
  - Roles
  - Reports

Authentication is implemented at the frontend shell level using the backend JWT flow and a real Google sign-in button. Real permission-aware menus and page actions can be layered on next.

## Run

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Environment

Create a `.env` file in `/frontend`:

```bash
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id
```

`VITE_API_URL` defaults to `http://localhost:3000/api` if omitted, but `VITE_GOOGLE_CLIENT_ID` is required for Google sign-in.

The frontend Google OAuth client ID must match the backend `GOOGLE_CLIENT_ID`.

## Authentication

- The frontend shows a real Google sign-in button
- Google returns a browser credential / ID token
- The frontend sends `{ "credential": "<google_id_token>" }` to `POST /auth/google`
- The frontend stores the backend JWT in `localStorage`
- Axios automatically sends `Authorization: Bearer <token>`
- Protected routes redirect unauthenticated users to `/login`
- On app load, the frontend calls `GET /auth/me` to restore the session
- Only `@garena.vn` accounts are allowed by the backend
- If backend login fails, the frontend now surfaces the backend error message on the login page
- `http://localhost:5173` must be present in the Google OAuth client Authorized JavaScript origins

## Folder Structure

```text
src/
  api/
  auth/
  components/
  hooks/
  layouts/
  pages/
  routes/
  types/
  utils/
```

## Notes

- This work is limited to `/frontend` only.
- Required frontend Google OAuth env variables:
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_API_URL`
- Required matching backend env variables:
  - `GOOGLE_CLIENT_ID`
  - `ALLOWED_GOOGLE_DOMAINS=garena.vn`
  - `SUPER_ADMIN_EMAILS=dinhphuc.luu@garena.vn`
