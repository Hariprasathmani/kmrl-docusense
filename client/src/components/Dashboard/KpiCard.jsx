// components/Dashboard/KpiCard.jsx — Compact enterprise KPI card with Lucide icons
import styles from './KpiCard.module.css';

/**
 * KpiCard — Enterprise KPI metric card with optional icon
 * 
 * @param {string} label - Card title (uppercase label)
 * @param {number|string} value - Primary metric value
 * @param {string} [accent] - CSS color (e.g. 'var(--color-primary)')
 * @param {React.ComponentType} [Icon] - Optional Lucide icon component
 * @param {number} [secondary] - Optional secondary count
 * @param {string} [secondaryLabel] - Text following the secondary count
 * @param {string} [trend] - Optional trend indicator (e.g. '+5%', '-3')
 * @param {string} [trendColor] - Color for trend
 */
export default function KpiCard({
  label,
  value,
  accent = 'var(--color-primary)',
  Icon,
  secondary,
  secondaryLabel,
  trend,
  trendColor,
}) {
  return (
    <article className={styles.card} style={{ '--kpi-accent': accent }}>
      {Icon && (
        <div className={styles.iconWrap}>
          <Icon size={20} className={styles.icon} aria-hidden="true" />
        </div>
      )}
      
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value ?? '—'}</p>
      
      {secondary != null && (
        <p className={styles.secondary}>
          <strong>{secondary}</strong>
          {secondaryLabel ? ` ${secondaryLabel}` : ''}
        </p>
      )}
      
      {trend && (
        <p className={styles.trend} style={{ color: trendColor }}>
          {trend}
        </p>
      )}
    </article>
  );
}
