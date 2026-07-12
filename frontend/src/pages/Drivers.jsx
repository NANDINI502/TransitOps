import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { driversApi, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/roles';

const CATEGORIES = ['LMV', 'HMV', 'Bus', 'Trailer'];
const STATUSES = ['Available', 'On Trip', 'Suspended', 'Off Duty'];

const emptyForm = {
  name: '',
  license_no: '',
  license_category: CATEGORIES[0],
  license_expiry: '',
  contact: '',
  safety_score: '',
  status: 'Available',
};

function isExpired(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function safetyTone(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return 'gray';
  if (n >= 80) return 'green';
  if (n >= 50) return 'amber';
  return 'red';
}

export default function Drivers() {
  const { role } = useAuth();
  const editable = canEdit(role, 'drivers');

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await driversApi.list();
      setDrivers(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return drivers;
    const q = search.toLowerCase();
    return drivers.filter((d) => (d.name || '').toLowerCase().includes(q) || (d.license_no || '').toLowerCase().includes(q));
  }, [drivers, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (driver) => {
    setEditing(driver);
    setForm({
      name: driver.name || '',
      license_no: driver.license_no || '',
      license_category: driver.license_category || CATEGORIES[0],
      license_expiry: driver.license_expiry ? driver.license_expiry.slice(0, 10) : '',
      contact: driver.contact || '',
      safety_score: driver.safety_score ?? '',
      status: driver.status || 'Available',
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.license_no.trim()) {
      setFormError('Name and License No. are required.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      license_no: form.license_no.trim(),
      license_category: form.license_category,
      license_expiry: form.license_expiry,
      contact: form.contact.trim(),
      safety_score: Number(form.safety_score) || 0,
      status: form.status,
    };
    try {
      if (editing) {
        await driversApi.update(editing.id, payload);
      } else {
        await driversApi.create(payload);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail || err.message : 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search name or license no…">
      <PageHeader
        title="Drivers"
        description="Manage driver licenses, contact info, and performance."
        actions={
          editable ? (
            <Button onClick={openAdd}>
              <span style={{ marginRight: 4 }}>+</span> Add Driver
            </Button>
          ) : null
        }
      />

      {error ? <div className="error-banner">{error}</div> : null}

      <DataTable
        loading={loading}
        rows={filtered}
        rowTone={(r) => (isExpired(r.license_expiry) ? 'Suspended' : r.status)}
        emptyText="No drivers found. Add your first driver to get started."
        columns={[
          { key: 'name', header: 'Driver', render: (r) => <strong>{r.name}</strong> },
          { key: 'license_no', header: 'License No' },
          { key: 'license_category', header: 'Category' },
          {
            key: 'license_expiry',
            header: 'Expiry',
            render: (r) => (
              <span style={isExpired(r.license_expiry) ? { color: 'var(--status-red)', fontWeight: 600 } : undefined}>
                {r.license_expiry ? r.license_expiry.slice(0, 10) : '—'}
              </span>
            ),
          },
          { key: 'contact', header: 'Contact' },
          {
            key: 'trip_completion_pct',
            header: 'Trip Completion %',
            align: 'right',
            render: (r) => (r.trip_completion_pct != null ? `${r.trip_completion_pct}%` : '—'),
          },
          {
            key: 'safety_score',
            header: 'Safety Score',
            align: 'right',
            render: (r) => <StatusPill tone={safetyTone(r.safety_score)}>{r.safety_score ?? '—'}</StatusPill>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusPill status={isExpired(r.license_expiry) ? 'Suspended' : r.status} />,
          },
          ...(editable
            ? [
                {
                  key: 'actions',
                  header: '',
                  render: (r) => (
                    <button className="link-btn" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                  ),
                },
              ]
            : []),
        ]}
      />

      <p className="helper-text">Rule: Expired license or Suspended status → blocked from trip assignment</p>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="drawer"
        title={editing ? 'Edit Driver' : 'Add Driver'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Driver'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={handleSave}>
          {formError ? <div className="error-banner">{formError}</div> : null}
          <div className="form-section">
            <div className="form-section__label">Identity &amp; License</div>
            <div className="form-field">
              <label>Full Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>License No.</label>
              <input value={form.license_no} onChange={(e) => setForm((f) => ({ ...f, license_no: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>License Category</label>
              <select value={form.license_category} onChange={(e) => setForm((f) => ({ ...f, license_category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>License Expiry</label>
              <input type="date" value={form.license_expiry} onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Contact</label>
              <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone or email" />
            </div>
          </div>
          <div className="form-section">
            <div className="form-section__label">Performance &amp; Status</div>
            <div className="form-field">
              <label>Safety Score (0–100)</label>
              <input type="number" min="0" max="100" value={form.safety_score} onChange={(e) => setForm((f) => ({ ...f, safety_score: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <style>{`.link-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 12.5px; font-weight: 600; padding: 0; }`}</style>
    </Layout>
  );
}
