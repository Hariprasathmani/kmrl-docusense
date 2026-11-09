// components/UI/PageHeader.jsx — Professional page header with title and actions
import styles from './PageHeader.module.css';

/**
 * PageHeader — Consistent page header with title, subtitle, breadcrumbs, and action buttons
 * Used at the top of all main pages for navigation context and quick actions
 * 
 * @param {string} title - Main title
 * @param {string} [subtitle] - Optional subtitle/description
 * @param {React.ReactNode} [breadcrumbs] - Optional breadcrumb navigation
 * @param {React.ReactNode} [actions] - Optional action buttons
 */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <header className={styles.header}>
      {breadcrumbs && <div className={styles.breadcrumbs}>{breadcrumbs}</div>}
      
      <div className={styles.top}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
