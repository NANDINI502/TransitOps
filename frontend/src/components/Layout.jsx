import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './Layout.css';

export default function Layout({ children, onSearchChange, searchPlaceholder }) {
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSearch = (val) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className="app-shell__main">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          search={search}
          onSearchChange={onSearchChange ? handleSearch : undefined}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}
