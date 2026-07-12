import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { vehiclesApi, tripsApi, maintenanceApi } from '../api/client';
import './VehicleHealth.css';

const MOUNTAIN_KEYWORDS = [
  'shimla', 'manali', 'leh', 'ladakh', 'srinagar', 'mussoorie', 'nainital',
  'dehradun', 'darjeeling', 'gangtok', 'shillong', 'munnar', 'ooty',
  'kodaikanal', 'coorg', 'mount abu', 'gulmarg', 'pahalgam', 'rishikesh',
  'almora', 'kasauli', 'dalhousie', 'mcleodganj', 'auli', 'tawang',
  'rohtang', 'spiti', 'kinnaur', 'chopta', 'valley', 'hill', 'mountain',
  'ghat', 'pass', 'peak', 'ridge', 'highland',
];

function isMountainLocation(loc) {
  if (!loc) return false;
  const lower = loc.toLowerCase();
  return MOUNTAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

function isMountainTrip(trip) {
  return isMountainLocation(trip.source) || isMountainLocation(trip.destination);
}

function computeHealth(vehicle, vehicleTrips, vehicleMaintenance) {
  const totalTrips = vehicleTrips.length;
  const mountainTrips = vehicleTrips.filter(isMountainTrip).length;
  const plainsTrips = totalTrips - mountainTrips;
  const maintenanceCount = vehicleMaintenance.length;
  const odometer = vehicle.odometer_km || 0;
  const mountainRatio = totalTrips > 0 ? mountainTrips / totalTrips : 0;

  let score = 100;
  score -= totalTrips * 0.6;
  score -= mountainTrips * 2.2;
  score -= maintenanceCount * 3.5;
  score -= Math.floor(odometer / 12000) * 1.8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade = 'excellent';
  let gradeLabel = 'Excellent';
  if (score < 40) { grade = 'critical'; gradeLabel = 'Critical'; }
  else if (score < 60) { grade = 'fair'; gradeLabel = 'Fair'; }
  else if (score < 80) { grade = 'good'; gradeLabel = 'Good'; }

  let suggestion = null;
  if (mountainRatio > 0.4 && score < 65) {
    suggestion = 'Rotate to plains routes — high mountain wear detected';
  } else if (mountainRatio > 0.55) {
    suggestion = 'Consider plains rotation — prolonged mountain exposure';
  } else if (score < 30) {
    suggestion = 'Immediate inspection required — critical health';
  } else if (maintenanceCount >= 4) {
    suggestion = 'Frequent repairs — evaluate for major overhaul';
  } else if (grade === 'critical') {
    suggestion = 'Critical health score — schedule inspection';
  } else if (vehicle.status === 'In Shop' && maintenanceCount >= 2) {
    suggestion = 'Repeated shop visits — review maintenance history';
  }

  return {
    vehicleId: vehicle.id,
    regNo: vehicle.reg_no,
    name: vehicle.name,
    type: vehicle.type,
    status: vehicle.status,
    odometer,
    totalTrips,
    mountainTrips,
    plainsTrips,
    maintenanceCount,
    mountainRatio,
    score,
    grade,
    gradeLabel,
    suggestion,
  };
}

export default function VehicleHealth() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [v, t, m] = await Promise.all([
          vehiclesApi.list(),
          tripsApi.list(),
          maintenanceApi.list(),
        ]);
        setVehicles(v);
        setTrips(t);
        setMaintenance(m);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const healthData = useMemo(() => {
    return vehicles.map((v) => {
      const vTrips = trips.filter(
        (t) => t.vehicle_id === v.id && (t.status === 'Completed' || t.status === 'Dispatched')
      );
      const vMaint = maintenance.filter((m) => m.vehicle_id === v.id);
      return computeHealth(v, vTrips, vMaint);
    }).sort((a, b) => a.score - b.score);
  }, [vehicles, trips, maintenance]);

  const avgHealth = useMemo(() => {
    if (!healthData.length) return 0;
    return Math.round(healthData.reduce((s, h) => s + h.score, 0) / healthData.length);
  }, [healthData]);

  const criticalCount = healthData.filter((h) => h.grade === 'critical').length;
  const rotationCount = healthData.filter((h) => h.suggestion).length;
  const totalMountainTrips = healthData.reduce((s, h) => s + h.mountainTrips, 0);

  const rotationSuggestions = healthData.filter((h) => h.suggestion);

  const columns = [
    {
      key: 'regNo',
      header: 'Vehicle',
      render: (row) => (
        <div className="vh-vehicle-cell">
          <span className="vh-vehicle-cell__reg">{row.regNo}</span>
          <span className="vh-vehicle-cell__name">{row.name}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Type' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
    { key: 'totalTrips', header: 'Trips', align: 'right' },
    {
      key: 'mountainTrips',
      header: '⛰ Mountain',
      align: 'right',
      render: (row) => (
        <span className={row.mountainTrips > 0 ? 'vh-mountain-count' : ''}>
          {row.mountainTrips}
        </span>
      ),
    },
    { key: 'plainsTrips', header: '🏞 Plains', align: 'right' },
    { key: 'maintenanceCount', header: 'Repairs', align: 'right' },
    {
      key: 'odometer',
      header: 'Odometer',
      align: 'right',
      render: (row) => `${row.odometer.toLocaleString()} km`,
    },
    {
      key: 'score',
      header: 'Health',
      align: 'center',
      render: (row) => (
        <div className="vh-health-cell">
          <div className="vh-health-bar">
            <div
              className={`vh-health-bar__fill vh-health-bar__fill--${row.grade}`}
              style={{ width: `${row.score}%` }}
            />
          </div>
          <span className={`vh-health-score vh-health-score--${row.grade}`}>
            {row.score}
          </span>
        </div>
      ),
    },
    {
      key: 'suggestion',
      header: 'Action',
      render: (row) =>
        row.suggestion ? (
          <span className="vh-action-tag">⚠ {row.suggestion}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Vehicle Health"
        description="Terrain-based wear analysis and smart rotation recommendations"
      />

      {error && <div className="error-banner">{error}</div>}

      <div className="stat-grid">
        <StatCard
          label="Avg Fleet Health"
          value={avgHealth}
          suffix="/100"
          accent={avgHealth >= 70 ? 'green' : avgHealth >= 45 ? 'amber' : 'red'}
        />
        <StatCard
          label="Critical Vehicles"
          value={criticalCount}
          accent={criticalCount > 0 ? 'red' : 'green'}
          hint="Health below 40"
        />
        <StatCard
          label="Rotation Needed"
          value={rotationCount}
          accent={rotationCount > 0 ? 'amber' : 'green'}
          hint="Terrain rebalancing"
        />
        <StatCard
          label="Mountain Trips"
          value={totalMountainTrips}
          accent="blue"
          hint="Higher terrain wear"
        />
      </div>

      {rotationSuggestions.length > 0 && (
        <div className="vh-rotation-panel panel">
          <h3 className="panel__title">🔄 Rotation Recommendations</h3>
          <p className="vh-rotation-desc">
            Vehicles operating frequently on mountain terrain experience accelerated wear.
            Rotating them to plains routes extends operational life by 25-40%.
          </p>
          <div className="vh-rotation-grid">
            {rotationSuggestions.map((item) => (
              <div key={item.vehicleId} className={`vh-rotation-card vh-rotation-card--${item.grade}`}>
                <div className="vh-rotation-card__header">
                  <div>
                    <div className="vh-rotation-card__reg">{item.regNo}</div>
                    <div className="vh-rotation-card__name">{item.name}</div>
                  </div>
                  <div className={`vh-score-badge vh-score-badge--${item.grade}`}>
                    {item.score}
                  </div>
                </div>
                <div className="vh-rotation-card__stats">
                  <div className="vh-rotation-card__stat">
                    <span>Mountain</span>
                    <strong>{item.mountainTrips}</strong>
                  </div>
                  <div className="vh-rotation-card__stat">
                    <span>Plains</span>
                    <strong>{item.plainsTrips}</strong>
                  </div>
                  <div className="vh-rotation-card__stat">
                    <span>Repairs</span>
                    <strong>{item.maintenanceCount}</strong>
                  </div>
                </div>
                <div className="vh-rotation-card__suggestion">
                  {item.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h3 className="panel__title">Fleet Health Overview</h3>
        <DataTable
          columns={columns}
          rows={healthData}
          loading={loading}
          emptyText="No vehicle data available"
          rowKey="vehicleId"
        />
      </div>
    </Layout>
  );
}
