import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { authApi, ApiError } from '../api/client';
import { ROLES, ROLE_LABELS } from '../lib/roles';

const emptyForm = { email: '', password: '', name: '', role: ROLES.DISPATCHER };

export default function Seed() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      await authApi.register(form);
      setStatus({ type: 'success', message: `Created ${form.email} as ${ROLE_LABELS[form.role]}.` });
      setForm(emptyForm);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.detail || err.message : 'Failed to seed user.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="panel" style={{ width: 420, maxWidth: '100%' }}>
        <h3 className="panel__title">Seed a demo user</h3>
        <p className="text-secondary" style={{ marginTop: -8, fontSize: 12.5 }}>
          Calls <code>POST /api/auth/register</code> (no auth) — for local/demo setup only.
        </p>

        {status ? (
          <div className={status.type === 'error' ? 'error-banner' : 'info-banner'}>{status.message}</div>
        ) : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create demo user'}
          </Button>
        </form>

        <p className="helper-text">
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
