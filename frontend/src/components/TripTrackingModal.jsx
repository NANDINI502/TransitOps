import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';
import Button from './Button';
import { tripsApi, ApiError } from '../api/client';
import './TripTrackingModal.css';

const AVG_SPEED_KMH = 40;

const CITY_COORDS = {
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  nashik: [19.9975, 73.7898],
  delhi: [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  hyderabad: [17.385, 78.4867],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  surat: [21.1702, 72.8311],
  lucknow: [26.8467, 80.9462],
  indore: [22.7196, 75.8577],
  coimbatore: [11.0168, 76.9558],
  vadodara: [22.3072, 73.1812],
  bhopal: [23.2599, 77.4126],
  amritsar: [31.634, 74.8723],
  ludhiana: [30.901, 75.8573],
  guwahati: [26.1445, 91.7362],
  nagpur: [21.1458, 79.0882],
};

function guessCoords(placeText) {
  const t = (placeText || '').toLowerCase();
  for (const key in CITY_COORDS) {
    if (t.includes(key)) return CITY_COORDS[key];
  }
  return null;
}

function computeTripProgress(trip) {
  const planned = Number(trip.planned_distance_km) || 0;
  let kmDriven = 0;
  let etaHours = null;
  let fraction = 0;

  if (trip.status === 'Draft') {
    kmDriven = 0;
    etaHours = planned > 0 ? planned / AVG_SPEED_KMH : null;
    fraction = 0;
  } else if (trip.status === 'Dispatched') {
    const startedAt = trip.dispatched_at ? new Date(trip.dispatched_at) : new Date(trip.created_at);
    const elapsedHours = Math.max(0, (Date.now() - startedAt.getTime()) / 3600000);
    kmDriven = Math.min(planned, elapsedHours * AVG_SPEED_KMH);
    fraction = planned > 0 ? kmDriven / planned : 0;
    etaHours = planned > 0 ? Math.max(0, (planned - kmDriven) / AVG_SPEED_KMH) : null;
  } else if (trip.status === 'Completed') {
    kmDriven = planned;
    fraction = 1;
    etaHours = 0;
  } else if (trip.status === 'Cancelled') {
    kmDriven = 0;
    fraction = 0;
    etaHours = null;
  }

  return { kmDriven: Math.round(kmDriven), etaHours, fraction: Math.min(1, fraction) };
}

function formatEta(hours) {
  if (hours == null) return '—';
  if (hours <= 0) return 'Arrived';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TripTrackingModal({ trip, onClose, onChanged }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const lineRef = useRef(null);
  const [flagBusy, setFlagBusy] = useState(false);
  const [flagError, setFlagError] = useState(null);

  useEffect(() => {
    if (!trip || !mapElRef.current) return undefined;

    mapRef.current = L.map(mapElRef.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);

    const render = () => {
      const map = mapRef.current;
      if (!map) return;
      const srcCoords = guessCoords(trip.source) || CITY_COORDS.mumbai;
      const destCoords = guessCoords(trip.destination) || CITY_COORDS.pune;
      const { fraction } = computeTripProgress(trip);

      const currentLat = srcCoords[0] + (destCoords[0] - srcCoords[0]) * fraction;
      const currentLng = srcCoords[1] + (destCoords[1] - srcCoords[1]) * fraction;

      map.setView([currentLat, currentLng], 7);

      if (lineRef.current) map.removeLayer(lineRef.current);
      lineRef.current = L.polyline([srcCoords, destCoords], {
        color: '#4f7cff',
        weight: 3,
        dashArray: '6 6',
      }).addTo(map);

      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([currentLat, currentLng])
        .addTo(map)
        .bindPopup(`${trip.vehicle_name || 'Vehicle'}<br>${trip.status}`);

      L.marker(srcCoords, { opacity: 0.6 }).addTo(map).bindTooltip(trip.source, { permanent: false });
    };

    const timer = setTimeout(render, 50);
    const interval = setInterval(render, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      lineRef.current = null;
    };
  }, [trip?.id]);

  if (!trip) return null;

  const { kmDriven, etaHours, fraction } = computeTripProgress(trip);

  const toggleFlag = async () => {
    setFlagError(null);
    setFlagBusy(true);
    try {
      const updated = await tripsApi.flag(trip.id, !trip.issue_flagged);
      onChanged?.(updated);
    } catch (err) {
      setFlagError(err instanceof ApiError ? err.detail || err.message : 'Failed to update flag.');
    } finally {
      setFlagBusy(false);
    }
  };

  return (
    <Modal open={!!trip} onClose={onClose} title={`${trip.source} → ${trip.destination}`} width="820px">
      <div className="trip-tracking">
        <div className="trip-tracking__map" ref={mapElRef} />

        <div className="trip-tracking__progress-bar">
          <div className="trip-tracking__progress-fill" style={{ width: `${(fraction * 100).toFixed(0)}%` }} />
        </div>

        <div className="trip-tracking__stats">
          <div className="trip-tracking__stat">
            <div className="trip-tracking__stat-label">Km driven</div>
            <div className="trip-tracking__stat-value">
              {kmDriven} / {trip.planned_distance_km != null ? trip.planned_distance_km : '—'} km
            </div>
          </div>
          <div className="trip-tracking__stat">
            <div className="trip-tracking__stat-label">ETA remaining</div>
            <div className="trip-tracking__stat-value">{formatEta(etaHours)}</div>
          </div>
          <div className="trip-tracking__stat">
            <div className="trip-tracking__stat-label">Status</div>
            <div className="trip-tracking__stat-value">{trip.status}</div>
          </div>
        </div>

        {flagError ? <div className="error-banner">{flagError}</div> : null}
        <div className="trip-tracking__issue-row">
          <div>
            <div className="trip-tracking__stat-label">Flagged issues</div>
            <div className={`trip-tracking__issue-status${trip.issue_flagged ? ' trip-tracking__issue-status--flagged' : ''}`}>
              {trip.issue_flagged ? 'Issue flagged' : 'No issues flagged'}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={toggleFlag} disabled={flagBusy}>
            {trip.issue_flagged ? 'Clear flag' : 'Flag issue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
