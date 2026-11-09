// components/UI/StatCard.jsx — KPI stat card for Analytics with Lucide icons
import styles from './StatCard.module.css';

/**
 * StatCard — Professional analytics stat card with Lucide icon support
 * 
 * @param {string} label - Card title
 * @param {number|string} value - Primary metric
 * @param {React.ComponentType} [Icon] - Lucide icon component
 * @param {string} [accent] - CSS custom-property colour (e.g. 'var(--color-primary)')
 * @param {string} [trend] - Optional small trend label
 */
export default function StatCard({ label, value, Icon, accent, trend }) {
  return (
    <article className={`glass-card ${styles.card}`} style={{ '--card-accent': accent || 'var(--color-primary)' }}>
      <div className={styles.accentBar} aria-hidden="true" />

      {Icon && (
        <div className={styles.iconWrap} aria-hidden="true">
          <Icon size={20} className={styles.icon} />
        </div>
      )}

      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value ?? '—'}</span>
        {trend && <span className={styles.trend}>{trend}</span>}
      </div>
    </article>
  );
}
