// components/UI/FormField.jsx — Professional form field wrapper with validation
import { AlertCircle } from 'lucide-react';
import styles from './FormField.module.css';

/**
 * FormField — Wrapped form input with label, validation, and error display
 * 
 * @param {string} label - Field label
 * @param {string} name - Field name
 * @param {React.ReactNode} children - Input element
 * @param {object} [error] - Error object from react-hook-form
 * @param {string} [helpText] - Help text below field
 * @param {boolean} [required] - Required indicator
 */
export default function FormField({
  label,
  name,
  children,
  error,
  helpText,
  required,
  className = '',
}) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={name} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}

      <div className={styles.inputWrap}>
        {children}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error.message || 'This field is required'}</span>
        </div>
      )}

      {!error && helpText && (
        <div className={styles.help}>{helpText}</div>
      )}
    </div>
  );
}
