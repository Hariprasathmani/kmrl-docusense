// components/UI/PriorityBadge.jsx — Priority indicator with color mapping
import styles from './StatusBadge.module.css'; // Reuse same styling system

/**
 * PriorityBadge — Enterprise priority indicator (Critical, High, Medium, Low)
 * Uses semantic color mapping from design system
 * 
 * @param {string} priority - Priority level (Critical, High, Medium, Low)
 * @param {string} [className] - Additional CSS class
 */
export default function PriorityBadge({ priority, className = '' }) {
  if (!priority) return null;

  const normalizedPriority = String(priority).toLowerCase().trim();

  const priorityMap = {
    'critical': 'badge-priority-critical',
    'high': 'badge-priority-high',
    'medium': 'badge-priority-medium',
    'low': 'badge-priority-low',
  };

  const priorityClass = priorityMap[normalizedPriority] || 'badge-priority-medium';
  const displayLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <span className={`badge ${priorityClass} ${className}`}>
      {displayLabel}
    </span>
  );
}
