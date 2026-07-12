import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { dashboardApi, ApiError } from '../api/client';
import { DonutChart } from '../components/Charts';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, trips, vb] = await Promise.all([
        dashboardApi.kpis(filters),
        dashboardApi.recentTrips(),
        dashboardApi.vehicleStatusBreakdown(),
      ]);
      setKpis(k);
      setRecentTrips(Array.isArray(trips) ? trips : trips?.items || []);
      setBreakdown(vb);
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
              { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle_name || r.vehicle || '—' },
              { key: 'driver', header: 'Driver', render: (r) => r.driver_name || r.driver || '—' },
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

      <style>{`
      `}</style>
    </Layout>
  );
}
