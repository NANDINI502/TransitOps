import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { analyticsApi, ApiError } from '../api/client';

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
  const maxRevenue = Math.max(1, ...topRevenue.map((v) => Number(v.revenue) || 0));
  const maxCostliest = Math.max(1, ...topCostliest.map((v) => Number(v.total_operational_cost ?? v.total_cost) || 0));

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
            <div className="bar-chart">
              {topRevenue.map((v) => {
                const h = Math.max(4, Math.round((Number(v.revenue) / maxRevenue) * 160));
                return (
                  <div className="bar-chart__col" key={v.vehicle_id}>
                    <div className="bar-chart__value">₹{Number(v.revenue).toLocaleString()}</div>
                    <div className="bar-chart__bar" style={{ height: `${h}px` }} />
                    <div className="bar-chart__label">{v.reg_no || v.name}</div>
                  </div>
                );
              })}
            </div>
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
            <div className="hbar-list">
              {topCostliest.map((v) => {
                const cost = Number(v.total_operational_cost ?? v.total_cost) || 0;
                const pct = Math.round((cost / maxCostliest) * 100);
                return (
                  <div className="hbar-list__row" key={v.vehicle_id || v.reg_no}>
                    <div className="hbar-list__label">{v.reg_no || v.name}</div>
                    <div className="hbar-list__track">
                      <div className="hbar-list__bar" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="hbar-list__value mono">₹{cost.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bar-chart { display: flex; align-items: flex-end; gap: 14px; height: 220px; padding-top: 10px; }
        .bar-chart__col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; height: 100%; }
        .bar-chart__value { font-size: 10.5px; color: var(--text-muted); }
        .bar-chart__bar { width: 100%; max-width: 34px; background: linear-gradient(180deg, var(--accent-strong), var(--accent)); border-radius: 4px 4px 0 0; }
        .bar-chart__label { font-size: 11px; color: var(--text-secondary); }

        .hbar-list { display: flex; flex-direction: column; gap: 14px; }
        .hbar-list__row { display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; gap: 10px; }
        .hbar-list__label { font-size: 12.5px; color: var(--text-primary); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hbar-list__track { height: 10px; background: var(--bg-elevated); border-radius: 999px; overflow: hidden; }
        .hbar-list__bar { height: 100%; background: var(--status-red); border-radius: 999px; }
        .hbar-list__value { text-align: right; font-size: 12.5px; color: var(--text-secondary); }
      `}</style>
    </Layout>
  );
}
