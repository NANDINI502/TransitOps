import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import './Login.css';

const ROLE_INFO = [
  { name: 'Fleet Manager', desc: 'Full control over vehicles & drivers, view-only on trips and analytics.' },
  { name: 'Dispatcher', desc: 'Creates, dispatches, and completes trips; read-only on fleet and drivers.' },
  { name: 'Safety Officer', desc: 'Manages driver records and safety scores; view-only elsewhere.' },
  { name: 'Financial Analyst', desc: 'Full access to fuel, expenses, and analytics; view-only on fleet and trips.' },
];

export default function Login() {
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      await login(email, password, remember);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left__inner">
          <div className="login-left__brand">
            <span className="login-left__mark">T</span>
            <span className="login-left__word">TransitOps</span>
          </div>
          <h1>Smart Transport Operations Platform</h1>
          <p className="login-left__tagline">
            Fleet, drivers, trips, maintenance, and fuel — orchestrated from one dark, focused console.
          </p>

          <div className="login-roles">
            <div className="login-roles__title">One login, four roles:</div>
            <ul>
              {ROLE_INFO.map((r) => (
                <li key={r.name}>
                  <span className="login-roles__name">{r.name}</span>
                  <span className="login-roles__desc">{r.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="login-form__sub">Use your TransitOps credentials to continue.</p>

          {authError ? <div className="error-banner">{authError}</div> : null}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@transitops.com"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="login-form__row">
            <label className="checkbox-row">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <a className="login-form__forgot" href="#" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <Button type="submit" disabled={submitting} className="login-form__submit">
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>

          <p className="login-form__seed">
            No account yet? Ask your admin to seed one via <code>POST /api/auth/register</code>.
          </p>
        </form>
      </div>
    </div>
  );
}
