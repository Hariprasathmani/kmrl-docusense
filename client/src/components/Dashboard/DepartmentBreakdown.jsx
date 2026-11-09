// components/Dashboard/DepartmentBreakdown.jsx — Department document count table with Lucide icons
import {
  Building2,
  UsersRound,
  ShieldCheck,
  Scale,
  Workflow,
  Monitor,
} from 'lucide-react';
import styles from './DepartmentBreakdown.module.css';

const DEPARTMENTS = ['Finance', 'HR', 'Safety', 'Legal', 'Operations', 'IT'];

const DEPT_META = {
  Finance:    { Icon: Building2, accent: 'var(--color-warning)' },
  HR:         { Icon: UsersRound, accent: 'var(--color-primary)' },
  Safety:     { Icon: ShieldCheck, accent: 'var(--color-success)' },
  Legal:      { Icon: Scale, accent: 'var(--color-accent)' },
  Operations: { Icon: Workflow, accent: '#a78bfa' },
  IT:         { Icon: Monitor, accent: '#06b6d4' },
};

export default function DepartmentBreakdown({ data }) {
  const total = DEPARTMENTS.reduce((sum, dept) => sum + (data?.[dept] ?? 0), 0);

  return (
    <section className={`glass-card ${styles.section}`}>
      <header className={styles.header}>
        <h3 className={styles.title}>Department Breakdown</h3>
        <span className={styles.subtitle}>{total} documents total</span>
      </header>

      <ul className={styles.list} role="list">
        {DEPARTMENTS.map((dept) => {
          const count = data?.[dept] ?? 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          const { Icon, accent } = DEPT_META[dept];

          return (
            <li key={dept} className={styles.row}>
              <Icon size={18} className={styles.deptIcon} aria-hidden="true" />

              <span className={styles.deptName}>{dept}</span>

              <div className={styles.barWrap} role="progressbar"
                   aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                   aria-label={`${dept}: ${pct}%`}>
                <div
                  className={styles.bar}
                  style={{ width: `${pct}%`, background: accent }}
                />
              </div>

              <span className={styles.count}>{count}</span>
              <span className={styles.pct}>{pct}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
