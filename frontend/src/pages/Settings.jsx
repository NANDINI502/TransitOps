import { useState } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { ROLE_LABELS, ACCESS_MATRIX } from '../lib/roles';

const MODULES = [
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'fuelExp', label: 'Fuel & Exp.' },
  { key: 'analytics', label: 'Analytics' },
];

function AccessCell({ access }) {
  if (access === 'full') return <span className="access-cell access-cell--full">✓ full</span>;
  if (access === 'view') return <span className="access-cell access-cell--view">view</span>;
  return <span className="access-cell access-cell--none">–</span>;
}

export default function Settings() {
  const [general, setGeneral] = useState({ depotName: 'Central Depot', currency: 'INR', distanceUnit: 'km' });
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <PageHeader title="Settings" description="General configuration and role-based access overview." />

      <div className="two-col">
        <div className="panel">
          <h3 className="panel__title">General</h3>
          {saved ? <div className="info-banner">Settings saved (local only in this demo build).</div> : null}
          <form className="form-grid" onSubmit={handleSave}>
            <div className="form-field">
              <label>Depot Name</label>
              <input value={general.depotName} onChange={(e) => setGeneral((g) => ({ ...g, depotName: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Currency</label>
              <select value={general.currency} onChange={(e) => setGeneral((g) => ({ ...g, currency: e.target.value }))}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Distance Unit</label>
              <select value={general.distanceUnit} onChange={(e) => setGeneral((g) => ({ ...g, distanceUnit: e.target.value }))}>
                <option value="km">Kilometers (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </div>

        <div className="panel">
          <h3 className="panel__title">Role-Based Access (RBAC)</h3>
          <div className="data-table__wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  {MODULES.map((m) => (
                    <th key={m.key}>{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ROLE_LABELS).map(([roleKey, label]) => (
                  <tr key={roleKey}>
                    <td>
                      <strong>{label}</strong>
                    </td>
                    {MODULES.map((m) => (
                      <td key={m.key}>
                        <AccessCell access={ACCESS_MATRIX[roleKey]?.[m.key] ?? 'none'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="helper-text">This matrix is read-only and mirrors the access rules enforced in the app.</p>
        </div>
      </div>

      <style>{`
        .access-cell { font-size: 12.5px; font-weight: 600; }
        .access-cell--full { color: var(--status-green); }
        .access-cell--view { color: var(--status-blue); }
        .access-cell--none { color: var(--text-muted); }
      `}</style>
    </Layout>
  );
}
