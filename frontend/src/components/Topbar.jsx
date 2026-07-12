import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';
import './Topbar.css';

function initialsFor(name, email) {
  const src = name || email || '?';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function Topbar({ search, onSearchChange, searchPlaceholder = 'Search…' }) {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar__search">
        {onSearchChange ? (
          <>
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </>
        ) : null}
      </div>
      <div className="topbar__user">
        <span className="topbar__name">{profile?.name || profile?.email || 'Guest'}</span>
        {role ? <span className="role-badge">{ROLE_LABELS[role] || role}</span> : null}
        <div className="topbar__avatar" title={profile?.email}>
          {initialsFor(profile?.name, profile?.email)}
        </div>
        <button className="topbar__logout" onClick={handleLogout} title="Sign out">
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
