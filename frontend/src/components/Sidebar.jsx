import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canView } from '../lib/roles';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, module: null },
  { to: '/fleet', label: 'Fleet', icon: FleetIcon, module: 'fleet' },
  { to: '/drivers', label: 'Drivers', icon: DriversIcon, module: 'drivers' },
  { to: '/trips', label: 'Trips', icon: TripsIcon, module: 'trips' },
  { to: '/maintenance', label: 'Maintenance', icon: MaintenanceIcon, module: 'fleet' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: FuelIcon, module: 'fuelExp' },
  { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon, module: 'analytics' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, module: null },
];

export default function Sidebar() {
  const { role } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">T</span>
        <span className="sidebar__brand-word">TransitOps</span>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const allowed = !item.module || !role || canView(role, item.module);
          if (!allowed) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar__footer">
        <span className="text-muted">v0.1 · hackathon build</span>
      </div>
    </aside>
  );
}

function iconProps() {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
}
function DashboardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function FleetIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 16V9a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v3" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M3 13h13" />
    </svg>
  );
}
function DriversIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}
function TripsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M9 18l-5-2V6l5 2m0 10l6-2m-6 2V8m6 8l5 2V8l-5-2m0 10V6m0 0L9 8" />
    </svg>
  );
}
function MaintenanceIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" />
    </svg>
  );
}
function FuelIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 21V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14" />
      <path d="M4 12h8" />
      <path d="M14 8l3 2v7a1.5 1.5 0 0 0 3 0v-5l-2-2" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
