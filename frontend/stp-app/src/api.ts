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
  timeout: 2500, // 2.5s timeout: if Frappe port 8000 is unreachable, fail fast & login instantly
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
  timeout: 5000,
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

// ── Centralized Server Config Helpers (Port 8001 Cross-Browser Sync) ─────────
export const getCentralDevices = async () => {
  try {
    const { data } = await TelemetryAPI.get('/api/config/devices');
    return data;
  } catch {
    return null;
  }
};

export const saveCentralDevices = async (devices: any[]) => {
  try {
    await TelemetryAPI.post('/api/config/devices', devices);
  } catch {}
};

export const getCentralTanks = async () => {
  try {
    const { data } = await TelemetryAPI.get('/api/config/tanks');
    return data;
  } catch {
    return null;
  }
};

export const saveCentralTanks = async (tanks: any[]) => {
  try {
    await TelemetryAPI.post('/api/config/tanks', tanks);
  } catch {}
};

export const getCentralMotors = async () => {
  try {
    const { data } = await TelemetryAPI.get('/api/config/motors');
    return data;
  } catch {
    return null;
  }
};

export const saveCentralMotors = async (motors: any[]) => {
  try {
    await TelemetryAPI.post('/api/config/motors', motors);
  } catch {}
};

export const getCentralUsers = async () => {
  try {
    const { data } = await TelemetryAPI.get('/api/config/users');
    return data;
  } catch {
    return null;
  }
};

export const saveCentralUsers = async (users: any[]) => {
  try {
    await TelemetryAPI.post('/api/config/users', users);
  } catch {}
};

export const getElectricalTelemetry = async (deviceId: string, meterId?: string) => {
  try {
    const url = meterId ? `/api/telemetry/electrical/${deviceId}?meter_id=${meterId}` : `/api/telemetry/electrical/${deviceId}`;
    const { data } = await TelemetryAPI.get(url);
    if (data) {
      return {
        status: data.status,
        timestamp: data.timestamp,
        has_data: data.has_data !== false,
        meter_id: data.meter_id || (data.data && data.data.meter_id) || "1",
        ...(data.data || {})
      };
    }
  } catch {}
  return null;
};

export const getElectricalMeters = async (deviceId: string) => {
  try {
    const { data } = await TelemetryAPI.get(`/api/telemetry/electrical/${deviceId}/meters`);
    if (data && data.meters && data.meters.length > 0) {
      return data.meters;
    }
  } catch {}
  return ["1"];
};

export const getTariffConfig = async (deviceId: string) => {
  try {
    const { data } = await TelemetryAPI.get(`/api/config/tariff/${deviceId}`);
    if (data && data.data) {
      return data.data;
    }
  } catch {}
  return { tariff_rate: 7.50, sanctioned_load: 50.0, demand_charge: 275.0, duty_rate: 7.5 };
};

export const saveTariffConfig = async (payload: any) => {
  try {
    const { data } = await TelemetryAPI.post('/api/config/tariff', payload);
    return data;
  } catch {}
  return null;
};

export default FrappeAPI;
