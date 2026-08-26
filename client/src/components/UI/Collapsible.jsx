// components/UI/Collapsible.jsx — Reusable collapsible section
import { useState } from 'react';
import styles from './Collapsible.module.css';

/**
 * @param {string}    title       — Section title
 * @param {boolean}   defaultOpen — Initial expanded state
 * @param {ReactNode} children    — Content shown when expanded
 */
export default function Collapsible({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={styles.body}>
          {children}
        </div>
      )}
    </div>
  );
}
