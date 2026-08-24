import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Droplets, Power, AlertTriangle, LogOut, RefreshCw, Wifi, WifiOff, Clock, Camera, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { frappeGetLayout, TelemetryAPI, getCentralDevices, getCentralTanks, getCentralMotors } from '../api';
import { DeviceLayout, TelemetryResponse, TankTelemetry } from '../types';
import { TelemetryCharts } from '../components/TelemetryCharts';
import { DeviceMap } from '../components/DeviceMap';
import { CameraMonitoring } from '../components/CameraMonitoring';
import { ElectricalParameters } from '../components/ElectricalParameters';

const POLL_INTERVAL = 5000;



interface TankCardProps {
  tankLayout: DeviceLayout['tanks'][0];
  telemetry: TankTelemetry | null;
  index: number;
  total: number;
}

const TankCard: React.FC<TankCardProps> = ({ tankLayout, telemetry, index }) => {
  const level = telemetry?.water_level_percent ?? 0;
  const capacity = tankLayout.capacity_liters || 8000000;
  const volume = Math.round((level / 100) * capacity);
  const tankDisplayName = tankLayout.name || (tankLayout as any).tank_name || telemetry?.tank_name || `Tank ${index + 1}`;
  const fillHeight = Math.max(0, Math.min(100, level));

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #CBD5E1',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      minWidth: '280px',
      maxWidth: '420px'
    }}>
      {/* Tank Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#F0F9FF', padding: '6px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
            <Droplets size={18} color="#0284C7" />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {tankDisplayName}
          </h4>
        </div>

        <span style={{
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontWeight: 700,
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#059669',
            boxShadow: '0 0 6px #059669'
          }} />
          ONLINE
        </span>
      </div>

      {/* Simple Water Tank Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '220px',
        height: '270px',
        border: '3px solid #94A3B8',
        borderRadius: '24px 24px 16px 16px',
        background: '#F8FAFC',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 10px rgba(15, 23, 42, 0.06)'
      }}>
        {/* Scale Ticks */}
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '12px',
          bottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#64748B',
          fontWeight: 700,
          zIndex: 3
        }}>
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Dynamic Water Liquid Fill */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fillHeight}%`,
          background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
          transition: 'height 0.8s ease-in-out',
          zIndex: 1
        }}>
          {/* Surface reflection */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'rgba(255, 255, 255, 0.6)',
            boxShadow: '0 1px 4px rgba(255, 255, 255, 0.8)'
          }} />
        </div>

        {/* Center Digital Percentage Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '10px 16px',
          textAlign: 'center',
          color: '#FFFFFF',
          zIndex: 4,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38BDF8', letterSpacing: '-0.5px' }}>
            {level}%
          </div>
          <div style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap' }}>
            {volume.toLocaleString()} / {capacity.toLocaleString()} L
          </div>
        </div>
      </div>

      {/* Motor 1 to Motor 5 Status Badges Row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        marginTop: '8px',
        paddingTop: '14px',
        borderTop: '1px dashed #E2E8F0'
      }}>
        {tankLayout.motors.map((motor, mi) => {
          const ms = telemetry?.motors.find(m => m.run_param_key === motor.run_param_key) || telemetry?.motors[mi];
          const motorDisplayName = motor.name || (motor as any).motor_name || `Motor ${mi + 1}`;
          const isRunning = ms?.is_running ?? false;
          const isTripped = ms?.is_tripped ?? false;

          return (
            <div key={motor.id || mi} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isTripped ? '#FEF2F2' : isRunning ? '#ECFDF5' : '#F8FAFC',
              border: `1px solid ${isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`,
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: isTripped ? '#DC2626' : isRunning ? '#059669' : '#475569',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}>
              <Power size={12} color={isTripped ? '#DC2626' : isRunning ? '#059669' : '#64748B'} />
              <span>{motorDisplayName}</span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                background: isTripped ? '#FEE2E2' : isRunning ? '#D1FAE5' : '#E2E8F0',
                color: isTripped ? '#991B1B' : isRunning ? '#065F46' : '#334155'
              }}>
                {isTripped ? 'TRIP' : isRunning ? 'ON' : 'OFF'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const buildDeviceLayoutFromLocal = (devId: string): DeviceLayout => {
  const defaultDevs = [
    { name: 'STP-DEV-001', device_name: 'STP Telemetry Device', device_id: '863110085106451', api_key: 'chinnu' },
    { name: 'STP PLANT A', device_name: 'STP PLANT A', device_id: '350435032683868', api_key: 'chinnu' },
    { name: 'VASUNDHARA SECTOR 17', device_name: 'VASUNDHARA SECTOR 17', device_id: '350435032680674', api_key: 'chinnu' },
    { name: 'STP PLANT C', device_name: 'STP PLANT C', device_id: '350435032689659', api_key: 'chinnu' },
    { name: 'STP PLANT D', device_name: 'STP PLANT D', device_id: '350435032681912', api_key: 'chinnu' }
  ];
  const localDevsStr = localStorage.getItem('stp_local_devices');
  const allDevs = localDevsStr ? JSON.parse(localDevsStr) : defaultDevs;
  const currentDev = allDevs.find((d: any) =>
    d.device_id === devId ||
    d.name === devId ||
    d.device_name === devId
  ) || {
    device_id: devId,
    device_name: devId === '863110085106451' ? 'STP Telemetry Device' : devId,
    name: devId
  };

  const defaultTanks = [
    { name: 'TANK_A', tank_name: 'TANK_A', device: '350435032683868', variant: 'main', capacity_liters: 8000000, display_order: 1 },
    { name: 'TANK_B', tank_name: 'TANK_B', device: '350435032680674', variant: 'main', capacity_liters: 8000000, display_order: 1 },
    { name: 'TANK_C', tank_name: 'TANK_C', device: '350435032689659', variant: 'main', capacity_liters: 8000000, display_order: 1 },
    { name: 'TANK_D', tank_name: 'TANK_D', device: '350435032681912', variant: 'main', capacity_liters: 8000000, display_order: 1 }
  ];
  const localTanksStr = localStorage.getItem('stp_local_tanks');
  let allTanks = defaultTanks;
  if (localTanksStr) {
    try {
      const parsed = JSON.parse(localTanksStr);
      if (parsed.some((t: any) => t.capacity_liters === 10000 || !t.capacity_liters || t.capacity_liters < 100000)) {
        localStorage.removeItem('stp_local_tanks');
        allTanks = defaultTanks;
      } else {
        allTanks = parsed;
      }
    } catch {}
  }

  const matchedTanks = allTanks.filter((t: any) =>
    t.device === devId ||
    t.device === currentDev.device_id
  );

  const tanksToUse = matchedTanks.length > 0 ? matchedTanks : [
    { name: `TANK-${devId}`, tank_name: `${currentDev.device_name} Tank`, device: currentDev.name, capacity_liters: 8000000, display_order: 1 }
  ];

  const defaultMotors = [
    // TANK-001 (STP Telemetry Device)
    { name: 'MOTOR-001', motor_name: 'Motor_1', tank: 'TANK-001', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
    { name: 'MOTOR-002', motor_name: 'Motor_2', tank: 'TANK-001', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
    { name: 'MOTOR-003', motor_name: 'Motor_3', tank: 'TANK-001', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
    { name: 'MOTOR-004', motor_name: 'Motor_4', tank: 'TANK-001', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
    { name: 'MOTOR-005', motor_name: 'Motor_5', tank: 'TANK-001', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },

    // TANK_A (STP PLANT A)
    { name: 'MOTOR_A_1', motor_name: 'MOTOR_A_1', tank: 'TANK_A', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
    { name: 'MOTOR_A_2', motor_name: 'MOTOR_A_2', tank: 'TANK_A', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
    { name: 'MOTOR_A_3', motor_name: 'MOTOR_A_3', tank: 'TANK_A', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
    { name: 'MOTOR_A_4', motor_name: 'MOTOR_A_4', tank: 'TANK_A', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
    { name: 'MOTOR_A_5', motor_name: 'MOTOR_A_5', tank: 'TANK_A', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },

    // TANK_B (STP PLANT B)
    { name: 'MOTOR_B_1', motor_name: 'MOTOR_B_1', tank: 'TANK_B', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
    { name: 'MOTOR_B_2', motor_name: 'MOTOR_B_2', tank: 'TANK_B', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
    { name: 'MOTOR_B_3', motor_name: 'MOTOR_B_3', tank: 'TANK_B', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
    { name: 'MOTOR_B_4', motor_name: 'MOTOR_B_4', tank: 'TANK_B', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
    { name: 'MOTOR_B_5', motor_name: 'MOTOR_B_5', tank: 'TANK_B', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },

    // TANK_C (STP PLANT C)
    { name: 'MOTOR_C_1', motor_name: 'MOTOR_C_1', tank: 'TANK_C', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
    { name: 'MOTOR_C_2', motor_name: 'MOTOR_C_2', tank: 'TANK_C', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
    { name: 'MOTOR_C_3', motor_name: 'MOTOR_C_3', tank: 'TANK_C', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
    { name: 'MOTOR_C_4', motor_name: 'MOTOR_C_4', tank: 'TANK_C', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
    { name: 'MOTOR_C_5', motor_name: 'MOTOR_C_5', tank: 'TANK_C', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 },

    // TANK_D (STP PLANT D)
    { name: 'MOTOR_D_1', motor_name: 'MOTOR_D_1', tank: 'TANK_D', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
    { name: 'MOTOR_D_2', motor_name: 'MOTOR_D_2', tank: 'TANK_D', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
    { name: 'MOTOR_D_3', motor_name: 'MOTOR_D_3', tank: 'TANK_D', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
    { name: 'MOTOR_D_4', motor_name: 'MOTOR_D_4', tank: 'TANK_D', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
    { name: 'MOTOR_D_5', motor_name: 'MOTOR_D_5', tank: 'TANK_D', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 }
  ];
  const localMotorsStr = localStorage.getItem('stp_local_motors');
  const allMotors = localMotorsStr ? JSON.parse(localMotorsStr) : defaultMotors;

  const compiledTanks = tanksToUse.map((t: any, tIdx: number) => {
    const matchedMotors = allMotors.filter((m: any) =>
      m.tank === t.name ||
      m.tank === t.tank_name ||
      (m.tank && (m.tank.toLowerCase() === t.name?.toLowerCase() || m.tank.toLowerCase() === t.tank_name?.toLowerCase()))
    );

    const motorsToUse = matchedMotors.length > 0 ? matchedMotors : [
      { name: `MOTOR-1`, motor_name: 'Motor 1', run_param_key: 'current_1', trip_param_key: 'voltage_4', display_order: 1 },
      { name: `MOTOR-2`, motor_name: 'Motor 2', run_param_key: 'current_2', trip_param_key: 'voltage_5', display_order: 2 },
      { name: `MOTOR-3`, motor_name: 'Motor 3', run_param_key: 'current_3', trip_param_key: 'voltage_6', display_order: 3 },
      { name: `MOTOR-4`, motor_name: 'Motor 4', run_param_key: 'current_4', trip_param_key: 'voltage_7', display_order: 4 },
      { name: `MOTOR-5`, motor_name: 'Motor 5', run_param_key: 'low_pressure', trip_param_key: 'voltage_8', display_order: 5 }
    ];

    return {
      id: tIdx + 1,
      device_id: tIdx + 1,
      name: t.tank_name || t.name,
      variant: t.variant || 'main',
      capacity_liters: t.capacity_liters || 8000000,
      display_order: t.display_order || (tIdx + 1),
      motors: motorsToUse.map((m: any, mIdx: number) => ({
        id: mIdx + 1,
        tank_id: tIdx + 1,
        name: m.motor_name || m.name,
        run_param_key: m.run_param_key || `current_${mIdx + 1}`,
        trip_param_key: m.trip_param_key || `voltage_${mIdx + 4}`,
        display_order: m.display_order || (mIdx + 1)
      }))
    };
  });

  return {
    device_id: currentDev.device_id || devId,
    device_name: currentDev.device_name || devId,
    api_key: currentDev.api_key || 'chinnu',
    api_token: currentDev.api_token || '257bbec888a81696529ee979804cca59',
    latitude: currentDev.latitude,
    longitude: currentDev.longitude,
    tanks: compiledTanks
  };
};

const DashboardPage: React.FC = () => {
  const { username, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('350435032683868');
  const selectedDeviceIdRef = useRef<string>('350435032683868');
  const [layout, setLayout] = useState<DeviceLayout | null>(() => buildDeviceLayoutFromLocal('350435032683868'));
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [userDevices, setUserDevices] = useState<any[]>([]);

  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const [accumulatedHistory, setAccumulatedHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'camera' | 'electrical'>('telemetry');

  const loadUserDevices = async () => {
    const defaultDevs = [
      { name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_id: '350435032683868', api_key: 'chinnu' },
      { name: 'VASUNDHARA SECTOR 17', device_name: 'VASUNDHARA SECTOR 17', device_id: '350435032680674', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' },
      { name: 'STP PLANT C', device_name: 'STP PLANT C', device_id: '350435032689659', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' },
      { name: 'VAISHALI SECTOR 6', device_name: 'VAISHALI SECTOR 6', device_id: '350435032681912', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' }
    ];

    const centralDevs = await getCentralDevices();
    if (centralDevs && centralDevs.length > 0) {
      localStorage.setItem('stp_local_devices', JSON.stringify(centralDevs));
      setUserDevices(centralDevs);
      return centralDevs;
    }

    const localDevicesStr = localStorage.getItem('stp_local_devices');
    let allDevices = defaultDevs;
    
    if (localDevicesStr) {
      try {
        const parsed = JSON.parse(localDevicesStr);
        if (parsed.some((d: any) => 
          d.device_name === 'STP PLANT A' || 
          d.device_name === 'STP PLANT D' || 
          d.device_name === 'STP Telemetry Device' || 
          d.device_id === '863110085106451' || 
          d.device_id === '350435032683869' || 
          d.device_id === '12345'
        )) {
          localStorage.removeItem('stp_local_devices');
          localStorage.removeItem('stp_local_tanks');
          localStorage.removeItem('stp_local_motors');
          allDevices = defaultDevs;
        } else {
          allDevices = parsed;
        }
      } catch {}
    }

    const userDevs = allDevices.filter((d: any) => 
      !d.assigned_user || d.assigned_user === 'wabag@nimblevision.io' || d.assigned_user === username
    );
    const devicesList = userDevs.length > 0 ? userDevs : allDevices;
    setUserDevices(devicesList);
    return devicesList;
  };

  const fetchLayoutForDevice = async (devId: string) => {
    try {
      const data = await frappeGetLayout();
      if (data && data.device_id === devId && data.tanks && data.tanks.length > 0) {
        setLayout(data);
        return;
      }
    } catch {}

    try {
      const [cTanks, cMotors] = await Promise.all([getCentralTanks(), getCentralMotors()]);
      if (cTanks && cTanks.length > 0) {
        localStorage.setItem('stp_local_tanks', JSON.stringify(cTanks));
      }
      if (cMotors && cMotors.length > 0) {
        localStorage.setItem('stp_local_motors', JSON.stringify(cMotors));
      }
    } catch {}

    const dynamicLayout = buildDeviceLayoutFromLocal(devId);
    setLayout(dynamicLayout);
  };

  const fetchTelemetryForDevice = async (devId: string) => {
    try {
      const { data } = await TelemetryAPI.get('/api/telemetry', { params: { device_id: devId } });
      if (devId !== selectedDeviceIdRef.current) return;

      setTelemetry(data);

      if (data?.history && Array.isArray(data.history) && data.history.length > 0) {
        setAccumulatedHistory(data.history);
      }

      setOnline(true);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      if (devId === selectedDeviceIdRef.current) setOnline(false);
    }
  };

  const handleDeviceChange = (newDevId: string) => {
    setSelectedDeviceId(newDevId);
    selectedDeviceIdRef.current = newDevId;
    setAccumulatedHistory([]);
    fetchLayoutForDevice(newDevId);
    fetchTelemetryForDevice(newDevId);
  };

  useEffect(() => {
    const init = async () => {
      const devs = await loadUserDevices();
      const initialDevId = devs[0]?.device_id || '350435032683868';
      setSelectedDeviceId(initialDevId);
      selectedDeviceIdRef.current = initialDevId;

      await fetchLayoutForDevice(initialDevId);
      await fetchTelemetryForDevice(initialDevId);
      setLoading(false);
    };
    init();

    timerRef.current = window.setInterval(() => {
      fetchTelemetryForDevice(selectedDeviceIdRef.current);
    }, POLL_INTERVAL);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const activeMotors = telemetry?.tanks.flatMap(t => t.motors).filter(m => m.is_running).length ?? 0;
  const trippedMotors = telemetry?.tanks.flatMap(t => t.motors).filter(m => m.is_tripped).length ?? 0;
  const avgLevel = layout?.tanks.length
    ? (telemetry?.tanks.reduce((s, t) => s + t.water_level_percent, 0) ?? 0) / layout.tanks.length
    : 0;

  return (
    <div className="dashboard-page">
      {/* Top Nav */}
      <header className="dash-header">
        <div className="dash-brand">
          <Droplets size={24} color="#38BDF8" />
          <div>
            <span className="brand-name">NIMBLE VISION</span>
            <span className="brand-sub">STP Monitoring</span>
          </div>
        </div>
        <div className="dash-center">
          {userDevices.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', background: '#F0F9FF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                📡 Select Device:
              </span>
              <select
                id="device-select-dropdown"
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #0284C7',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)'
                }}
              >
                {userDevices.map(d => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.device_name} — ({d.device_id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            layout && <span className="device-tag">📡 Device: <strong>{layout.device_id}</strong> — {layout.device_name}</span>
          )}
        </div>
        <div className="dash-actions">
          <div className={`online-indicator ${online ? 'online' : 'offline'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{online ? `Live · ${lastUpdated}` : 'Offline'}</span>
          </div>
          <button className="icon-btn" title="Refresh" onClick={() => fetchTelemetryForDevice(selectedDeviceId)}><RefreshCw size={16} /></button>
          <span className="user-chip">👤 {fullName || username}</span>
          <button id="logout-btn" className="logout-btn" onClick={handleLogout}><LogOut size={15} /> Logout</button>
        </div>
      </header>

      {/* KPI Bar */}
      <div className="kpi-bar">
        <div className="kpi-card kpi-blue">
          <Activity size={20} />
          <div><span className="kpi-val">{activeMotors}</span><span className="kpi-label">Motors Running</span></div>
        </div>
        <div className={`kpi-card ${trippedMotors > 0 ? 'kpi-red' : 'kpi-green'}`}>
          <AlertTriangle size={20} />
          <div><span className="kpi-val">{trippedMotors}</span><span className="kpi-label">Motors Tripped</span></div>
        </div>
        <div className="kpi-card kpi-cyan">
          <Droplets size={20} />
          <div><span className="kpi-val">{avgLevel.toFixed(1)}%</span><span className="kpi-label">Avg Water Level</span></div>
        </div>
        <div className="kpi-card kpi-purple">
          <Power size={20} />
          <div><span className="kpi-val">{layout?.tanks.length ?? 0}</span><span className="kpi-label">Tanks Configured</span></div>
        </div>
        <div className="kpi-card" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
          <Clock size={20} color="#0284C7" />
          <div>
            <span className="kpi-val" style={{ fontSize: '13px', color: '#0F172A', fontWeight: 700 }}>
              {telemetry?.raw_params?.timestamp || lastUpdated || 'Just now'}
            </span>
            <span className="kpi-label">Latest Data Updated</span>
          </div>
        </div>
      </div>

      {/* Dashboard View Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '20px 0 16px 0',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('telemetry')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'telemetry' ? '#0284C7' : '#F1F5F9',
            color: activeTab === 'telemetry' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'telemetry' ? '0 4px 14px rgba(2, 132, 199, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Activity size={18} />
          Plant Monitoring
        </button>

        <button
          onClick={() => setActiveTab('camera')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'camera' ? '#0284C7' : '#F1F5F9',
            color: activeTab === 'camera' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'camera' ? '0 4px 14px rgba(2, 132, 199, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Camera size={18} />
          Camera Monitoring
        </button>

        <button
          onClick={() => setActiveTab('electrical')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'electrical' ? '#0284C7' : '#F1F5F9',
            color: activeTab === 'electrical' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'electrical' ? '0 4px 14px rgba(2, 132, 199, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Zap size={18} />
          Electrical Parameters
        </button>
      </div>

      {/* Main Content Area */}
      <main className="scada-main">
        {loading && <div className="loading-screen"><div className="spinner-lg" /><p>Loading SCADA dashboard...</p></div>}

        {!loading && !layout && (
          <div className="empty-state">
            <Droplets size={64} color="#38BDF8" />
            <h2>No Device Assigned</h2>
            <p>Contact your administrator to assign a device and configure tanks.</p>
          </div>
        )}

        {!loading && layout && (
          <>
            {activeTab === 'camera' ? (
              <CameraMonitoring deviceId={selectedDeviceId} deviceName={layout.device_name} />
            ) : activeTab === 'electrical' ? (
              <ElectricalParameters deviceId={selectedDeviceId} deviceName={layout.device_name} />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
                  <div className="scada-canvas" style={{ margin: 0, height: '100%' }}>
                    <div className="canvas-header">
                      <h2 className="canvas-title">Water Tank Monitoring</h2>
                      <p className="canvas-sub">Live STP Tank Water Level & Capacity</p>
                    </div>

                    <div className="tanks-row" style={{ justifyContent: 'center' }}>
                      {layout.tanks
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((tank, idx) => {
                          const tankTelemetry = telemetry?.tanks.find(tt => tt.tank_id === tank.id || tt.tank_name === tank.name) ?? telemetry?.tanks[idx] ?? null;
                          return (
                            <TankCard
                              key={tank.id}
                              tankLayout={tank}
                              telemetry={tankTelemetry}
                              index={idx}
                              total={layout.tanks.length}
                            />
                          );
                        })}
                    </div>
                  </div>

                  {/* Device Location GIS Map on the right side */}
                  <DeviceMap
                    deviceId={layout.device_id}
                    deviceName={layout.device_name}
                    waterLevel={telemetry?.tanks[0]?.water_level_percent || 0}
                    activeMotorsCount={activeMotors}
                    latitude={layout.latitude}
                    longitude={layout.longitude}
                  />
                </div>

                {/* Real-Time Analytical Graphs: 1 Water Level & Motor Run-Time Graphs */}
                <TelemetryCharts
                  history={accumulatedHistory.length > 0 ? accumulatedHistory : (telemetry?.history || [])}
                  motors={layout?.tanks[0]?.motors || telemetry?.tanks[0]?.motors || []}
                  tankName={layout?.tanks[0]?.name || (layout?.tanks[0] as any)?.tank_name}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
