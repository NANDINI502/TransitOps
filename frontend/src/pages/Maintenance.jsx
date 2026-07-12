import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import { maintenanceApi, vehiclesApi, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/roles';

const SERVICE_TYPES = ['Oil Change', 'Tire Replacement', 'Brake Service', 'Engine Repair', 'General Inspection', 'Other'];

const emptyForm = {
  vehicle_id: '',
  service_type: SERVICE_TYPES[0],
  cost: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'Active',
};

export default function Maintenance() {
  const { role } = useAuth();
  const editable = canEdit(role, 'fleet');

  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recs, vs] = await Promise.all([maintenanceApi.list(), vehiclesApi.list()]);
      setRecords(Array.isArray(recs) ? recs : recs?.items || []);
      setVehicles(Array.isArray(vs) ? vs : vs?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.vehicle_id || !form.cost || !form.date) {
      setFormError('Vehicle, cost, and date are required.');
      return;
    }
    setSaving(true);
    try {
      await maintenanceApi.create({
        vehicle_id: form.vehicle_id,
        service_type: form.service_type,
        cost: Number(form.cost) || 0,
        date: form.date,
        status: form.status,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail || err.message : 'Failed to save service record.');
    } finally {
      setSaving(false);
    }
  };

  const closeRecord = async (record) => {
    setActionError(null);
    setBusyId(record.id);
    try {
      await maintenanceApi.complete(record.id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail || err.message : 'Failed to close service record.');
    } finally {
      setBusyId(null);
    }
  };

  const vehicleLabel = (id) => {
    const v = vehicles.find((veh) => String(veh.id) === String(id));
    return v ? `${v.reg_no} — ${v.name}` : id;
  };

  const visibleRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter((r) =>
      [r.service_type, r.vehicle_name, vehicleLabel(r.vehicle_id)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [records, search, vehicles]);

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search vehicle or service type…">
      <PageHeader
        title="Maintenance"
        description="Log service records and track vehicles currently in the shop."
      />

      <div className="two-col">
        <div className="panel">
          <h3 className="panel__title">Log Service Record</h3>
          {!editable ? <div className="info-banner">Your role has view-only access. Logging is disabled.</div> : null}
          {formError ? <div className="error-banner">{formError}</div> : null}
          <form className="form-grid" onSubmit={handleSave}>
            <div className="form-field">
              <label>Vehicle</label>
              <select disabled={!editable} value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg_no} — {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Service Type</label>
              <select disabled={!editable} value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Cost</label>
              <input disabled={!editable} type="number" min="0" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Date</label>
              <input disabled={!editable} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select disabled={!editable} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active (In Shop)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <Button type="submit" disabled={!editable || saving}>
              {saving ? 'Saving…' : 'Save Record'}
            </Button>
          </form>

          <div className="maint-diagram">
            <div className="maint-diagram__node maint-diagram__node--green">Available</div>
            <div className="maint-diagram__arrow">
              creating active record
              <span>→</span>
            </div>
            <div className="maint-diagram__node maint-diagram__node--amber">In Shop</div>
          </div>
          <div className="maint-diagram">
            <div className="maint-diagram__node maint-diagram__node--amber">In Shop</div>
            <div className="maint-diagram__arrow">
              closing record, unless retired
              <span>→</span>
            </div>
            <div className="maint-diagram__node maint-diagram__node--green">Available</div>
          </div>

          <p className="helper-text">In Shop vehicles are removed from the dispatch pool.</p>
        </div>

        <div className="panel">
          <h3 className="panel__title">Service Log</h3>
          {error ? <div className="error-banner">{error}</div> : null}
          {actionError ? <div className="error-banner">{actionError}</div> : null}
          <DataTable
            loading={loading}
            rows={visibleRecords}
            emptyText={records.length === 0 ? 'No service records yet.' : 'No records match your search.'}
            columns={[
              { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle_name || vehicleLabel(r.vehicle_id) },
              { key: 'service_type', header: 'Service' },
              { key: 'cost', header: 'Cost', align: 'right', render: (r) => (r.cost != null ? `₹${Number(r.cost).toLocaleString()}` : '—') },
              { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status === 'Active' ? 'In Shop' : r.status} /> },
              ...(editable
                ? [
                    {
                      key: 'actions',
                      header: '',
                      render: (r) =>
                        r.status === 'Active' ? (
                          <button className="link-btn" disabled={busyId === r.id} onClick={() => closeRecord(r)}>
                            Close (mark available)
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <style>{`
        .link-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 12.5px; font-weight: 600; padding: 0; }
        .maint-diagram { display: flex; align-items: center; gap: 10px; margin-top: 14px; font-size: 11.5px; color: var(--text-muted); }
        .maint-diagram__node { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .maint-diagram__node--green { background: var(--status-green-soft); color: var(--status-green); }
        .maint-diagram__node--amber { background: var(--status-amber-soft); color: var(--status-amber); }
        .maint-diagram__arrow { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; text-align: center; }
      `}</style>
    </Layout>
  );
}
