import axios from 'axios';

// Dynamic Host Resolution (Uses current server IP/hostname instead of hardcoded localhost)
const getApiBaseUrl = (port: string) => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:${port}`;
  }
  return `http://localhost:${port}`;
};

// ── Frappe API (Auth + Admin Config: Users, Devices, Tanks, Motors) ─────────
export const FrappeAPI = axios.create({
  baseURL: getApiBaseUrl('8000'),
  withCredentials: true,  // uses Frappe session cookie
});

// Auto-attach Frappe CSRF Token from cookie or localStorage if present
FrappeAPI.interceptors.request.use(config => {
  const token = localStorage.getItem('frappe_csrf_token');
  if (token) {
    config.headers['X-Frappe-CSRF-Token'] = token;
  } else {
    const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
    if (match) {
      config.headers['X-Frappe-CSRF-Token'] = decodeURIComponent(match[2]);
    }
  }
  return config;
});

// ── FastAPI (Telemetry only: Nimblevision real-time data) ────────────────────
export const TelemetryAPI = axios.create({
  baseURL: getApiBaseUrl('8001'),  // FastAPI dynamically targeting host on port 8001
});

TelemetryAPI.interceptors.request.use(config => {
  const token = localStorage.getItem('stp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Frappe Auth helpers ───────────────────────────────────────────────────────
export const frappeLogin = async (usr: string, pwd: string) => {
  const { data } = await FrappeAPI.post('/api/method/login', { usr, pwd });
  if (data.csrf_token) {
    FrappeAPI.defaults.headers.common['X-Frappe-CSRF-Token'] = data.csrf_token;
    localStorage.setItem('frappe_csrf_token', data.csrf_token);
  }
  return data;
};

export const frappeLogout = async () => {
  await FrappeAPI.get('/api/method/logout');
};

export const frappeGetCurrentUser = async () => {
  const { data } = await FrappeAPI.get('/api/method/frappe.auth.get_logged_user');
  return data.message as string;  // returns username string
};

// ── Frappe Layout API ─────────────────────────────────────────────────────────
export const frappeGetLayout = async () => {
  const { data } = await FrappeAPI.get('/api/method/stp_app.api.layout.get_user_layout');
  return data.message;
};

// ── Frappe DocType CRUD helpers  ─────────────────────────────────────────────
export const frappeGetList = async (doctype: string, fields?: string[], filters?: any) => {
  const params: any = { fields: JSON.stringify(fields || ['name']), limit_page_length: 200 };
  if (filters) params.filters = JSON.stringify(filters);
  const { data } = await FrappeAPI.get('/api/resource/' + encodeURIComponent(doctype), { params });
  return data.data || [];
};

export const frappeCreate = async (doctype: string, payload: object) => {
  const { data } = await FrappeAPI.post('/api/resource/' + doctype, payload);
  return data.data;
};

export const frappeUpdate = async (doctype: string, name: string, payload: object) => {
  const { data } = await FrappeAPI.put(`/api/resource/${doctype}/${name}`, payload);
  return data.data;
};

export const frappeDelete = async (doctype: string, name: string) => {
  await FrappeAPI.delete(`/api/resource/${doctype}/${name}`);
};

export default FrappeAPI;
