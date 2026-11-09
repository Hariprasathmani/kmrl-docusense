// components/UI/DepartmentBadge.jsx — Department indicator with Lucide icons (no emojis)
import {
  Building2,
  UsersRound,
  ShieldCheck,
  Scale,
  Workflow,
  Monitor,
} from 'lucide-react';
import styles from './DepartmentBadge.module.css';

const DEPARTMENT_ICONS = {
  Finance: Building2,
  HR: UsersRound,
  Safety: ShieldCheck,
  Legal: Scale,
  Operations: Workflow,
  IT: Monitor,
};

/**
 * DepartmentBadge — Professional department indicator with Lucide icons
 * Replaces emoji-based indicators with semantic icons
 * 
 * @param {string} department - Department name
 * @param {string} [className] - Additional CSS class
 */
export default function DepartmentBadge({ department, className = '' }) {
  if (!department) return null;

  const Icon = DEPARTMENT_ICONS[department] || Building2;
  const displayName = department || 'Unknown';

  return (
    <span className={`${styles.badge} ${className}`} title={displayName}>
      <Icon size={14} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{displayName}</span>
    </span>
  );
}
