import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { analyticsApi, ApiError } from '../api/client';
import { LineChart, BarChart } from '../components/Charts';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [topCostliest, setTopCostliest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, tc] = await Promise.all([analyticsApi.summary(), analyticsApi.topCostliestVehicles()]);
      setSummary(s);
      setTopCostliest(Array.isArray(tc) ? tc : tc?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      await analyticsApi.exportCsv();
    } catch (err) {
      setExportError(err instanceof ApiError ? err.detail || err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const perVehicleRoi = summary?.per_vehicle_roi || [];
  const totalRevenue = perVehicleRoi.reduce((sum, v) => sum + (Number(v.revenue) || 0), 0);
  const avgRoiPct = perVehicleRoi.length
    ? (perVehicleRoi.reduce((sum, v) => sum + (Number(v.roi) || 0), 0) / perVehicleRoi.length) * 100
    : 0;
  const topRevenue = [...perVehicleRoi].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 8);

  return (
    <Layout>
      <PageHeader
        title="Analytics"
        description="Fleet performance, cost efficiency, and return on investment."
        actions={
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      {error ? <div className="error-banner">{error}</div> : null}
      {exportError ? <div className="error-banner">{exportError}</div> : null}

      <div className="stat-grid">
        <StatCard label="Fuel Efficiency" value={loading ? '—' : summary?.fuel_efficiency_km_per_l ?? 0} suffix="km/l" />
        <StatCard label="Fleet Utilization" value={loading ? '—' : summary?.fleet_utilization_pct ?? 0} suffix="%" />
        <StatCard
          label="Operational Cost"
          value={loading ? '—' : `₹${Number(summary?.total_operational_cost ?? 0).toLocaleString()}`}
        />
        <StatCard label="Avg. Vehicle ROI" value={loading ? '—' : Number(avgRoiPct.toFixed(1))} suffix="%" />
      </div>
      <p className="helper-text" style={{ marginTop: -10, marginBottom: 20 }}>
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      <div className="two-col">
        <div className="panel">
          <h3 className="panel__title">Top Revenue by Vehicle</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : topRevenue.length === 0 || totalRevenue === 0 ? (
            <div className="data-table__state">No revenue data yet.</div>
          ) : (
            <LineChart
              data={topRevenue.map((v) => ({
                label: v.reg_no || v.name,
                value: Number(v.revenue) || 0,
              }))}
            />
          )}
        </div>

        <div className="panel">
          <h3 className="panel__title">Top Costliest Vehicles</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : topCostliest.length === 0 ? (
            <div className="data-table__state">No cost data yet.</div>
          ) : (
            <BarChart
              data={topCostliest.map((v) => ({
                label: v.reg_no || v.name,
                value: Number(v.total_operational_cost ?? v.total_cost) || 0,
              }))}
            />
          )}
        </div>
      </div>

      <style>{`
      `}</style>
    </Layout>
  );
}
