import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Droplets, Power, AlertTriangle, LogOut, RefreshCw, Wifi, WifiOff, Clock, Camera, Zap, Wrench, DollarSign, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { frappeGetLayout, TelemetryAPI, getCentralDevices, getCentralTanks, getCentralMotors, getCentralMotorSpecs, getCentralServiceLogs } from '../api';
import { DeviceLayout, TelemetryResponse, TankTelemetry } from '../types';
import { TelemetryCharts } from '../components/TelemetryCharts';
import { DeviceMap } from '../components/DeviceMap';
import { CameraMonitoring } from '../components/CameraMonitoring';
import { ElectricalParameters } from '../components/ElectricalParameters';
import { MotorDetailsModal } from '../components/MotorDetailsModal';
import { MotorMaintenanceView } from '../components/MotorMaintenanceView';
import { PlantReplacementsView } from '../components/PlantReplacementsView';
import { OverallPlantMap } from '../components/OverallPlantMap';

const POLL_INTERVAL = 5000;



interface TankCardProps {
  tankLayout: DeviceLayout['tanks'][0];
  telemetry: TankTelemetry | null;
  index: number;
  total: number;
  onSelectMotor?: (motor: any, tankName: string) => void;
}

const TankCard: React.FC<TankCardProps> = ({ tankLayout, telemetry, index, onSelectMotor }) => {
  const level = telemetry?.water_level_percent ?? 0;
  const capacity = tankLayout.capacity_liters || 8000000;
  const totalDepthMeters = (tankLayout as any).depth_meters || 
    (tankLayout.name === 'TANK_A' || (tankLayout as any).tank_name === 'TANK_A' ? 10.2 : 
     tankLayout.name === 'TANK_B' || (tankLayout as any).tank_name === 'TANK_B' ? 11.74 : 10.0);
  const currentDepthMeters = ((level / 100) * totalDepthMeters).toFixed(2);
  const volume = Math.round((level / 100) * capacity);
  const tankDisplayName = tankLayout.name || (tankLayout as any).tank_name || telemetry?.tank_name || `Tank ${index + 1}`;
  const fillHeight = Math.max(0, Math.min(100, level));

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #CBD5E1',
      borderRadius: '20px',
      padding: '20px 24px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      minWidth: '320px',
      maxWidth: '440px'
    }}>
      {/* Tank Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#F0F9FF', padding: '8px', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
            <Droplets size={20} color="#0284C7" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
              {tankDisplayName}
            </h4>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              Capacity: {capacity.toLocaleString()} L
            </div>
          </div>
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

      {/* Main SCADA Tank & Meter Visual Row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', width: '100%', justifyContent: 'center' }}>
        
        {/* Left Side: Physical Depth Meter Gauge Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '12px 10px',
          width: '90px',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284C7', textAlign: 'center', letterSpacing: '0.3px' }}>
            DEPTH METER
          </div>
          
          <div style={{
            position: 'relative',
            width: '18px',
            height: '150px',
            background: '#E2E8F0',
            borderRadius: '10px',
            overflow: 'hidden',
            margin: '8px 0',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)'
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${fillHeight}%`,
              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              transition: 'height 0.8s ease-in-out',
              borderRadius: '0 0 10px 10px'
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
              {currentDepthMeters}m
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', marginTop: '3px' }}>
              Max: {totalDepthMeters}m
            </div>
          </div>
        </div>

        {/* Center: Cylindrical Water Tank */}
        <div style={{
          position: 'relative',
          flex: 1,
          maxWidth: '220px',
          height: '240px',
          border: '3px solid #94A3B8',
          borderRadius: '24px 24px 16px 16px',
          background: '#F1F5F9',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 10px rgba(15, 23, 42, 0.08)'
        }}>
          {/* Scale Ticks (Right Side of Tank) */}
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '12px',
            bottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#475569',
            fontWeight: 800,
            zIndex: 3,
            textShadow: '0 1px 2px rgba(255,255,255,0.8)'
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
            {/* Surface wave reflection */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 1px 4px rgba(255, 255, 255, 0.9)'
            }} />
          </div>

          {/* Unobstructed Center Percentage Indicator */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <span style={{
              fontSize: '36px',
              fontWeight: 900,
              color: fillHeight > 50 ? '#FFFFFF' : '#0284C7',
              textShadow: fillHeight > 50 
                ? '0 2px 8px rgba(0, 0, 0, 0.55)' 
                : '0 1px 4px rgba(255, 255, 255, 0.9)',
              letterSpacing: '-1px'
            }}>
              {level}%
            </span>
          </div>
        </div>

      </div>

      {/* Clean Telemetry Metrics Banner (Below Tank) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '10px 12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>WATER DEPTH</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {currentDepthMeters}m / {totalDepthMeters}m
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', background: '#CBD5E1' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>CURRENT VOLUME</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
            {volume.toLocaleString()} L
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
          const motorObj = { ...motor, motor_name: motorDisplayName, is_running: isRunning, is_tripped: isTripped };

          return (
            <div
              key={motor.id || mi}
              onClick={() => onSelectMotor?.(motorObj, tankDisplayName)}
              title="Click to view Specs, Breakdown Warning & Service History"
              style={{
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
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, boxShadow 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.03)'; }}
            >
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
    { name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_id: '350435032683868', api_key: 'chinnu', latitude: 28.657521, longitude: 77.376303, assigned_user: 'wabag@nimblevision.io' },
    { name: 'VASUNDHARA SECTOR 17', device_name: 'VASUNDHARA SECTOR 17', device_id: '350435032680674', api_key: 'chinnu', latitude: 28.667200, longitude: 77.371100, assigned_user: 'wabag@nimblevision.io' },
    { name: 'STP PLANT C', device_name: 'STP PLANT C', device_id: '350435032689659', api_key: 'chinnu', latitude: 28.672000, longitude: 77.442000, assigned_user: 'wabag@nimblevision.io' },
    { name: 'VAISHALI SECTOR 6', device_name: 'VAISHALI SECTOR 6', device_id: '350435032681912', api_key: 'chinnu', latitude: 28.648000, longitude: 77.382000, assigned_user: 'wabag@nimblevision.io' }
  ];
  const localDevsStr = localStorage.getItem('stp_local_devices');
  const allDevs = localDevsStr ? JSON.parse(localDevsStr) : defaultDevs;
  const currentDev = allDevs.find((d: any) =>
    d.device_id === devId ||
    d.name === devId ||
    d.device_name === devId
  ) || {
    device_id: devId,
    device_name: devId === '350435032683868' ? 'VASUNDHARA SECTOR 7 , 8MLD PLANT' : devId,
    name: devId,
    latitude: 28.657521,
    longitude: 77.376303
  };

  const defaultTanks = [
    { name: 'TANK_A', tank_name: 'TANK_A', device: '350435032683868', variant: 'main', capacity_liters: 8000000, depth_meters: 10.2, display_order: 1 },
    { name: 'TANK_B', tank_name: 'TANK_B', device: '350435032680674', variant: 'main', capacity_liters: 8000000, depth_meters: 11.74, display_order: 1 },
    { name: 'TANK_C', tank_name: 'TANK_C', device: '350435032689659', variant: 'main', capacity_liters: 8000000, depth_meters: 10.0, display_order: 1 },
    { name: 'TANK_D', tank_name: 'TANK_D', device: '350435032681912', variant: 'main', capacity_liters: 8000000, depth_meters: 10.0, display_order: 1 }
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
  const [activeTab, setActiveTab] = useState<'map' | 'telemetry' | 'camera' | 'electrical' | 'maintenance' | 'replacements'>('map');
  const [selectedMotorModal, setSelectedMotorModal] = useState<{ motor: any; tankName: string } | null>(null);
  const [deviceStatusMap, setDeviceStatusMap] = useState<Record<string, { activeMotors: number; trippedMotors: number }>>({});
  
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<{
    greaseNotifs: Array<{ motorName: string; tankName: string; hours: number }>;
    overhaulAlarms: Array<{ motorName: string; tankName: string; hours: number }>;
  }>({ greaseNotifs: [], overhaulAlarms: [] });
  const [dismissedAlarms, setDismissedAlarms] = useState<boolean>(false);
  const [dismissedGreaseAlarms, setDismissedGreaseAlarms] = useState<boolean>(false);

  const fetchAllDevicesTelemetry = async (devices: any[]) => {
    if (!devices || devices.length === 0) return;
    const statusMap: Record<string, { activeMotors: number; trippedMotors: number }> = {};
    await Promise.all(
      devices.map(async (d) => {
        try {
          const { data } = await TelemetryAPI.get('/api/telemetry', { params: { device_id: d.device_id } });
          if (data && data.tanks) {
            const act = data.tanks.flatMap((t: any) => t.motors || []).filter((m: any) => m.is_running).length;
            const trip = data.tanks.flatMap((t: any) => t.motors || []).filter((m: any) => m.is_tripped).length;
            statusMap[d.device_id] = { activeMotors: act, trippedMotors: trip };
          }
        } catch {}
      })
    );
    setDeviceStatusMap(prev => ({ ...prev, ...statusMap }));
  };

  const loadUserDevices = async () => {
    const defaultDevs = [
      { name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', device_id: '350435032683868', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' },
      { name: 'VASUNDHARA SECTOR 17', device_name: 'VASUNDHARA SECTOR 17', device_id: '350435032680674', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' },
      { name: 'STP PLANT C', device_name: 'STP PLANT C', device_id: '350435032689659', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' },
      { name: 'VAISHALI SECTOR 6', device_name: 'VAISHALI SECTOR 6', device_id: '350435032681912', api_key: 'chinnu', assigned_user: 'wabag@nimblevision.io' }
    ];

    let allDevices = defaultDevs;
    const centralDevs = await getCentralDevices();
    if (centralDevs && centralDevs.length > 0) {
      localStorage.setItem('stp_local_devices', JSON.stringify(centralDevs));
      allDevices = centralDevs;
    } else {
      const localDevicesStr = localStorage.getItem('stp_local_devices');
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
    }

    const isUserAssigned = (d: any) => {
      if (!username || username === 'Administrator' || username === 'admin') return true;
      
      const userEmail = (username || '').toLowerCase().trim();
      if (!userEmail) return false;

      const assignedStr = (d.assigned_user || d.assigned_users || '').toString().toLowerCase();
      if (!assignedStr) return false;

      const userList = assignedStr.split(',').map((u: string) => u.trim()).filter(Boolean);
      return userList.includes(userEmail);
    };

    const userDevs = allDevices.filter(isUserAssigned);
    setUserDevices(userDevs);
    return userDevs;
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

      if (data?.tanks) {
        const act = data.tanks.flatMap((t: any) => t.motors || []).filter((m: any) => m.is_running).length;
        const trip = data.tanks.flatMap((t: any) => t.motors || []).filter((m: any) => m.is_tripped).length;
        setDeviceStatusMap(prev => ({
          ...prev,
          [devId]: { activeMotors: act, trippedMotors: trip }
        }));
      }

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

    // ⚡ Instant synchronous layout switch (0ms delay)
    const dynamicLayout = buildDeviceLayoutFromLocal(newDevId);
    setLayout(dynamicLayout);

    // Asynchronous background synchronization
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
      fetchAllDevicesTelemetry(devs);
      setLoading(false);
    };
    init();

    timerRef.current = window.setInterval(() => {
      fetchTelemetryForDevice(selectedDeviceIdRef.current);
      if (userDevices.length > 0) {
        fetchAllDevicesTelemetry(userDevices);
      }
    }, POLL_INTERVAL);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const evaluateMaintenanceAlarms = async () => {
      if (!layout?.tanks) return;
      try {
        const [specsMap, logsMap] = await Promise.all([
          getCentralMotorSpecs(),
          getCentralServiceLogs()
        ]);

        const greaseNotifs: Array<{ motorName: string; tankName: string; hours: number }> = [];
        const overhaulAlarms: Array<{ motorName: string; tankName: string; hours: number }> = [];

        layout.tanks.forEach((tank) => {
          const tankName = tank.name || (tank as any).tank_name || 'Tank';
          tank.motors.forEach((m) => {
            const motorDisplayName = m.name || (m as any).motor_name || 'Motor';
            const motorId = m.name || motorDisplayName;
            const defaultHours = 500;
            const motorSpec = specsMap?.[motorId] || { total_run_hours: defaultHours };
            const currentHours = motorSpec.total_run_hours ?? motorSpec.running_hours ?? defaultHours;

            const logs = logsMap?.[motorId] || [];
            const lastGreaseLog = logs.find((l: any) => 
              l.service_type?.toLowerCase().includes('greasing') || 
              l.service_type?.toLowerCase().includes('bearing') ||
              l.service_type?.toLowerCase().includes('rewind') ||
              l.service_type?.toLowerCase().includes('overhaul')
            );
            const lastOverhaulLog = logs.find((l: any) => 
              l.service_type?.toLowerCase().includes('rewind') || 
              l.service_type?.toLowerCase().includes('overhaul')
            );

            const lastGreaseHours = lastGreaseLog 
              ? (parseInt(lastGreaseLog.running_hours) || 0) 
              : (motorSpec.last_grease_hours || 0);

            const lastOverhaulHours = lastOverhaulLog 
              ? (parseInt(lastOverhaulLog.running_hours) || 0) 
              : (motorSpec.last_overhaul_hours || 0);

            const hoursSinceGrease = Math.max(0, currentHours - lastGreaseHours);
            const hoursSinceOverhaul = Math.max(0, currentHours - lastOverhaulHours);

            if (hoursSinceOverhaul >= 5000) {
              overhaulAlarms.push({ motorName: motorDisplayName, tankName, hours: currentHours });
            }
            if (hoursSinceGrease >= 2000) {
              greaseNotifs.push({ motorName: motorDisplayName, tankName, hours: currentHours });
            }
          });
        });

        setMaintenanceAlerts({ greaseNotifs, overhaulAlarms });
      } catch {}
    };

    evaluateMaintenanceAlarms();

    const handleServiceLogged = () => {
      evaluateMaintenanceAlarms();
    };
    window.addEventListener('stp_service_logged', handleServiceLogged);
    return () => {
      window.removeEventListener('stp_service_logged', handleServiceLogged);
    };
  }, [layout, selectedDeviceId, activeTab]);

  const handleLogout = () => { logout(); navigate('/'); };

  const activeMotors = telemetry?.tanks.flatMap(t => t.motors).filter(m => m.is_running).length ?? 0;
  const trippedMotors = telemetry?.tanks.flatMap(t => t.motors).filter(m => m.is_tripped).length ?? 0;
  const avgLevel = layout?.tanks.length
    ? (telemetry?.tanks.reduce((s, t) => s + t.water_level_percent, 0) ?? 0) / layout.tanks.length
    : 0;

  return (
    <div className="dashboard-layout">
      {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo-icon">
            <Droplets size={24} color="#FFFFFF" />
          </div>
          <div>
            <span className="dash-sidebar-brand-title">NIMBLE VISION</span>
            <span className="dash-sidebar-brand-sub">STP CONTROL CENTER</span>
          </div>
        </div>

        <nav className="dash-sidebar-nav">
          <div className="dash-sidebar-group-label">STP Monitoring Views</div>

          <button
            onClick={() => setActiveTab('map')}
            className={`dash-sidebar-link ${activeTab === 'map' ? 'active' : ''}`}
          >
            <MapPin size={18} />
            <span>Overall Plant Map</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`dash-sidebar-link ${activeTab === 'telemetry' ? 'active' : ''}`}
          >
            <Activity size={18} />
            <span>Plant Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`dash-sidebar-link ${activeTab === 'camera' ? 'active' : ''}`}
          >
            <Camera size={18} />
            <span>Camera Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('electrical')}
            className={`dash-sidebar-link ${activeTab === 'electrical' ? 'active' : ''}`}
          >
            <Zap size={18} />
            <span>Electrical Parameters</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`dash-sidebar-link ${activeTab === 'maintenance' ? 'active' : ''}`}
          >
            <Wrench size={18} />
            <span>Maintenance Tracker</span>
            {(maintenanceAlerts.overhaulAlarms.length > 0 || maintenanceAlerts.greaseNotifs.length > 0) && (
              <span className="nav-badge" style={{ background: '#DC2626' }}>!</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('replacements')}
            className={`dash-sidebar-link ${activeTab === 'replacements' ? 'active' : ''}`}
          >
            <DollarSign size={18} />
            <span>Replacements & Costing</span>
          </button>
        </nav>

        <div className="dash-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94A3B8' }}>
            <span style={{ fontSize: '14px' }}>👤</span>
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || username || 'wabag@nimblevision.io'}
            </span>
          </div>
          <button id="logout-btn" className="logout-btn" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT WRAPPER ────────────────────────────────────────── */}
      <div className="dash-content-wrapper">
        {/* Top Nav Header */}
        <header className="dash-header">
          <div className="dash-center" style={{ justifyContent: 'flex-start' }}>
            {activeTab !== 'map' && (
              userDevices.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', background: '#F0F9FF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                    📡 Select STP Plant Device:
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
              )
            )}
          </div>

          <div className="dash-actions">
            <div className={`online-indicator ${online ? 'online' : 'offline'}`}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{online ? `Live · ${lastUpdated}` : 'Offline'}</span>
            </div>
            <button className="icon-btn" title="Refresh Telemetry" onClick={() => fetchTelemetryForDevice(selectedDeviceId)}>
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* KPI Bar (Show only for single-plant views, hidden on Overall Plant Map) */}
        {activeTab !== 'map' && (
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
        )}

        {/* 🚨 5,000 RUN HOURS CRITICAL OVERHAUL ALARM BANNER */}
        {maintenanceAlerts.overhaulAlarms.length > 0 && !dismissedAlarms && (
          <div style={{
            background: 'linear-gradient(90deg, #7F1D1D 0%, #DC2626 50%, #7F1D1D 100%)',
            color: '#FFFFFF',
            padding: '14px 20px',
            borderRadius: '14px',
            margin: '16px 24px 8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 6px 24px rgba(220, 38, 38, 0.4)',
            border: '2px solid #EF4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#DC2626" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚨 CRITICAL MAINTENANCE ALARM: 5,000 RUN HOURS REACHED!</span>
                </div>
                <div style={{ fontSize: '12px', color: '#FEE2E2', marginTop: '3px', fontWeight: 600 }}>
                  {maintenanceAlerts.overhaulAlarms.map(a => `${a.motorName} in ${a.tankName} (${a.hours.toLocaleString()}h)`).join(' · ')} — Full Overhaul Service Required Immediately!
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setActiveTab('maintenance')}
                style={{
                  background: '#FFFFFF',
                  color: '#991B1B',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                🛠️ Open Maintenance
              </button>
              <button
                onClick={() => setDismissedAlarms(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#FFF',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ⚠️ 2,000 RUN HOURS GREASE & BEARING CHECK POPUP NOTIFICATION BANNER */}
        {maintenanceAlerts.greaseNotifs.length > 0 && !dismissedGreaseAlarms && (
          <div style={{
            background: 'linear-gradient(90deg, #78350F 0%, #D97706 50%, #78350F 100%)',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '12px',
            margin: '16px 24px 8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(217, 119, 6, 0.3)',
            border: '1px solid #F59E0B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#FFFFFF', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#D97706" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800 }}>
                  ⚠️ PREVENTIVE MAINTENANCE POPUP: 2,000 RUN HOURS REACHED!
                </div>
                <div style={{ fontSize: '12px', color: '#FEF3C7', marginTop: '2px', fontWeight: 600 }}>
                  {maintenanceAlerts.greaseNotifs.map(g => `${g.motorName} in ${g.tankName} (${g.hours.toLocaleString()}h)`).join(' · ')} — Grease & Bearing Check Due Now!
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setActiveTab('maintenance')}
                style={{
                  background: '#FFFFFF',
                  color: '#78350F',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                View Maintenance Schedule
              </button>
              <button
                onClick={() => setDismissedGreaseAlarms(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#FFF',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
            {activeTab === 'map' ? (
              <OverallPlantMap
                userDevices={userDevices}
                deviceStatusMap={deviceStatusMap}
                onSelectDevice={(devId) => {
                  setSelectedDeviceId(devId);
                  setActiveTab('telemetry');
                }}
              />
            ) : activeTab === 'camera' ? (
              <CameraMonitoring deviceId={selectedDeviceId} deviceName={layout.device_name} />
            ) : activeTab === 'electrical' ? (
              <ElectricalParameters deviceId={selectedDeviceId} deviceName={layout.device_name} layout={layout} />
            ) : activeTab === 'maintenance' ? (
              <MotorMaintenanceView deviceId={selectedDeviceId} deviceName={layout.device_name} layout={layout} telemetry={telemetry} />
            ) : activeTab === 'replacements' ? (
              <PlantReplacementsView deviceId={selectedDeviceId} deviceName={layout.device_name} layout={layout} />
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
                              onSelectMotor={(m, tName) => setSelectedMotorModal({ motor: m, tankName: tName })}
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
                    trippedMotorsCount={trippedMotors}
                    latitude={layout.latitude}
                    longitude={layout.longitude}
                    userDevices={userDevices}
                    deviceStatusMap={deviceStatusMap}
                    onSelectDevice={handleDeviceChange}
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

      {/* Motor Specifications, Continuous Run Tracking & Service History Modal */}
      <MotorDetailsModal
        motor={selectedMotorModal?.motor}
        tankName={selectedMotorModal?.tankName || ''}
        isOpen={!!selectedMotorModal}
        onClose={() => setSelectedMotorModal(null)}
      />
    </div>
  );
};

export default DashboardPage;
