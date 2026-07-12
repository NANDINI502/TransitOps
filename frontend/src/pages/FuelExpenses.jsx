import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { fuelApi, expensesApi, vehiclesApi, tripsApi, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/roles';

const EXPENSE_CATEGORIES = ['Toll', 'Parking', 'Fine', 'Other'];

const emptyFuelForm = { vehicle_id: '', trip_id: '', liters: '', cost: '', date: new Date().toISOString().slice(0, 10) };
const emptyExpenseForm = { vehicle_id: '', trip_id: '', category: EXPENSE_CATEGORIES[0], amount: '', date: new Date().toISOString().slice(0, 10) };

export default function FuelExpenses() {
  const { role } = useAuth();
  const editable = canEdit(role, 'fuelExp');

  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState(emptyFuelForm);
  const [fuelSaving, setFuelSaving] = useState(false);
  const [fuelError, setFuelError] = useState(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fl, ex, vs, tr] = await Promise.all([
        fuelApi.list(),
        expensesApi.list(),
        vehiclesApi.list(),
        tripsApi.list(),
      ]);
      setFuelLogs(Array.isArray(fl) ? fl : fl?.items || []);
      setExpenses(Array.isArray(ex) ? ex : ex?.items || []);
      setVehicles(Array.isArray(vs) ? vs : vs?.items || []);
      setTrips(Array.isArray(tr) ? tr : tr?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load fuel & expense data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const vehicleLabel = (id) => {
    const v = vehicles.find((veh) => String(veh.id) === String(id));
    return v ? v.reg_no : id || '—';
  };
  const tripLabel = (id) => {
    if (!id) return '—';
    const t = trips.find((tr) => String(tr.id) === String(id));
    return t ? t.trip_no || `#${t.id}` : id;
  };

  const visibleFuelLogs = useMemo(() => {
    if (!search.trim()) return fuelLogs;
    const q = search.trim().toLowerCase();
    return fuelLogs.filter((f) =>
      [f.vehicle_reg_no, vehicleLabel(f.vehicle_id), tripLabel(f.trip_id)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [fuelLogs, search, vehicles, trips]);

  const visibleExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.trim().toLowerCase();
    return expenses.filter((e) =>
      [e.vehicle_reg_no, vehicleLabel(e.vehicle_id), tripLabel(e.trip_id), e.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [expenses, search, vehicles, trips]);

  const totalFuelCost = useMemo(() => fuelLogs.reduce((sum, f) => sum + (Number(f.cost) || 0), 0), [fuelLogs]);
  const totalMaintFromExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.maintenance_linked_cost) || 0), 0),
    [expenses]
  );
  const totalOperationalCost = totalFuelCost + totalMaintFromExpenses;

  const submitFuel = async (e) => {
    e.preventDefault();
    setFuelError(null);
    if (!fuelForm.vehicle_id || !fuelForm.liters || !fuelForm.cost) {
      setFuelError('Vehicle, liters, and cost are required.');
      return;
    }
    setFuelSaving(true);
    try {
      await fuelApi.create({
        vehicle_id: fuelForm.vehicle_id,
        trip_id: fuelForm.trip_id || null,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        date: fuelForm.date,
      });
      setFuelModalOpen(false);
      setFuelForm(emptyFuelForm);
      load();
    } catch (err) {
      setFuelError(err instanceof ApiError ? err.detail || err.message : 'Failed to log fuel.');
    } finally {
      setFuelSaving(false);
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setExpenseError(null);
    if (!expenseForm.vehicle_id || !expenseForm.amount) {
      setExpenseError('Vehicle and amount are required.');
      return;
    }
    setExpenseSaving(true);
    try {
      await expensesApi.create({
        vehicle_id: expenseForm.vehicle_id,
        trip_id: expenseForm.trip_id || null,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
      });
      setExpenseModalOpen(false);
      setExpenseForm(emptyExpenseForm);
      load();
    } catch (err) {
      setExpenseError(err instanceof ApiError ? err.detail || err.message : 'Failed to add expense.');
    } finally {
      setExpenseSaving(false);
    }
  };

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search vehicle or trip#…">
      <PageHeader
        title="Fuel & Expenses"
        description="Track fuel consumption and operational expenses per vehicle and trip."
        actions={
          editable ? (
            <>
              <Button variant="secondary" onClick={() => setExpenseModalOpen(true)}>
                + Add Expense
              </Button>
              <Button onClick={() => setFuelModalOpen(true)}>+ Log Fuel</Button>
            </>
          ) : null
        }
      />

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 className="panel__title">Fuel Logs</h3>
        <DataTable
          loading={loading}
          rows={visibleFuelLogs}
          emptyText={fuelLogs.length === 0 ? 'No fuel logs yet.' : 'No fuel logs match your search.'}
          columns={[
            { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle_reg_no || vehicleLabel(r.vehicle_id) },
            { key: 'date', header: 'Date', render: (r) => (r.date || '').slice(0, 10) },
            { key: 'liters', header: 'Liters', align: 'right', render: (r) => `${r.liters} L` },
            { key: 'cost', header: 'Fuel Cost', align: 'right', render: (r) => `₹${Number(r.cost || 0).toLocaleString()}` },
          ]}
        />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 className="panel__title">Other Expenses</h3>
        <DataTable
          loading={loading}
          rows={visibleExpenses}
          emptyText={expenses.length === 0 ? 'No expenses logged yet.' : 'No expenses match your search.'}
          columns={[
            { key: 'trip', header: 'Trip', render: (r) => r.trip_no || tripLabel(r.trip_id) },
            { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle_reg_no || vehicleLabel(r.vehicle_id) },
            { key: 'toll', header: 'Toll', align: 'right', render: (r) => (r.category === 'Toll' ? `₹${Number(r.amount || 0).toLocaleString()}` : '—') },
            { key: 'other', header: 'Other', align: 'right', render: (r) => (r.category !== 'Toll' ? `₹${Number(r.amount || 0).toLocaleString()}` : '—') },
            {
              key: 'maint_linked',
              header: 'Maint. Linked',
              align: 'right',
              render: (r) => (r.maintenance_linked_cost != null ? `₹${Number(r.maintenance_linked_cost).toLocaleString()}` : '—'),
            },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              render: (r) => `₹${(Number(r.amount || 0) + Number(r.maintenance_linked_cost || 0)).toLocaleString()}`,
            },
            { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status || 'Draft'} /> },
          ]}
        />
      </div>

      <div className="cost-summary-bar">
        <span>Total Operational Cost (Auto) = Fuel + Maint</span>
        <strong>₹{totalOperationalCost.toLocaleString()}</strong>
      </div>

      <Modal
        open={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        title="Log Fuel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFuelModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitFuel} disabled={fuelSaving}>
              {fuelSaving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submitFuel}>
          {fuelError ? <div className="error-banner">{fuelError}</div> : null}
          <div className="form-field">
            <label>Vehicle</label>
            <select value={fuelForm.vehicle_id} onChange={(e) => setFuelForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_no} — {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Trip (optional)</label>
            <select value={fuelForm.trip_id} onChange={(e) => setFuelForm((f) => ({ ...f, trip_id: e.target.value }))}>
              <option value="">None</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_no || `#${t.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Liters</label>
            <input type="number" min="0" value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Fuel Cost</label>
            <input type="number" min="0" value={fuelForm.cost} onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={fuelForm.date} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <Modal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Add Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitExpense} disabled={expenseSaving}>
              {expenseSaving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submitExpense}>
          {expenseError ? <div className="error-banner">{expenseError}</div> : null}
          <div className="form-field">
            <label>Vehicle</label>
            <select value={expenseForm.vehicle_id} onChange={(e) => setExpenseForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_no} — {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Trip (optional)</label>
            <select value={expenseForm.trip_id} onChange={(e) => setExpenseForm((f) => ({ ...f, trip_id: e.target.value }))}>
              <option value="">None</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_no || `#${t.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Amount</label>
            <input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <style>{`
        .cost-summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-left: 3px solid var(--accent);
          border-radius: var(--radius-md);
          padding: 14px 20px;
          font-size: 13.5px;
          color: var(--text-secondary);
        }
        .cost-summary-bar strong {
          font-size: 20px;
          color: var(--accent-strong);
        }
      `}</style>
    </Layout>
  );
}
