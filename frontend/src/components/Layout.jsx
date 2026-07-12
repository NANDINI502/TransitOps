import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';
import './Layout.css';

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  fleet: 'Fleet',
  drivers: 'Drivers',
  trips: 'Trips',
  maintenance: 'Maintenance',
  'fuel-expenses': 'Fuel & Expenses',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function Layout({ children, onSearchChange, searchPlaceholder }) {
  const [search, setSearch] = useState('');
  const location = useLocation();

  const handleSearch = (val) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  const segment = location.pathname.split('/').filter(Boolean)[0] || '';
  const section = SECTION_LABELS[segment];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Topbar
          search={search}
          onSearchChange={onSearchChange ? handleSearch : undefined}
          searchPlaceholder={searchPlaceholder}
          section={section}
        />
        <main className="app-shell__content">{children}</main>
      </div>
      <ChatWidget />
    </div>
  );
}
