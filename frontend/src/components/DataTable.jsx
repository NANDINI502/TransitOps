import './DataTable.css';

export default function DataTable({ columns, rows, loading, error, emptyText = 'No records found.', rowKey = 'id' }) {
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
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[rowKey] ?? i}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
