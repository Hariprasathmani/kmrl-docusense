// components/UI/EmptyState.jsx — Professional empty state placeholder
import { Inbox } from 'lucide-react';
import styles from './EmptyState.module.css';

/**
 * EmptyState — Professional empty data display with icon and message
 * Used when no data is available for a given view
 * 
 * @param {string} [title] - Main message
 * @param {string} [description] - Secondary description
 * @param {React.ComponentType} [Icon] - Optional custom icon component
 * @param {React.ReactNode} [action] - Optional action button/element
 */
export default function EmptyState({
  title = 'No data found',
  description = 'There are no items to display.',
  Icon = Inbox,
  action = null,
}) {
  return (
    <div className={styles.container}>
      <Icon size={32} className={styles.icon} aria-hidden="true" />
      <div>
        <div className={styles.title}>{title}</div>
        {description && <div className={styles.description}>{description}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
