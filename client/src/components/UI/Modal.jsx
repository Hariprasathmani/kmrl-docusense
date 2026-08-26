// components/UI/Modal.jsx — Accessible modal overlay
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(13, 31, 45, 0.5)',
        backdropFilter:  'blur(3px)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          1000,
        padding:         '1rem',
      }}
    >
      <div
        role="document"
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          width:     '100%',
          maxWidth:  '560px',
          padding:   '1.5rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   '1.25rem',
          paddingBottom:  '0.875rem',
          borderBottom:   '1px solid var(--color-border-light)',
        }}>
          <h3
            id="modal-title"
            style={{
              fontFamily:    'var(--font-display)',
              fontSize:      '0.9375rem',
              fontWeight:    700,
              color:         'var(--color-text)',
              margin:        0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ minHeight: 28, padding: '0.2rem 0.5rem' }}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
