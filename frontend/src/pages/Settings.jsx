import { useState } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
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

const getRoleDetails = (role) => {
  const map = {
    fleet_manager: [
      { label: 'Assigned Depot', value: 'Mumbai Central Depot' },
      { label: 'Fleet Under Command', value: '42 Vehicles' },
      { label: 'Authority Level', value: 'Global Admin' },
      { label: 'Access Tier', value: 'Tier-1 Database Access' }
    ],
    dispatcher: [
      { label: 'Desk Assignment', value: 'Desk #3 (West Coast Division)' },
      { label: 'Dispatch Shift', value: '08:00 AM - 04:00 PM' },
      { label: 'Assigned Channels', value: 'Channel 5, Channel 9' },
      { label: 'Emergency Coverage', value: 'Level 2 Responder' }
    ],
    safety_officer: [
      { label: 'Badge Number', value: 'SF-9021' },
      { label: 'Auditing Certification', value: 'ISO 39001 Lead Auditor' },
      { label: 'Compliance Cases', value: '3 Active Reviews' },
      { label: 'Safety Territory', value: 'Maharashtra Regional Depots' }
    ],
    financial_analyst: [
      { label: 'Cost Center Code', value: 'CC-FIN-88' },
      { label: 'Budget Approval Limit', value: '₹25,00,000' },
      { label: 'Assigned Entities', value: 'Western Fleet & Fuel Expenses' },
      { label: 'Audit Desk', value: 'Operations & Fuel Audit Unit' }
    ]
  };
  return map[role] || [
    { label: 'Status', value: 'Active Employee' },
    { label: 'Permissions', value: 'Default access' }
  ];
};

export default function Settings() {
  const { profile, role } = useAuth();
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {profile ? (
            <div className="panel">
              <h3 className="panel__title">My Profile</h3>
              <div className="profile-details">
                <div className="profile-detail">
                  <span className="profile-detail__label">Name</span>
                  <span className="profile-detail__val">{profile.name || 'Guest'}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail__label">Email</span>
                  <span className="profile-detail__val">{profile.email}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail__label">Assigned Role</span>
                  <span className="profile-detail__val">{ROLE_LABELS[role] || role}</span>
                </div>
                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-subtle)', margin: '14px 0' }} />
                {getRoleDetails(role).map((detail) => (
                  <div className="profile-detail" key={detail.label}>
                    <span className="profile-detail__label">{detail.label}</span>
                    <span className="profile-detail__val">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
        .profile-details { display: flex; flex-direction: column; gap: 10px; }
        .profile-detail { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; }
        .profile-detail__label { color: var(--text-secondary); font-weight: 500; }
        .profile-detail__val { color: var(--text-primary); font-weight: 600; }
      `}</style>
    </Layout>
  );
}
