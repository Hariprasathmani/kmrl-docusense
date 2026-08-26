// components/Dashboard/KpiCard.jsx — Compact enterprise KPI card
import styles from './KpiCard.module.css';

/**
 * @param {string}       label           — Card title (uppercase label)
 * @param {number|string} value          — Primary metric value
 * @param {string}       [accent]        — CSS color (e.g. 'var(--color-primary)')
 * @param {number}       [secondary]     — Optional secondary count
 * @param {string}       [secondaryLabel] — Text following the secondary count
 */
export default function KpiCard({
  label,
  value,
  accent = 'var(--color-primary)',
  secondary,
  secondaryLabel,
}) {
  return (
    <article className={styles.card} style={{ '--kpi-accent': accent }}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value ?? '—'}</p>
      {secondary != null && (
        <p className={styles.secondary}>
          <strong>{secondary}</strong>
          {secondaryLabel ? ` ${secondaryLabel}` : ''}
        </p>
      )}
    </article>
  );
}
