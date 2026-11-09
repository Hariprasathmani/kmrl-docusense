// components/UI/ConfirmDialog.jsx — Confirmation dialog modal
import { AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

/**
 * ConfirmDialog — Modal confirmation dialog
 * 
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Callback on confirm
 * @param {function} onCancel - Callback on cancel
 * @param {string} [confirmText] - Confirm button text
 * @param {string} [cancelText] - Cancel button text
 * @param {boolean} [isDanger] - Whether confirm is destructive
 */
export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
}) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.buttonCancel}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? styles.buttonDanger : styles.buttonConfirm}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
