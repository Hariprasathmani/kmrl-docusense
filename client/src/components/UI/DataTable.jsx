// components/UI/DataTable.jsx — Reusable, accessible data table
import styles from './DataTable.module.css';

/**
 * @param {Array<{ key, label, render? }>} columns — Column definitions.
 *   `render(row)` is optional; falls back to `row[key]`.
 * @param {Array<object>}  rows        — Data rows.
 * @param {string}         [rowKey]    — Property used as React key (default: '_id').
 * @param {function}       [onRowClick]— Called with the row object on click.
 * @param {string}         [ariaLabel] — Accessible table label.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = '_id',
  onRowClick,
  ariaLabel = 'Data table',
}) {
  const clickable = typeof onRowClick === 'function';

  return (
    <div className={styles.wrapper} role="region" aria-label={ariaLabel}>
      <table className={styles.table} aria-label={ariaLabel}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={styles.th} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row[rowKey] ?? idx}
              className={`${styles.tr} ${clickable ? styles.trClickable : ''}`}
              onClick={clickable ? () => onRowClick(row) : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(row)
                  : undefined
              }
              role={clickable ? 'button' : undefined}
              aria-label={clickable ? `View document ${row.title ?? row[rowKey]}` : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={styles.td}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
