// components/UI/Spinner.jsx — Loading spinner using design system colors
export default function Spinner({ size = 32 }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width:       size,
        height:      size,
        border:      '2px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation:   'spin 0.75s linear infinite',
        flexShrink:  0,
      }}
    />
  );
}

// Inject spin keyframe once
if (typeof document !== 'undefined' && !document.getElementById('kmrl-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'kmrl-spinner-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
