import { useMemo, useState } from 'react';
import './DataTable.css';
import { toneForStatus } from './StatusPill';

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const aNum = typeof a === 'number' ? a : Number(a);
  const bNum = typeof b === 'number' ? b : Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && a !== '' && b !== '') {
    return aNum - bNum;
  }

  const aDate = Date.parse(a);
  const bDate = Date.parse(b);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return aDate - bDate;
  }

  return String(a).localeCompare(String(b));
}

export default function DataTable({ columns, rows, loading, error, emptyText = 'No records found.', rowKey = 'id', rowTone }) {
  const [sort, setSort] = useState({ key: null, dir: null });

  const sortedRows = useMemo(() => {
    if (!sort.key || !rows) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col || col.sortable === false) return rows;
    const getValue = col.sortValue || ((row) => row[col.key]);
    const sorted = [...rows].sort((a, b) => compareValues(getValue(a), getValue(b)));
    if (sort.dir === 'desc') sorted.reverse();
    return sorted;
  }, [rows, sort, columns]);

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

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((s) => {
      if (s.key !== col.key) return { key: col.key, dir: 'asc' };
      if (s.dir === 'asc') return { key: col.key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  return (
    <div className="data-table__wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable !== false && !!col.key;
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  className={[
                    col.align === 'right' ? 'data-table--right' : '',
                    sortable ? 'data-table__th--sortable' : '',
                    active ? 'data-table__th--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={sortable ? () => toggleSort(col) : undefined}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="data-table__th-inner">
                    {col.header}
                    {sortable ? (
                      <span className="data-table__sort-arrow">
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => {
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
