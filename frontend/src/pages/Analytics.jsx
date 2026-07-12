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

  const monthlyRevenue = summary?.monthly_revenue || [];
  const maxRevenue = Math.max(1, ...monthlyRevenue.map((m) => Number(m.revenue) || 0));
  const maxCostliest = Math.max(1, ...topCostliest.map((v) => Number(v.total_cost) || 0));

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
        <StatCard label="Fuel Efficiency" value={loading ? '—' : summary?.fuel_efficiency_kmpl ?? 0} suffix="km/l" />
        <StatCard label="Fleet Utilization" value={loading ? '—' : summary?.fleet_utilization_pct ?? 0} suffix="%" />
        <StatCard
          label="Operational Cost"
          value={loading ? '—' : `₹${Number(summary?.operational_cost ?? 0).toLocaleString()}`}
        />
        <StatCard label="Vehicle ROI" value={loading ? '—' : summary?.vehicle_roi_pct ?? 0} suffix="%" />
      </div>
      <p className="helper-text" style={{ marginTop: -10, marginBottom: 20 }}>
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      <div className="two-col">
        <div className="panel">
          <h3 className="panel__title">Monthly Revenue</h3>
          {loading ? (
            <div className="data-table__state">
              <div className="spinner" /> Loading…
            </div>
          ) : monthlyRevenue.length === 0 ? (
            <div className="data-table__state">No revenue data yet.</div>
          ) : (
            <div className="bar-chart">
              {monthlyRevenue.map((m) => {
                const h = Math.max(4, Math.round((Number(m.revenue) / maxRevenue) * 160));
                return (
                  <div className="bar-chart__col" key={m.month}>
                    <div className="bar-chart__value">₹{Number(m.revenue).toLocaleString()}</div>
                    <div className="bar-chart__bar" style={{ height: `${h}px` }} />
                    <div className="bar-chart__label">{m.month}</div>
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
                const pct = Math.round((Number(v.total_cost) / maxCostliest) * 100);
                return (
                  <div className="hbar-list__row" key={v.vehicle_id || v.reg_no}>
                    <div className="hbar-list__label">{v.reg_no || v.name}</div>
                    <div className="hbar-list__track">
                      <div className="hbar-list__bar" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="hbar-list__value mono">₹{Number(v.total_cost).toLocaleString()}</div>
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
