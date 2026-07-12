import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { tripsApi, vehiclesApi, driversApi, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/roles';
import './Trips.css';

const STAGES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const emptyForm = {
  source: '',
  destination: '',
  vehicle_id: '',
  driver_id: '',
  cargo_weight_kg: '',
  planned_distance_km: '',
};

export default function Trips() {
  const { role } = useAuth();
  const editable = canEdit(role, 'trips');

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [lastCreatedId, setLastCreatedId] = useState(null);

  const [actionError, setActionError] = useState(null);
  const [busyTripId, setBusyTripId] = useState(null);

  const [completeModal, setCompleteModal] = useState(null);
  const [completeForm, setCompleteForm] = useState({ final_odometer_km: '', fuel_consumed_l: '', fuel_cost: '', revenue: '' });
  const [completeError, setCompleteError] = useState(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, v, d] = await Promise.all([
        tripsApi.list(),
        vehiclesApi.list({ dispatchable: true }),
        driversApi.list({ dispatchable: true }),
      ]);
      setTrips(Array.isArray(t) ? t : t?.items || []);
      setVehicles(Array.isArray(v) ? v : v?.items || []);
      setDrivers(Array.isArray(d) ? d : d?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load trip data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(form.vehicle_id)),
    [vehicles, form.vehicle_id]
  );

  const cargoWeight = Number(form.cargo_weight_kg) || 0;
  const capacity = selectedVehicle ? Number(selectedVehicle.max_load_kg) || 0 : null;
  const capacityExceeded = capacity != null && cargoWeight > capacity;
  const overBy = capacityExceeded ? cargoWeight - capacity : 0;

  const canSubmit =
    editable &&
    form.source.trim() &&
    form.destination.trim() &&
    form.vehicle_id &&
    form.driver_id &&
    cargoWeight > 0 &&
    !capacityExceeded &&
    !creating;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (capacityExceeded) return;
    setCreating(true);
    try {
      const created = await tripsApi.create({
        source: form.source.trim(),
        destination: form.destination.trim(),
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id,
        cargo_weight_kg: cargoWeight,
        planned_distance_km: Number(form.planned_distance_km) || 0,
      });
      setForm(emptyForm);
      setLastCreatedId(created?.id ?? null);
      load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.detail || err.message : 'Failed to create trip.');
    } finally {
      setCreating(false);
    }
  };

  const doDispatch = async (trip) => {
    setActionError(null);
    setBusyTripId(trip.id);
    try {
      await tripsApi.dispatch(trip.id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail || err.message : 'Failed to dispatch trip.');
    } finally {
      setBusyTripId(null);
    }
  };

  const doCancel = async (trip) => {
    setActionError(null);
    setBusyTripId(trip.id);
    try {
      await tripsApi.cancel(trip.id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail || err.message : 'Failed to cancel trip.');
    } finally {
      setBusyTripId(null);
    }
  };

  const openComplete = (trip) => {
    setCompleteModal(trip);
    setCompleteForm({ final_odometer_km: '', fuel_consumed_l: '', fuel_cost: '', revenue: '' });
    setCompleteError(null);
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setCompleteError(null);
    if (!completeForm.final_odometer_km || !completeForm.fuel_consumed_l) {
      setCompleteError('Final odometer and fuel consumed are required.');
      return;
    }
    setCompleting(true);
    try {
      await tripsApi.complete(completeModal.id, {
        final_odometer_km: Number(completeForm.final_odometer_km),
        fuel_consumed_l: Number(completeForm.fuel_consumed_l),
        fuel_cost: Number(completeForm.fuel_cost) || 0,
        revenue: Number(completeForm.revenue) || 0,
      });
      setCompleteModal(null);
      load();
    } catch (err) {
      setCompleteError(err instanceof ApiError ? err.detail || err.message : 'Failed to complete trip.');
    } finally {
      setCompleting(false);
    }
  };

  const stageIndex = (status) => Math.max(0, STAGES.findIndex((s) => s.toLowerCase() === String(status).toLowerCase()));

  const visibleTrips = useMemo(() => {
    if (!search.trim()) return trips;
    const q = search.trim().toLowerCase();
    return trips.filter((t) =>
      [t.trip_no, t.source, t.destination, t.vehicle_name, t.vehicle_reg_no, t.driver_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [trips, search]);

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search trip#, route, vehicle, driver…">
      <PageHeader
        title="Trips / Trip Dispatcher"
        description="Create, dispatch, and track trips through their lifecycle."
      />

      <div className="two-col">
        <div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <h3 className="panel__title">Trip Lifecycle</h3>
            <div className="stepper">
              {STAGES.map((stage, i) => (
                <div className="stepper__item" key={stage}>
                  <div className={`stepper__dot stepper__dot--${stage.toLowerCase()}`}>{i + 1}</div>
                  <span>{stage}</span>
                  {i < STAGES.length - 1 ? <div className="stepper__line" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3 className="panel__title">Create Trip</h3>
            {!editable ? (
              <div className="info-banner">Your role has view-only access to Trips. Trip creation is disabled.</div>
            ) : null}
            {createError ? <div className="error-banner">{createError}</div> : null}
            <form className="form-grid" onSubmit={handleCreate}>
              <div className="form-field">
                <label>Source</label>
                <input
                  disabled={!editable}
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  placeholder="e.g. Mumbai Depot"
                />
              </div>
              <div className="form-field">
                <label>Destination</label>
                <input
                  disabled={!editable}
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  placeholder="e.g. Pune Warehouse"
                />
              </div>
              <div className="form-field">
                <label>Vehicle (available, with capacity)</label>
                <select disabled={!editable} value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg_no} — {v.name} ({v.max_load_kg} kg)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Driver (available / eligible)</label>
                <select disabled={!editable} value={form.driver_id} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}>
                  <option value="">Select driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.license_category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Cargo Weight (kg)</label>
                <input
                  disabled={!editable}
                  type="number"
                  min="0"
                  value={form.cargo_weight_kg}
                  onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Planned Distance (km)</label>
                <input
                  disabled={!editable}
                  type="number"
                  min="0"
                  value={form.planned_distance_km}
                  onChange={(e) => setForm((f) => ({ ...f, planned_distance_km: e.target.value }))}
                />
              </div>

              {capacityExceeded ? (
                <div className="error-banner">
                  Vehicle Capacity: {capacity} kg / Cargo Weight: {cargoWeight} kg / Capacity exceeded by {overBy} kg —
                  dispatch blocked
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 10 }}>
                <Button type="submit" disabled={!canSubmit}>
                  {creating ? 'Creating…' : 'Create Trip (Draft)'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel__title">Live Board</h3>
          {actionError ? <div className="error-banner">{actionError}</div> : null}
          {error ? <div className="error-banner">{error}</div> : null}
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : visibleTrips.length === 0 ? (
            <div className="data-table__state">
              {trips.length === 0 ? 'No trips yet. Create one from the form on the left.' : 'No trips match your search.'}
            </div>
          ) : (
            <div className="trip-cards">
              {visibleTrips.map((trip) => (
                <div className={`trip-card${trip.id === lastCreatedId ? ' trip-card--flash' : ''}`} key={trip.id}>
                  <div className="trip-card__top">
                    <strong>{trip.trip_no || `Trip #${trip.id}`}</strong>
                    <StatusPill status={trip.status} />
                  </div>
                  <div className="trip-card__route">
                    {trip.source} <span className="trip-card__arrow">→</span> {trip.destination}
                  </div>
                  <div className="trip-card__meta">
                    <span>{trip.vehicle_name || trip.vehicle_reg_no || '—'}</span>
                    <span>·</span>
                    <span>{trip.driver_name || '—'}</span>
                  </div>
                  <div className="trip-card__note">{trip.status_note || trip.eta || 'Awaiting driver'}</div>
                  <div className="trip-card__actions">
                    {String(trip.status).toLowerCase() === 'draft' && editable ? (
                      <>
                        <Button size="sm" onClick={() => doDispatch(trip)} disabled={busyTripId === trip.id}>
                          Dispatch
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => doCancel(trip)} disabled={busyTripId === trip.id}>
                          Cancel
                        </Button>
                      </>
                    ) : null}
                    {String(trip.status).toLowerCase() === 'dispatched' && editable ? (
                      <>
                        <Button size="sm" onClick={() => openComplete(trip)}>
                          Complete
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => doCancel(trip)} disabled={busyTripId === trip.id}>
                          Cancel
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!completeModal}
        onClose={() => setCompleteModal(null)}
        title={`Complete Trip ${completeModal?.trip_no || `#${completeModal?.id}`}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteModal(null)}>
              Cancel
            </Button>
            <Button onClick={submitComplete} disabled={completing}>
              {completing ? 'Completing…' : 'Mark Completed'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submitComplete}>
          {completeError ? <div className="error-banner">{completeError}</div> : null}
          <div className="form-field">
            <label>Final Odometer (km)</label>
            <input
              type="number"
              min="0"
              value={completeForm.final_odometer_km}
              onChange={(e) => setCompleteForm((f) => ({ ...f, final_odometer_km: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Fuel Consumed (L)</label>
            <input
              type="number"
              min="0"
              value={completeForm.fuel_consumed_l}
              onChange={(e) => setCompleteForm((f) => ({ ...f, fuel_consumed_l: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Fuel Cost</label>
            <input
              type="number"
              min="0"
              value={completeForm.fuel_cost}
              onChange={(e) => setCompleteForm((f) => ({ ...f, fuel_cost: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Revenue</label>
            <input
              type="number"
              min="0"
              value={completeForm.revenue}
              onChange={(e) => setCompleteForm((f) => ({ ...f, revenue: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
