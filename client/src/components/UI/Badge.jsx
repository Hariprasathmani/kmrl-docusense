// components/UI/Badge.jsx — Status badge component
// Maps semantic variant names to global CSS badge classes (defined in index.css)

const VARIANT_CLASS = {
  pending:    'badge badge-yellow',
  processing: 'badge badge-blue',
  completed:  'badge badge-green',
  failed:     'badge badge-red',
  active:     'badge badge-green',
  inactive:   'badge badge-grey',
  admin:      'badge badge-blue',
  officer:    'badge badge-grey',
};

export default function Badge({ label, variant }) {
  const cls = VARIANT_CLASS[variant] ?? 'badge badge-grey';
  return <span className={cls}>{label}</span>;
}
