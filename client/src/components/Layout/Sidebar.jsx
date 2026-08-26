// components/Layout/Sidebar.jsx — KMRL DocuSense App Shell Navigation
import { NavLink, useNavigate } from 'react-router-dom';
import {
  RiDashboardLine,
  RiFileList3Line,
  RiUpload2Line,
  RiGroupLine,
  RiTicketLine,
  RiBarChartBoxLine,
  RiLogoutBoxLine,
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

// Navigation items for Department Officers and Admin
const officerNavItems = [
  { to: '/dashboard', icon: RiDashboardLine,    label: 'Overview' },
  { to: '/documents', icon: RiFileList3Line,    label: 'Documents' },
  { to: '/tickets',   icon: RiTicketLine,       label: 'Tickets' },
  { to: '/upload',    icon: RiUpload2Line,       label: 'Upload' },
  { to: '/users',     icon: RiGroupLine,         label: 'Users',     admin: true },
  { to: '/analytics', icon: RiBarChartBoxLine,   label: 'Analytics', admin: true },
];

// Navigation items for Employees/Requesters (Viewer role)
const requesterNavItems = [
  { to: '/dashboard', icon: RiDashboardLine,    label: 'My Dashboard' },
  { to: '/my-tickets', icon: RiTicketLine,      label: 'My Tickets' },
  { to: '/my-submissions', icon: RiFileList3Line,    label: 'My Submissions' },
  { to: '/documents', icon: RiFileList3Line,    label: 'My Documents' },
  { to: '/upload',    icon: RiUpload2Line,      label: 'New Request' },
];

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Select nav items based on user role
  const isRequester = user?.role === 'Viewer';
  const navItems = isRequester ? requesterNavItems : officerNavItems;
  const visibleItems = navItems.filter(item => !item.admin || user?.role === 'Admin');

  const roleLabel =
    user?.role === 'Admin'
      ? 'Administrator'
      : user?.role === 'Viewer'
        ? 'Employee'
        : user?.department
          ? `${user.department} Dept`
          : user?.role ?? 'Officer';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={styles.sidebar} aria-label="Main navigation">

      {/* ── Brand / Product Identity ─────────────────────── */}
      <div className={styles.brand}>
        <div className={styles.brandTop}>
          {/* Metro route-line dot motif near brand */}
          <div className={styles.brandMark}>
            <div className={styles.brandDot} />
            <div className={styles.brandLine} />
          </div>

          <div className={styles.brandText}>
            <div className={styles.brandTitle}>KMRL DocuSense</div>
            <div className={styles.brandSub}>
              {isRequester ? 'My Requests' : 'Operations Workspace'}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative route-line strip ─────────────────────── */}
      <div className={styles.brandRoute} aria-hidden="true">
        <div className={`${styles.routeStop} ${styles.routeStopActive}`} />
        <div className={styles.routeSegment} />
        <div className={styles.routeStop} />
        <div className={styles.routeSegment} />
        <div className={styles.routeStop} />
        <div className={styles.routeSegment} />
        <div className={`${styles.routeStop} ${styles.routeStopActive}`} />
      </div>

      {/* ── Section label ────────────────────────────────── */}
      <div className={styles.sectionLabel}>
        {isRequester ? 'My Area' : 'Workspace'}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className={styles.nav} aria-label="Primary navigation">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            <Icon className={styles.icon} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Profile / Logout ─────────────────────────────── */}
      <div className={styles.profile}>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar} aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className={styles.profileDetails}>
            <div className={styles.profileName}>{user?.name ?? 'User'}</div>
            <div className={styles.profileMeta}>{roleLabel}</div>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <RiLogoutBoxLine className={styles.logoutIcon} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
