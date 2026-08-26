// components/Layout/Topbar.jsx — KMRL DocuSense Page Header Bar
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Topbar.module.css';

const PAGE_TITLES = {
  dashboard:  'Overview',
  documents:  'Documents',
  tickets:    'Tickets',
  upload:     'Upload Document',
  users:      'User Management',
  analytics:  'Analytics',
};

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();

  // Derive section from path
  const section = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  const title   = PAGE_TITLES[section] ?? 'KMRL DocuSense';

  const roleLabel =
    user?.role === 'Admin'
      ? 'Administrator'
      : user?.department
        ? `${user.department} Department`
        : user?.role ?? 'Officer';

  return (
    <header className={styles.topbar}>
      <div className={styles.context}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>KMRL document and workflow management</div>
      </div>

      <div className={styles.right}>
        <span className={styles.rolePill} aria-label={`Role: ${roleLabel}`}>
          {roleLabel}
        </span>
      </div>
    </header>
  );
}
