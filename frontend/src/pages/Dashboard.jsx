import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { dashboardApi, tripsApi, vehiclesApi, driversApi, fuelApi, ApiError } from '../api/client';
import { DonutChart, BarChart, LineChart } from '../components/Charts';

const VEHICLE_TYPES = ['All Types', 'Truck', 'Van', 'Bus', 'Car'];
const STATUS_OPTIONS = ['All Statuses', 'Available', 'On Trip', 'In Shop', 'Retired'];
const REGIONS = ['All Regions', 'North', 'South', 'East', 'West'];

const KPI_DEFS = [
  { key: 'active_vehicles', label: 'Active Vehicles', accent: 'default' },
  { key: 'available_vehicles', label: 'Available Vehicles', accent: 'green' },
  { key: 'vehicles_in_maintenance', label: 'Vehicles in Maintenance', accent: 'amber' },
  { key: 'active_trips', label: 'Active Trips', accent: 'blue' },
  { key: 'pending_trips', label: 'Pending Trips', accent: 'gray' },
  { key: 'drivers_on_duty', label: 'Drivers On Duty', accent: 'green' },
  { key: 'fleet_utilization_pct', label: 'Fleet Utilization', accent: 'default', suffix: '%' },
];

export default function Dashboard() {
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [kpis, setKpis] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [allTrips, setAllTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, trips, vb, allT, v, d, fl] = await Promise.all([
        dashboardApi.kpis(filters),
        dashboardApi.recentTrips(),
        dashboardApi.vehicleStatusBreakdown(),
        tripsApi.list(),
        vehiclesApi.list(),
        driversApi.list(),
        fuelApi.list(),
      ]);
      setKpis(k);
      setRecentTrips(Array.isArray(trips) ? trips : trips?.items || []);
      setBreakdown(vb);
      setAllTrips(Array.isArray(allT) ? allT : allT?.items || []);
      setVehicles(Array.isArray(v) ? v : v?.items || []);
      setDrivers(Array.isArray(d) ? d : d?.items || []);
      setFuelLogs(Array.isArray(fl) ? fl : fl?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleTrips = search.trim()
    ? recentTrips.filter((r) => {
        const needle = search.trim().toLowerCase();
        return [r.trip_no, r.id, r.vehicle_name, r.vehicle, r.driver_name, r.driver]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle));
      })
    : recentTrips;

  const tripStatusData = ['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((status) => ({
    label: status,
    value: allTrips.filter((t) => t.status === status).length,
    tone: { Draft: 'gray', Dispatched: 'blue', Completed: 'green', Cancelled: 'red' }[status],
  }));

  const vehiclesByType = Object.entries(
    vehicles.reduce((acc, v) => {
      const type = v.type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const driverStatusData = ['Available', 'On Trip', 'Off Duty', 'Suspended'].map((status) => ({
    label: status,
    value: drivers.filter((d) => d.status === status).length,
    tone: { Available: 'green', 'On Trip': 'blue', 'Off Duty': 'gray', Suspended: 'red' }[status],
  }));

  const fuelCostByDate = Object.entries(
    fuelLogs.reduce((acc, f) => {
      const date = f.date || 'Unknown';
      acc[date] = (acc[date] || 0) + (Number(f.cost) || 0);
      return acc;
    }, {})
  )
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([label, value]) => ({ label, value }));

  return (
    <Layout onSearchChange={setSearch} searchPlaceholder="Search trips, vehicles, drivers…">
      <PageHeader
        title="Dashboard"
        description="Live overview of fleet activity, trips, and utilization."
        filters={
          <>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t === 'All Types' ? '' : t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s === 'All Statuses' ? '' : s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={filters.region} onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}>
              {REGIONS.map((r) => (
                <option key={r} value={r === 'All Regions' ? '' : r}>
                  {r}
                </option>
              ))}
            </select>
          </>
        }
      />

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stat-grid">
        {KPI_DEFS.map((def) => (
          <StatCard
            key={def.key}
            label={def.label}
            accent={def.accent}
            suffix={def.suffix}
            value={loading || !kpis ? '—' : kpis[def.key] ?? 0}
          />
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 className="panel__title">Recent Trips</h3>
          <DataTable
            loading={loading}
            error={null}
            emptyText="No recent trips."
            columns={[
              { key: 'trip_no', header: 'Trip#', render: (r) => r.trip_no || r.id },
              { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle_name || r.vehicle || '—', sortValue: (r) => r.vehicle_name || r.vehicle || '' },
              { key: 'driver', header: 'Driver', render: (r) => r.driver_name || r.driver || '—', sortValue: (r) => r.driver_name || r.driver || '' },
              { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
              { key: 'eta', header: 'ETA', render: (r) => r.eta || '—' },
            ]}
            rows={visibleTrips}
          />
        </div>

        <div className="panel">
          <h3 className="panel__title">Vehicle Status</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <DonutChart
              data={[
                { label: 'Available', value: breakdown ? Number(breakdown.available) || 0 : 0, tone: 'green' },
                { label: 'On Trip', value: breakdown ? Number(breakdown.on_trip) || 0 : 0, tone: 'blue' },
                { label: 'In Shop', value: breakdown ? Number(breakdown.in_shop) || 0 : 0, tone: 'amber' },
                { label: 'Retired', value: breakdown ? Number(breakdown.retired) || 0 : 0, tone: 'red' },
              ]}
            />
          )}
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3 className="panel__title">Trip Status</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <DonutChart data={tripStatusData} />
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">Vehicles by Type</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <BarChart data={vehiclesByType} formatValue={(v) => `${v} vehicle${v === 1 ? '' : 's'}`} />
          )}
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3 className="panel__title">Driver Status</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <DonutChart data={driverStatusData} />
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">Fuel Cost Trend</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <LineChart data={fuelCostByDate} />
          )}
        </div>
      </div>

      <style>{`
      `}</style>
    </Layout>
  );
}
