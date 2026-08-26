// pages/DashboardPage.jsx — KMRL DocuSense · Dashboard overview
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import OfficerDashboard from '../components/Dashboard/OfficerDashboard';
import EmployeeDashboard from '../components/Dashboard/EmployeeDashboard';
import Spinner from '../components/UI/Spinner';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading dashboard…</p>
      </section>
    );
  }

  if (user.role === 'Admin') return <AdminDashboard />;
  if (user.role === 'Viewer') return <EmployeeDashboard />;
  return <OfficerDashboard />;
}
