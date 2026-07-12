const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

let tokenGetter = async () => null;

export function setTokenGetter(fn) {
  tokenGetter = fn;
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = 'GET', body, query, signal } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = await tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkErr) {
    throw new ApiError(
      'Network error — unable to reach the TransitOps API. Is the backend running?',
      0,
      networkErr.message
    );
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const detail = (isJson && data && data.detail) || (typeof data === 'string' ? data : null) || res.statusText;
    throw new ApiError(detail, res.status, detail);
  }

  return data;
}

async function download(path, { query } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    url += `?${params.toString()}`;
  }
  const headers = {};
  const token = await tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new ApiError(`Export failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'transitops-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const get = (path, query, opts) => request(path, { method: 'GET', query, ...opts });
const post = (path, body, opts) => request(path, { method: 'POST', body, ...opts });
const patch = (path, body, opts) => request(path, { method: 'PATCH', body, ...opts });
const del = (path, opts) => request(path, { method: 'DELETE', ...opts });

export const authApi = {
  me: () => get('/auth/me'),
  register: (payload) => post('/auth/register', payload),
};

export const dashboardApi = {
  kpis: (filters = {}) => get('/dashboard/kpis', filters),
  recentTrips: () => get('/dashboard/recent-trips'),
  vehicleStatusBreakdown: () => get('/dashboard/vehicle-status-breakdown'),
};

export const vehiclesApi = {
  list: (filters = {}) => get('/vehicles', filters),
  create: (payload) => post('/vehicles', payload),
  update: (id, payload) => patch(`/vehicles/${id}`, payload),
  remove: (id) => del(`/vehicles/${id}`),
  operationalCost: (id) => get(`/vehicles/${id}/operational-cost`),
};

export const driversApi = {
  list: (filters = {}) => get('/drivers', filters),
  create: (payload) => post('/drivers', payload),
  update: (id, payload) => patch(`/drivers/${id}`, payload),
};

export const tripsApi = {
  list: (filters = {}) => get('/trips', filters),
  create: (payload) => post('/trips', payload),
  dispatch: (id) => post(`/trips/${id}/dispatch`),
  complete: (id, payload) => post(`/trips/${id}/complete`, payload),
  cancel: (id) => post(`/trips/${id}/cancel`),
};

export const maintenanceApi = {
  list: () => get('/maintenance'),
  create: (payload) => post('/maintenance', payload),
  complete: (id) => post(`/maintenance/${id}/complete`),
};

export const fuelApi = {
  list: () => get('/fuel-logs'),
  create: (payload) => post('/fuel-logs', payload),
};

export const expensesApi = {
  list: () => get('/expenses'),
  create: (payload) => post('/expenses', payload),
};

export const analyticsApi = {
  summary: () => get('/analytics/summary'),
  topCostliestVehicles: () => get('/analytics/top-costliest-vehicles'),
  exportCsv: () => download('/analytics/export.csv'),
};

export const chatApi = {
  send: (messages) => post('/chat', { messages }),
};

export const riskApi = {
  predictTrip: (payload) => post('/risk/predict-trip', payload),
};

export { BASE_URL };
