// components/UI/StatusBadge.jsx — Enterprise status badge with Lucide icons
import {
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Share2,
} from 'lucide-react';
import styles from './StatusBadge.module.css';

/**
 * StatusBadge — Professional status indicator with semantic colors and icons
 * Maps 8 status types to appropriate Lucide icons and colors
 * 
 * @param {string} status - Status value (pending, in-progress, shared, resolved, rejected, new, assigned, returned, closed)
 * @param {boolean} [showIcon=true] - Whether to display icon
 * @param {string} [className] - Additional CSS class
 */
export default function StatusBadge({ status, showIcon = true, className = '' }) {
  if (!status) return null;

  const normalizedStatus = String(status).toLowerCase().trim();

  // Map status to color class and icon
  const statusMap = {
    'pending': { className: 'status-pending', icon: Clock },
    'in progress': { className: 'status-in-progress', icon: Hourglass },
    'inprogress': { className: 'status-in-progress', icon: Hourglass },
    'shared': { className: 'status-shared', icon: Share2 },
    'resolved': { className: 'status-resolved', icon: CheckCircle2 },
    'rejected': { className: 'status-rejected', icon: XCircle },
    'new': { className: 'status-new', icon: Clock },
    'assigned': { className: 'status-assigned', icon: CheckCircle2 },
    'returned': { className: 'status-returned', icon: AlertCircle },
    'closed': { className: 'status-closed', icon: XCircle },
  };

  const mapping = statusMap[normalizedStatus];
  const Icon = mapping?.icon || Clock;
  const statusClass = mapping?.className || 'status-default';

  // Format display label (capitalize first letter of each word)
  const displayLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`${styles.badge} ${styles[statusClass]} ${className}`}>
      {showIcon && <Icon size={14} className={styles.icon} aria-hidden="true" />}
      <span className={styles.label}>{displayLabel}</span>
    </span>
  );
}
