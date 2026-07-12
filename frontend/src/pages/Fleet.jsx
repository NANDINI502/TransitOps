import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { vehiclesApi, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/roles';

const TYPES = ['Truck', 'Van', 'Bus', 'Car'];
const STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

const emptyForm = {
  reg_no: '',
  name: '',
  type: TYPES[0],
  max_load_kg: '',
  odometer_km: '',
  acquisition_cost: '',
  status: 'Available',
  region: '',
};

export default function Fleet() {
  const { role } = useAuth();
  const editable = canEdit(role, 'fleet');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      const data = await vehiclesApi.list({ type: typeFilter, status: statusFilter });
      setVehicles(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter((v) => (v.reg_no || '').toLowerCase().includes(q) || (v.name || '').toLowerCase().includes(q));
  }, [vehicles, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (vehicle) => {
    setEditing(vehicle);
    setForm({
      reg_no: vehicle.reg_no || '',
      name: vehicle.name || '',
      type: vehicle.type || TYPES[0],
      max_load_kg: vehicle.max_load_kg ?? '',
      odometer_km: vehicle.odometer_km ?? '',
      acquisition_cost: vehicle.acquisition_cost ?? '',
      status: vehicle.status || 'Available',
      region: vehicle.region || '',
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.reg_no.trim()) {
      setFormError('Registration No. is required.');
      return;
    }
    const dup = vehicles.some(
      (v) => v.reg_no?.toLowerCase() === form.reg_no.trim().toLowerCase() && v.id !== editing?.id
    );
    if (dup) {
      setFormError('Registration No. must be unique — a vehicle with this reg. no. already exists.');
      return;
    }
    setSaving(true);
    const payload = {
      reg_no: form.reg_no.trim(),
      name: form.name.trim(),
      type: form.type,
      max_load_kg: Number(form.max_load_kg) || 0,
      odometer_km: Number(form.odometer_km) || 0,
      acquisition_cost: Number(form.acquisition_cost) || 0,
      status: form.status,
      region: form.region.trim(),
    };
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, payload);
      } else {
        await vehiclesApi.create(payload);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail || err.message : 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search reg. no or name…">
      <PageHeader
        title="Fleet / Vehicle Registry"
        description="Manage vehicle records, capacity, and lifecycle status."
        actions={
          editable ? (
            <Button onClick={openAdd}>
              <span style={{ marginRight: 4 }}>+</span> Add Vehicle
            </Button>
          ) : null
        }
        filters={
          <>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        }
      />

      {error ? <div className="error-banner">{error}</div> : null}

      <DataTable
        loading={loading}
        rows={filtered}
        rowTone={(r) => r.status}
        emptyText="No vehicles found. Add your first vehicle to get started."
        columns={[
          { key: 'reg_no', header: 'Reg. No', render: (r) => <strong>{r.reg_no}</strong> },
          { key: 'name', header: 'Name / Model' },
          { key: 'type', header: 'Type' },
          { key: 'max_load_kg', header: 'Capacity', align: 'right', render: (r) => `${r.max_load_kg ?? '—'} kg` },
          {
            key: 'odometer_km',
            header: 'Odometer',
            align: 'right',
            render: (r) => `${(r.odometer_km ?? 0).toLocaleString?.() ?? r.odometer_km} km`,
          },
          {
            key: 'acquisition_cost',
            header: 'Acquisition Cost',
            align: 'right',
            render: (r) => (r.acquisition_cost != null ? `₹${Number(r.acquisition_cost).toLocaleString()}` : '—'),
          },
          { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
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

      <p className="helper-text">
        Rule: Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="drawer"
        title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Vehicle'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={handleSave}>
          {formError ? <div className="error-banner">{formError}</div> : null}
          <div className="form-section">
            <div className="form-section__label">Vehicle Identity</div>
            <div className="form-field">
              <label>Registration No.</label>
              <input value={form.reg_no} onChange={(e) => setForm((f) => ({ ...f, reg_no: e.target.value }))} placeholder="e.g. MH-12-AB-1234" />
            </div>
            <div className="form-field">
              <label>Name / Model</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Tata Ace" />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Region</label>
              <input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="e.g. North" />
            </div>
          </div>
          <div className="form-section">
            <div className="form-section__label">Capacity &amp; Status</div>
            <div className="form-field">
              <label>Max Load Capacity (kg)</label>
              <input type="number" min="0" value={form.max_load_kg} onChange={(e) => setForm((f) => ({ ...f, max_load_kg: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Odometer (km)</label>
              <input type="number" min="0" value={form.odometer_km} onChange={(e) => setForm((f) => ({ ...f, odometer_km: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Acquisition Cost</label>
              <input type="number" min="0" value={form.acquisition_cost} onChange={(e) => setForm((f) => ({ ...f, acquisition_cost: e.target.value }))} />
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
