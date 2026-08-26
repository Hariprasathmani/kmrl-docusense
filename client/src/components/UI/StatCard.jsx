// components/UI/StatCard.jsx — KPI stat card for Analytics
import styles from './StatCard.module.css';

/**
 * @param {string}        label   — Card title
 * @param {number|string} value   — Primary metric
 * @param {string}        icon    — Emoji / unicode icon
 * @param {string}        accent  — CSS custom-property colour (e.g. 'var(--color-primary)')
 * @param {string}       [trend]  — Optional small trend label
 */
export default function StatCard({ label, value, icon, accent, trend }) {
  return (
    <article className={`glass-card ${styles.card}`} style={{ '--card-accent': accent }}>
      <div className={styles.accentBar} aria-hidden="true" />

      {icon && (
        <div className={styles.iconWrap} aria-hidden="true">
          <span className={styles.icon}>{icon}</span>
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
