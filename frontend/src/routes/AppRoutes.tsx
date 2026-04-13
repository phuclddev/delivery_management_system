import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { PublicRoute } from '@/auth/PublicRoute';
import { AppLayout } from '@/layouts/AppLayout';
import AllocationsPage from '@/pages/AllocationsPage';
import ArtifactsPage from '@/pages/ArtifactsPage';
import DashboardPage from '@/pages/DashboardPage';
import IncidentsPage from '@/pages/IncidentsPage';
import LeavesPage from '@/pages/LeavesPage';
import LoginPage from '@/pages/LoginPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ReportsPage from '@/pages/ReportsPage';
import RequestsPage from '@/pages/RequestsPage';
import RolesPage from '@/pages/RolesPage';
import UsersPage from '@/pages/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/allocations" element={<AllocationsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/leaves" element={<LeavesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
