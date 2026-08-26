// src/App.jsx — Root component with routing
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import UploadPage from './pages/UploadPage';
import UsersPage from './pages/UsersPage';
import NotFoundPage from './pages/NotFoundPage';
import TicketListPage from './pages/TicketListPage';
import TicketDetailPage from './pages/TicketDetailPage';
import MyTicketsPage from './pages/MyTicketsPage';
import RequesterTicketDetailPage from './pages/RequesterTicketDetailPage';
import LeaveRequestPage from './pages/LeaveRequestPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import AnalyticsPage from './pages/AnalyticsPage';

import LandingPage from './pages/LandingPage';

// Layout
import Layout from './components/Layout/Layout';

/**
 * Guards a route — redirects to /login if not authenticated.
 */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-enter" style={{ padding: '2rem' }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

/**
 * Guards an admin route — redirects to /dashboard if not Admin.
 */
function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'Admin' ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Application Routes */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard"          element={<DashboardPage />} />
        <Route path="documents"          element={<DocumentsPage />} />
        <Route path="documents/:id"      element={<DocumentDetailPage />} />
        <Route path="tickets"            element={<TicketListPage />} />
        <Route path="tickets/:id"        element={<TicketDetailPage />} />
        <Route path="my-tickets"         element={<MyTicketsPage />} />
        <Route path="my-tickets/:id"     element={<RequesterTicketDetailPage />} />
        <Route path="my-submissions"     element={<MySubmissionsPage />} />
        <Route path="leave-request"      element={<LeaveRequestPage />} />
        <Route path="upload"             element={<UploadPage />} />
        <Route path="users"              element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="analytics"          element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
