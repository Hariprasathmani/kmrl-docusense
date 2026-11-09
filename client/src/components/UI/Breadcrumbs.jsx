// components/UI/Breadcrumbs.jsx — Navigation breadcrumbs
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

/**
 * Breadcrumbs — Navigation path indicator
 * 
 * @param {Array<{label: string, path?: string}>} items - Breadcrumb items
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className={styles.nav} aria-label="Breadcrumbs">
      <ol className={styles.list}>
        {items.map((item, idx) => (
          <li key={idx} className={styles.item}>
            {idx > 0 && <ChevronRight size={14} className={styles.separator} aria-hidden="true" />}
            
            {item.path ? (
              <Link to={item.path} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
