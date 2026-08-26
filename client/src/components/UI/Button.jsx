// components/UI/Button.jsx — Reusable button using global design system classes
const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  ghost:   'btn btn-ghost',
  danger:  'btn btn-danger',
};

/**
 * @param {'primary'|'ghost'|'danger'} [variant='ghost']
 * @param {'sm'|'md'|'lg'}             [size='md']
 */
export default function Button({
  children,
  variant = 'ghost',
  size,
  className = '',
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const cls = [VARIANT_CLASS[variant] ?? 'btn btn-ghost', sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
