import './StatusPill.css';

const STATUS_TONE = {
  available: 'green',
  completed: 'green',
  active: 'green',
  success: 'green',
  onduty: 'green',
  'on duty': 'green',
  ontrip: 'blue',
  'on trip': 'blue',
  dispatched: 'blue',
  info: 'blue',
  inshop: 'amber',
  'in shop': 'amber',
  maintenance: 'amber',
  warning: 'amber',
  pending: 'amber',
  retired: 'red',
  suspended: 'red',
  cancelled: 'red',
  canceled: 'red',
  danger: 'red',
  expired: 'red',
  draft: 'gray',
  neutral: 'gray',
  offduty: 'gray',
  'off duty': 'gray',
};

export function toneForStatus(status) {
  if (!status) return 'gray';
  const key = String(status).toLowerCase().trim();
  return STATUS_TONE[key] || 'gray';
}

export default function StatusPill({ status, tone, children }) {
  const resolvedTone = tone || toneForStatus(status);
  return <span className={`status-pill status-pill--${resolvedTone}`}>{children ?? status}</span>;
}
