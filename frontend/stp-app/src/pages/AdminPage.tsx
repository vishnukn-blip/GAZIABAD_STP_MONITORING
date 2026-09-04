import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Server, Layers, Cpu, Trash2, Edit2, Save, X,
  LogOut, Droplets, ExternalLink, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  frappeGetList, frappeCreate, frappeUpdate, frappeDelete,
  getCentralDevices, saveCentralDevices,
  getCentralTanks, saveCentralTanks,
  getCentralMotors, saveCentralMotors
} from '../api';

const RUN_KEYS = ['current_1', 'current_2', 'current_3', 'current_4', 'low_pressure'];
const TRIP_KEYS = ['voltage_4', 'voltage_5', 'voltage_6', 'voltage_7', 'voltage_8'];

const ConfirmModal: React.FC<{ msg: string; onYes: () => void; onNo: () => void }> = ({ msg, onYes, onNo }) => (
  <div className="modal-overlay">
    <div className="modal-card" style={{ maxWidth: 360 }}>
      <h3 style={{ marginBottom: 12 }}>Confirm Delete</h3>
      <p style={{ color: '#94A3B8', marginBottom: 24 }}>{msg}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={onNo}>Cancel</button>
        <button className="btn-danger" onClick={onYes}>Delete</button>
      </div>
    </div>
  </div>
);

const DEFAULT_LOCAL_USERS = [
  { name: 'wabag@nimblevision.io', email: 'wabag@nimblevision.io', full_name: 'Wabag User', first_name: 'Wabag', enabled: 1 }
];

export const DEFAULT_LOCAL_DEVICES = [
  { name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_id: '350435032683868', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.657521, longitude: 77.376303, assigned_user: 'wabag@nimblevision.io', is_active: 1 },
  { name: 'VASUNDHARA SECTOR 17', device_name: 'VASUNDHARA SECTOR 17', device_id: '350435032680674', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.668500, longitude: 77.439000, assigned_user: 'wabag@nimblevision.io', is_active: 1 },
  { name: 'STP PLANT C', device_name: 'STP PLANT C', device_id: '350435032689659', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.672000, longitude: 77.442000, assigned_user: 'wabag@nimblevision.io', is_active: 1 },
  { name: 'VAISHALI SECTOR 6', device_name: 'VAISHALI SECTOR 6', device_id: '350435032681912', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.675000, longitude: 77.445000, assigned_user: 'wabag@nimblevision.io', is_active: 1 }
];

export const DEFAULT_LOCAL_TANKS = [
  { name: 'TANK_A', tank_name: 'TANK_A', device: '350435032683868', variant: 'main', capacity_liters: 8000000, display_order: 1 },
  { name: 'TANK_B', tank_name: 'TANK_B', device: '350435032680674', variant: 'main', capacity_liters: 8000000, display_order: 1 },
  { name: 'TANK_C', tank_name: 'TANK_C', device: '350435032689659', variant: 'main', capacity_liters: 8000000, display_order: 1 },
  { name: 'TANK_D', tank_name: 'TANK_D', device: '350435032681912', variant: 'main', capacity_liters: 8000000, display_order: 1 }
];

export const DEFAULT_LOCAL_MOTORS = [
  { name: 'MOTOR_A_1', motor_name: 'M1_60_HP', tank: 'TANK_A', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
  { name: 'MOTOR_A_2', motor_name: 'M2_75_HP', tank: 'TANK_A', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
  { name: 'MOTOR_A_3', motor_name: 'M3_60_HP', tank: 'TANK_A', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
  { name: 'MOTOR_A_4', motor_name: 'M4', tank: 'TANK_A', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
  { name: 'MOTOR_A_5', motor_name: 'M5', tank: 'TANK_A', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },
  { name: 'MOTOR_B_1', motor_name: 'M1_40_HP', tank: 'TANK_B', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
  { name: 'MOTOR_B_2', motor_name: 'M2_30_HP', tank: 'TANK_B', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
  { name: 'MOTOR_B_3', motor_name: 'M3', tank: 'TANK_B', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
  { name: 'MOTOR_B_4', motor_name: 'M4', tank: 'TANK_B', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
  { name: 'MOTOR_B_5', motor_name: 'M5', tank: 'TANK_B', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },
  { name: 'MOTOR_C_1', motor_name: 'MOTOR_C_1', tank: 'TANK_C', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
  { name: 'MOTOR_C_2', motor_name: 'MOTOR_C_2', tank: 'TANK_C', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
  { name: 'MOTOR_C_3', motor_name: 'MOTOR_C_3', tank: 'TANK_C', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
  { name: 'MOTOR_C_4', motor_name: 'MOTOR_C_4', tank: 'TANK_C', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
  { name: 'MOTOR_C_5', motor_name: 'MOTOR_C_5', tank: 'TANK_C', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },
  { name: 'MOTOR_D_1', motor_name: 'M1_30_HP', tank: 'TANK_D', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
  { name: 'MOTOR_D_2', motor_name: 'M2_30_HP', tank: 'TANK_D', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
  { name: 'MOTOR_D_3', motor_name: 'M3', tank: 'TANK_D', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
  { name: 'MOTOR_D_4', motor_name: 'M4', tank: 'TANK_D', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
  { name: 'MOTOR_D_5', motor_name: 'M5', tank: 'TANK_D', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 }
];

const AdminPage: React.FC = () => {
  const { fullName, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'devices' | 'tanks' | 'motors' | 'desk'>('users');

  const [users, setUsers] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({
    email: '', first_name: '', last_name: '', password: '', role: 'System User'
  });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await frappeGetList('User', ['name', 'email', 'full_name', 'first_name', 'enabled'], { enabled: 1 });
      if (data && data.length > 0) {
        setUsers(data);
        return;
      }
    } catch {}
    setUsers(DEFAULT_LOCAL_USERS);
  };

  const saveUser = async () => {
    setUserError(null);
    if (!userForm.email || (!editingUser && !userForm.password)) {
      setUserError('Email and Password are required.');
      return;
    }
    try {
      if (editingUser) {
        await frappeUpdate('User', editingUser.name, {
          first_name: userForm.first_name, last_name: userForm.last_name
        });
      } else {
        await frappeCreate('User', {
          email: userForm.email, first_name: userForm.first_name,
          last_name: userForm.last_name, new_password: userForm.password,
          send_welcome_email: 0, roles: [{ role: 'System User' }]
        });
      }
      fetchUsers();
      setUserForm({ email: '', first_name: '', last_name: '', password: '', role: 'System User' });
      setEditingUser(null);
    } catch (err: any) {
      const localUsers = JSON.parse(localStorage.getItem('stp_local_users') || JSON.stringify(DEFAULT_LOCAL_USERS));
      const fullNameStr = `${userForm.first_name} ${userForm.last_name}`.trim();
      const updated = [...localUsers, { name: userForm.email, email: userForm.email, full_name: fullNameStr, first_name: userForm.first_name, enabled: 1 }];
      localStorage.setItem('stp_local_users', JSON.stringify(updated));
      setUsers(updated);
      setUserForm({ email: '', first_name: '', last_name: '', password: '', role: 'System User' });
      setEditingUser(null);
    }
  };

  const [devices, setDevices] = useState<any[]>([]);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '', device_id: '', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.6685, longitude: 77.4390, assigned_user: '', is_active: 1
  });
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [confirmDevice, setConfirmDevice] = useState<any | null>(null);

  const fetchDevices = async () => {
    try {
      const data = await frappeGetList('STP Device',
        ['name', 'device_name', 'device_id', 'api_key', 'assigned_user', 'is_active']);
      if (data && data.length > 0) {
        setDevices(data);
        return;
      }
    } catch {}

    const central = await getCentralDevices();
    if (central && central.length > 0) {
      localStorage.setItem('stp_local_devices', JSON.stringify(central));
      setDevices(central);
      return;
    }

    const stored = localStorage.getItem('stp_local_devices');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.some((d: any) => d.device_id === '350435032683869' || d.device_id === '12345')) {
          localStorage.setItem('stp_local_devices', JSON.stringify(DEFAULT_LOCAL_DEVICES));
          saveCentralDevices(DEFAULT_LOCAL_DEVICES);
          setDevices(DEFAULT_LOCAL_DEVICES);
        } else {
          setDevices(parsed);
        }
      } catch {
        localStorage.setItem('stp_local_devices', JSON.stringify(DEFAULT_LOCAL_DEVICES));
        saveCentralDevices(DEFAULT_LOCAL_DEVICES);
        setDevices(DEFAULT_LOCAL_DEVICES);
      }
    } else {
      localStorage.setItem('stp_local_devices', JSON.stringify(DEFAULT_LOCAL_DEVICES));
      saveCentralDevices(DEFAULT_LOCAL_DEVICES);
      setDevices(DEFAULT_LOCAL_DEVICES);
    }
  };

  const saveDevice = async () => {
    try {
      if (editingDevice) {
        await frappeUpdate('STP Device', editingDevice.name, deviceForm);
      } else {
        await frappeCreate('STP Device', deviceForm);
      }
    } catch {}

    const currentList = JSON.parse(localStorage.getItem('stp_local_devices') || JSON.stringify(DEFAULT_LOCAL_DEVICES));
    let updatedList = [...currentList];
    const devName = deviceForm.device_name || `STP-DEV-${Date.now()}`;
    if (editingDevice) {
      updatedList = updatedList.map(d => d.name === editingDevice.name ? { ...d, name: deviceForm.device_name || d.name, ...deviceForm } : d);
    } else {
      updatedList.push({ name: devName, ...deviceForm });
    }
    localStorage.setItem('stp_local_devices', JSON.stringify(updatedList));
    saveCentralDevices(updatedList);
    setDevices(updatedList);
    setDeviceForm({ device_name: '', device_id: '', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.6685, longitude: 77.4390, assigned_user: '', is_active: 1 });
    setEditingDevice(null);
  };

  const [tanks, setTanks] = useState<any[]>([]);
  const [tankForm, setTankForm] = useState({
    tank_name: '', device: '', variant: 'main', capacity_liters: 8000000, display_order: 1
  });
  const [editingTank, setEditingTank] = useState<any | null>(null);
  const [confirmTank, setConfirmTank] = useState<any | null>(null);

  const fetchTanks = async () => {
    try {
      const data = await frappeGetList('STP Tank',
        ['name', 'tank_name', 'device', 'variant', 'capacity_liters', 'display_order']);
      if (data && data.length > 0) {
        setTanks(data);
        return;
      }
    } catch {}

    const central = await getCentralTanks();
    if (central && central.length > 0) {
      localStorage.setItem('stp_local_tanks', JSON.stringify(central));
      setTanks(central);
      return;
    }

    const stored = localStorage.getItem('stp_local_tanks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.some((t: any) => t.capacity_liters === 10000 || t.device === '12345' || t.name === 'TANK-002' || t.device === '350435032683869')) {
          localStorage.setItem('stp_local_tanks', JSON.stringify(DEFAULT_LOCAL_TANKS));
          saveCentralTanks(DEFAULT_LOCAL_TANKS);
          setTanks(DEFAULT_LOCAL_TANKS);
        } else {
          setTanks(parsed);
        }
      } catch {
        localStorage.setItem('stp_local_tanks', JSON.stringify(DEFAULT_LOCAL_TANKS));
        saveCentralTanks(DEFAULT_LOCAL_TANKS);
        setTanks(DEFAULT_LOCAL_TANKS);
      }
    } else {
      localStorage.setItem('stp_local_tanks', JSON.stringify(DEFAULT_LOCAL_TANKS));
      saveCentralTanks(DEFAULT_LOCAL_TANKS);
      setTanks(DEFAULT_LOCAL_TANKS);
    }
  };

  const saveTank = async () => {
    try {
      if (editingTank) {
        await frappeUpdate('STP Tank', editingTank.name, tankForm);
      } else {
        await frappeCreate('STP Tank', tankForm);
      }
    } catch {}

    const currentList = JSON.parse(localStorage.getItem('stp_local_tanks') || JSON.stringify(DEFAULT_LOCAL_TANKS));
    let updatedList = [...currentList];
    const tankName = tankForm.tank_name || `TANK-${Date.now()}`;
    if (editingTank) {
      updatedList = updatedList.map(t => t.name === editingTank.name ? { ...t, ...tankForm } : t);
    } else {
      updatedList.push({ name: tankName, ...tankForm });
    }
    localStorage.setItem('stp_local_tanks', JSON.stringify(updatedList));
    saveCentralTanks(updatedList);
    setTanks(updatedList);
    setTankForm({ tank_name: '', device: '', variant: 'main', capacity_liters: 8000000, display_order: 1 });
    setEditingTank(null);
  };

  const [motors, setMotors] = useState<any[]>([]);
  const [motorForm, setMotorForm] = useState({
    motor_name: '', tank: '', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1
  });
  const [editingMotor, setEditingMotor] = useState<any | null>(null);
  const [confirmMotor, setConfirmMotor] = useState<any | null>(null);

  const fetchMotors = async () => {
    try {
      const data = await frappeGetList('STP Motor',
        ['name', 'motor_name', 'tank', 'run_param_key', 'trip_param_key', 'display_order']);
      if (data && data.length > 0) {
        setMotors(data);
        return;
      }
    } catch {}

    const central = await getCentralMotors();
    if (central && central.length > 0) {
      localStorage.setItem('stp_local_motors', JSON.stringify(central));
      setMotors(central);
      return;
    }

    const stored = localStorage.getItem('stp_local_motors');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.some((m: any) => m.tank === 'TANK-002' || m.name === 'MOTOR-007' || m.name === 'MOTOR-008' || m.motor_name === 'MOTOR_D_1')) {
          localStorage.setItem('stp_local_motors', JSON.stringify(DEFAULT_LOCAL_MOTORS));
          saveCentralMotors(DEFAULT_LOCAL_MOTORS);
          setMotors(DEFAULT_LOCAL_MOTORS);
        } else {
          setMotors(parsed);
        }
      } catch {
        localStorage.setItem('stp_local_motors', JSON.stringify(DEFAULT_LOCAL_MOTORS));
        saveCentralMotors(DEFAULT_LOCAL_MOTORS);
        setMotors(DEFAULT_LOCAL_MOTORS);
      }
    } else {
      localStorage.setItem('stp_local_motors', JSON.stringify(DEFAULT_LOCAL_MOTORS));
      saveCentralMotors(DEFAULT_LOCAL_MOTORS);
      setMotors(DEFAULT_LOCAL_MOTORS);
    }
  };

  const saveMotor = async () => {
    try {
      if (editingMotor) {
        await frappeUpdate('STP Motor', editingMotor.name, motorForm);
      } else {
        await frappeCreate('STP Motor', motorForm);
      }
    } catch {}

    const currentList = JSON.parse(localStorage.getItem('stp_local_motors') || JSON.stringify(DEFAULT_LOCAL_MOTORS));
    let updatedList = [...currentList];
    const mName = motorForm.motor_name || `MOTOR-${Date.now()}`;
    if (editingMotor) {
      updatedList = updatedList.map(m => m.name === editingMotor.name ? { ...m, ...motorForm } : m);
    } else {
      updatedList.push({ name: mName, ...motorForm });
    }
    localStorage.setItem('stp_local_motors', JSON.stringify(updatedList));
    saveCentralMotors(updatedList);
    setMotors(updatedList);
    setMotorForm({ motor_name: '', tank: '', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 });
    setEditingMotor(null);
  };

  useEffect(() => {
    fetchUsers(); fetchDevices(); fetchTanks(); fetchMotors();
  }, []);

  const tabs = [
    { key: 'users', label: 'User Management', icon: <Users size={16} /> },
    { key: 'devices', label: 'Devices', icon: <Server size={16} /> },
    { key: 'tanks', label: 'Tanks', icon: <Layers size={16} /> },
    { key: 'motors', label: 'Motors', icon: <Cpu size={16} /> },
    { key: 'desk', label: 'Frappe Desk', icon: <ExternalLink size={16} /> },
  ];

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Droplets size={28} color="#38BDF8" />
          <div>
            <span className="brand-name">NIMBLE VISION</span>
            <span className="brand-sub">Admin Console</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(t => (
            <button key={t.key}
              className={`nav-item ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => {
                if (t.key === 'desk') {
                  window.open('http://localhost:8000/app', '_blank');
                } else {
                  setActiveTab(t.key as any);
                }
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="frappe-powered">
            <span className="frappe-label">Data stored in</span>
            <strong className="frappe-name">Frappe / MariaDB</strong>
          </div>
          <span className="admin-chip">👑 {fullName}</span>
          <button className="logout-btn" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">

        {/* ═══ USERS TAB ═══ */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <div className="section-header">
              <div>
                <h2>User Management</h2>
                <p>Create and manage Frappe users for STP system assignment — stored as <code>User</code> DocType</p>
              </div>
            </div>
            <div className="admin-form-card">
              <h3>{editingUser ? 'Edit User' : 'Create New Frappe User'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Email Address / Username</label>
                  <input className="form-input" type="email" placeholder="user@nimblevision.io" value={userForm.email}
                    disabled={!!editingUser}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>First Name</label>
                  <input className="form-input" placeholder="e.g. Rajesh" value={userForm.first_name}
                    onChange={e => setUserForm({ ...userForm, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input className="form-input" placeholder="e.g. Kumar" value={userForm.last_name}
                    onChange={e => setUserForm({ ...userForm, last_name: e.target.value })} />
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label>Password</label>
                    <input className="form-input" type="password" placeholder="Default: User@1234" value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="form-actions">
                {userError && <div style={{ color: '#F87171', fontSize: '0.85rem', width: '100%', marginBottom: 8 }}>⚠️ {userError}</div>}
                <button className="btn-primary" onClick={saveUser}><UserPlus size={14} /> {editingUser ? 'Update User' : 'Create User in Frappe'}</button>
                {editingUser && <button className="btn-secondary" onClick={() => { setEditingUser(null); setUserForm({ email: '', first_name: '', last_name: '', password: '', role: 'System User' }); }}><X size={14} /> Cancel</button>}
              </div>
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>User ID / Email</th><th>Full Name</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.name}>
                      <td><code>{u.email || u.name}</code></td>
                      <td>{u.full_name}</td>
                      <td><span className={`status-pill ${u.enabled ? 'online' : 'offline'}`}>{u.enabled ? 'Active' : 'Disabled'}</span></td>
                      <td className="actions">
                        <button className="icon-btn" onClick={() => { setEditingUser(u); setUserForm({ email: u.email || u.name, first_name: u.first_name || u.full_name, last_name: '', password: '', role: 'System User' }); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setConfirmUser(u)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>No additional users created yet. Use form above to add users.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ DEVICES TAB ═══ */}
        {activeTab === 'devices' && (
          <div className="admin-section">
            <div className="section-header">
              <div>
                <h2>Device Assignment</h2>
                <p>Link Nimblevision devices to Frappe users — stored as <code>STP Device</code> DocType</p>
              </div>
            </div>
            <div className="admin-form-card">
              <h3>{editingDevice ? 'Edit STP Device' : 'Assign New Device'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Device Name</label>
                  <input className="form-input" placeholder="e.g. STP Plant A" value={deviceForm.device_name}
                    onChange={e => setDeviceForm({ ...deviceForm, device_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Device ID <span className="hint">(Nimblevision)</span></label>
                  <input className="form-input" placeholder="e.g. 2453825" value={deviceForm.device_id}
                    onChange={e => setDeviceForm({ ...deviceForm, device_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Latitude <span className="hint">(Map Pin)</span></label>
                  <input className="form-input" type="number" step="0.000001" placeholder="e.g. 28.668500" value={deviceForm.latitude}
                    onChange={e => setDeviceForm({ ...deviceForm, latitude: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Longitude <span className="hint">(Map Pin)</span></label>
                  <input className="form-input" type="number" step="0.000001" placeholder="e.g. 77.439000" value={deviceForm.longitude}
                    onChange={e => setDeviceForm({ ...deviceForm, longitude: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Assigned Frappe Users <span className="hint">(Check all users who can view this device)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155', maxHeight: '160px', overflowY: 'auto' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: (deviceForm.assigned_user || '').includes('wabag@nimblevision.io') ? '#0284C7' : '#1E293B', color: '#FFF', fontSize: '12px', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={(deviceForm.assigned_user || '').includes('wabag@nimblevision.io')}
                        onChange={(e) => {
                          const currentArr = (deviceForm.assigned_user || '').split(',').map((u: string) => u.trim()).filter(Boolean);
                          const nextArr = e.target.checked
                            ? Array.from(new Set([...currentArr, 'wabag@nimblevision.io']))
                            : currentArr.filter((u: string) => u !== 'wabag@nimblevision.io');
                          setDeviceForm({ ...deviceForm, assigned_user: nextArr.join(', ') });
                        }}
                      />
                      Wabag User (wabag@nimblevision.io)
                    </label>
                    {users.map(u => {
                      const uEmail = u.email || u.name;
                      if (uEmail === 'wabag@nimblevision.io') return null;
                      const isSelected = (deviceForm.assigned_user || '').includes(uEmail);
                      return (
                        <label key={u.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: isSelected ? '#0284C7' : '#1E293B', color: '#FFF', fontSize: '12px', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentArr = (deviceForm.assigned_user || '').split(',').map((u: string) => u.trim()).filter(Boolean);
                              const nextArr = e.target.checked
                                ? Array.from(new Set([...currentArr, uEmail]))
                                : currentArr.filter((u: string) => u !== uEmail);
                              setDeviceForm({ ...deviceForm, assigned_user: nextArr.join(', ') });
                            }}
                          />
                          {u.full_name || u.first_name || uEmail} ({uEmail})
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={saveDevice}><Save size={14} /> {editingDevice ? 'Update' : 'Create in Frappe'}</button>
                {editingDevice && <button className="btn-secondary" onClick={() => { setEditingDevice(null); setDeviceForm({ device_name: '', device_id: '', api_key: 'chinnu', api_token: '257bbec888a81696529ee979804cca59', latitude: 28.6685, longitude: 77.4390, assigned_user: '', is_active: 1 }); }}><X size={14} /> Cancel</button>}
              </div>
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>DocType Name</th><th>Device Name</th><th>Device ID</th><th>Latitude</th><th>Longitude</th><th>Assigned Users</th><th>Actions</th></tr></thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.name}>
                      <td><code>{d.name}</code></td>
                      <td>{d.device_name}</td>
                      <td><code>{d.device_id}</code></td>
                      <td><code style={{ color: '#0284C7' }}>{d.latitude ?? 28.6685}</code></td>
                      <td><code style={{ color: '#0284C7' }}>{d.longitude ?? 77.4390}</code></td>
                      <td>
                        {((d.assigned_user || 'wabag@nimblevision.io').split(',').map((u: string) => u.trim()).filter(Boolean)).map((uStr: string) => (
                          <span key={uStr} style={{ display: 'inline-block', background: '#0284C722', border: '1px solid #0284C755', color: '#38BDF8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, marginRight: '4px', marginBottom: '2px' }}>
                            {uStr}
                          </span>
                        ))}
                      </td>
                      <td className="actions">
                        <button className="icon-btn" onClick={() => { setEditingDevice(d); setDeviceForm({ device_name: d.device_name, device_id: d.device_id, api_key: d.api_key || 'chinnu', api_token: d.api_token || '257bbec888a81696529ee979804cca59', latitude: d.latitude ?? 28.6685, longitude: d.longitude ?? 77.4390, assigned_user: d.assigned_user, is_active: d.is_active }); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setConfirmDevice(d)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>No devices assigned yet. Use form above to assign a device to a user.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TANKS TAB ═══ */}
        {activeTab === 'tanks' && (
          <div className="admin-section">
            <div className="section-header">
              <div>
                <h2>Tank Configuration</h2>
                <p>Define tanks per device — stored as <code>STP Tank</code> DocType in Frappe/MariaDB</p>
              </div>
            </div>
            <div className="admin-form-card">
              <h3>{editingTank ? 'Edit STP Tank' : 'Add Tank'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tank Name</label>
                  <input className="form-input" placeholder="e.g. Raw Sewage Sump" value={tankForm.tank_name}
                    onChange={e => setTankForm({ ...tankForm, tank_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Device <span className="hint">(STP Device)</span></label>
                  <select className="form-select" value={tankForm.device}
                    onChange={e => setTankForm({ ...tankForm, device: e.target.value })}>
                    <option value="">Select device...</option>
                    {devices.map(d => <option key={d.name} value={d.name}>{d.device_name} ({d.device_id})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Variant</label>
                  <select className="form-select" value={tankForm.variant}
                    onChange={e => setTankForm({ ...tankForm, variant: e.target.value })}>
                    <option value="main">Main (Overhead / Ground)</option>
                    <option value="underground">Underground (Sump Pit)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Capacity (Liters)</label>
                  <input type="number" className="form-input" value={tankForm.capacity_liters}
                    onChange={e => setTankForm({ ...tankForm, capacity_liters: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input type="number" className="form-input" min="1" value={tankForm.display_order}
                    onChange={e => setTankForm({ ...tankForm, display_order: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={saveTank}><Save size={14} /> {editingTank ? 'Update' : 'Add to Frappe'}</button>
                {editingTank && <button className="btn-secondary" onClick={() => { setEditingTank(null); setTankForm({ tank_name: '', device: '', variant: 'main', capacity_liters: 10000, display_order: 1 }); }}><X size={14} /> Cancel</button>}
              </div>
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Doc Name</th><th>Tank Name</th><th>Device</th><th>Variant</th><th>Capacity</th><th>Order</th><th>Actions</th></tr></thead>
                <tbody>
                  {tanks.map(t => (
                    <tr key={t.name}>
                      <td><code>{t.name}</code></td>
                      <td>{t.tank_name}</td>
                      <td>{t.device}</td>
                      <td><span className={`variant-badge ${t.variant}`}>{t.variant}</span></td>
                      <td>{t.capacity_liters?.toLocaleString()} L</td>
                      <td>{t.display_order}</td>
                      <td className="actions">
                        <button className="icon-btn" onClick={() => { setEditingTank(t); setTankForm({ tank_name: t.tank_name, device: t.device, variant: t.variant, capacity_liters: t.capacity_liters, display_order: t.display_order }); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setConfirmTank(t)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ MOTORS TAB ═══ */}
        {activeTab === 'motors' && (
          <div className="admin-section">
            <div className="section-header">
              <div>
                <h2>Motor Configuration</h2>
                <p>Map motors with Nimblevision parameter keys — stored as <code>STP Motor</code> DocType</p>
              </div>
            </div>
            <div className="admin-form-card">
              <h3>{editingMotor ? 'Edit STP Motor' : 'Add Motor'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Motor Name</label>
                  <input className="form-input" placeholder="e.g. Submersible Pump P-101" value={motorForm.motor_name}
                    onChange={e => setMotorForm({ ...motorForm, motor_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tank <span className="hint">(STP Tank)</span></label>
                  <select className="form-select" value={motorForm.tank}
                    onChange={e => setMotorForm({ ...motorForm, tank: e.target.value })}>
                    <option value="">Select tank...</option>
                    {tanks.map(t => <option key={t.name} value={t.name}>{t.tank_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Run Status Parameter <span className="hint">→ Motor ON/OFF</span></label>
                  <select className="form-select" value={motorForm.run_param_key}
                    onChange={e => setMotorForm({ ...motorForm, run_param_key: e.target.value })}>
                    {RUN_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trip Status Parameter <span className="hint">→ Motor Trip Alert</span></label>
                  <select className="form-select" value={motorForm.trip_param_key}
                    onChange={e => setMotorForm({ ...motorForm, trip_param_key: e.target.value })}>
                    {TRIP_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input type="number" className="form-input" min="1" value={motorForm.display_order}
                    onChange={e => setMotorForm({ ...motorForm, display_order: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={saveMotor}><Save size={14} /> {editingMotor ? 'Update' : 'Add to Frappe'}</button>
                {editingMotor && <button className="btn-secondary" onClick={() => { setEditingMotor(null); setMotorForm({ motor_name: '', tank: '', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 }); }}><X size={14} /> Cancel</button>}
              </div>
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Doc Name</th><th>Motor Name</th><th>Tank</th><th>Run Param</th><th>Trip Param</th><th>Order</th><th>Actions</th></tr></thead>
                <tbody>
                  {motors.map(m => (
                    <tr key={m.name}>
                      <td><code>{m.name}</code></td>
                      <td>{m.motor_name}</td>
                      <td>{m.tank}</td>
                      <td><code className="param-run">{m.run_param_key}</code></td>
                      <td><code className="param-trip">{m.trip_param_key}</code></td>
                      <td>{m.display_order}</td>
                      <td className="actions">
                        <button className="icon-btn" onClick={() => { setEditingMotor(m); setMotorForm({ motor_name: m.motor_name, tank: m.tank, run_param_key: m.run_param_key, trip_param_key: m.trip_param_key, display_order: m.display_order }); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setConfirmMotor(m)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Modals */}
      {confirmUser && <ConfirmModal msg={`Disable/Delete user "${confirmUser.full_name}" in Frappe?`} onYes={async () => {
        try { await frappeDelete('User', confirmUser.name); } catch {}
        const current = JSON.parse(localStorage.getItem('stp_local_users') || JSON.stringify(DEFAULT_LOCAL_USERS));
        const updated = current.filter((u: any) => u.name !== confirmUser.name);
        localStorage.setItem('stp_local_users', JSON.stringify(updated));
        setUsers(updated);
        setConfirmUser(null);
      }} onNo={() => setConfirmUser(null)} />}
      {confirmDevice && <ConfirmModal msg={`Delete device "${confirmDevice.device_name}" from Frappe?`} onYes={async () => {
        try { await frappeDelete('STP Device', confirmDevice.name); } catch {}
        const current = JSON.parse(localStorage.getItem('stp_local_devices') || JSON.stringify(DEFAULT_LOCAL_DEVICES));
        const updated = current.filter((d: any) => d.name !== confirmDevice.name);
        localStorage.setItem('stp_local_devices', JSON.stringify(updated));
        saveCentralDevices(updated);
        setDevices(updated);
        setConfirmDevice(null);
      }} onNo={() => setConfirmDevice(null)} />}
      {confirmTank && <ConfirmModal msg={`Delete tank "${confirmTank.tank_name}" from Frappe?`} onYes={async () => {
        try { await frappeDelete('STP Tank', confirmTank.name); } catch {}
        const current = JSON.parse(localStorage.getItem('stp_local_tanks') || JSON.stringify(DEFAULT_LOCAL_TANKS));
        const updated = current.filter((t: any) => t.name !== confirmTank.name);
        localStorage.setItem('stp_local_tanks', JSON.stringify(updated));
        saveCentralTanks(updated);
        setTanks(updated);
        setConfirmTank(null);
      }} onNo={() => setConfirmTank(null)} />}
      {confirmMotor && <ConfirmModal msg={`Delete motor "${confirmMotor.motor_name}" from Frappe?`} onYes={async () => {
        try { await frappeDelete('STP Motor', confirmMotor.name); } catch {}
        const current = JSON.parse(localStorage.getItem('stp_local_motors') || JSON.stringify(DEFAULT_LOCAL_MOTORS));
        const updated = current.filter((m: any) => m.name !== confirmMotor.name);
        localStorage.setItem('stp_local_motors', JSON.stringify(updated));
        saveCentralMotors(updated);
        setMotors(updated);
        setConfirmMotor(null);
      }} onNo={() => setConfirmMotor(null)} />}
    </div>
  );
};

export default AdminPage;
