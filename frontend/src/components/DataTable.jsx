import './DataTable.css';
import { toneForStatus } from './StatusPill';

export default function DataTable({ columns, rows, loading, error, emptyText = 'No records found.', rowKey = 'id', rowTone }) {
  if (loading) {
    return (
      <div className="data-table__state">
        <div className="spinner" /> Loading…
      </div>
    );
  }
  if (error) {
    return <div className="data-table__state data-table__state--error">{error}</div>;
  }
  if (!rows || rows.length === 0) {
    return <div className="data-table__state">{emptyText}</div>;
  }

  return (
    <div className="data-table__wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'data-table--right' : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const tone = rowTone ? toneForStatus(rowTone(row)) : null;
            return (
              <tr key={row[rowKey] ?? i} className={tone ? `data-table__row--${tone}` : undefined}>
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? 'data-table--right mono' : undefined}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
