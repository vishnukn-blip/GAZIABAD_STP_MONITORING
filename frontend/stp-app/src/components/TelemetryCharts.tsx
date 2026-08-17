import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TelemetryHistoryPoint } from '../types';
import { Activity, Waves, LayoutGrid, Rows } from 'lucide-react';

interface TelemetryChartsProps {
  history: TelemetryHistoryPoint[];
  motors?: any[];
  tankName?: string;
}

const MotorIcon = ({ color = '#059669', size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Pump Casing Body */}
    <circle cx="12" cy="13" r="7" />
    {/* Discharge Outlet Nozzle */}
    <path d="M12 6V2" />
    <path d="M9 2h6" />
    {/* Motor Impeller Rotor */}
    <path d="M12 10v6" />
    <path d="M9 13h6" />
    {/* Suction Inlet Flange */}
    <path d="M5 13H2" />
  </svg>
);

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    const isWaterLevel = unit === '%';
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#0F172A',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)'
      }}>
        <p style={{ color: '#64748B', marginBottom: '4px' }}>Time: {label}</p>
        <p style={{ fontWeight: 'bold', color: payload[0].color || '#0284C7' }}>
          {isWaterLevel 
            ? `Water Level: ${payload[0].value}%` 
            : `Status: ${payload[0].value === 1 ? 'ON (Running)' : 'OFF (Stopped)'}`
          }
        </p>
      </div>
    );
  }
  return null;
};

const parseTs = (tsStr?: string): number => {
  if (!tsStr) return 0;
  const formatted = tsStr.includes(' ') ? tsStr.replace(' ', 'T') : tsStr;
  const d = new Date(formatted);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

// Helper function to build 24-Hour timeline bound dynamically to NimbleVision API telemetry history records
const generate24HourHistoryData = (incomingHistory: TelemetryHistoryPoint[]): TelemetryHistoryPoint[] => {
  if (incomingHistory && incomingHistory.length > 0) {
    // Sort API points chronologically by actual timestamp
    const sorted = [...incomingHistory].sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp));

    const now = new Date();
    const currentMinute = now.getMinutes();
    const points: TelemetryHistoryPoint[] = [];

    for (let i = 24; i >= 0; i--) {
      const slotDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const slotMs = slotDate.getTime();
      const hour = slotDate.getHours();
      const hStr = hour.toString().padStart(2, '0');
      const mStr = i === 0 ? currentMinute.toString().padStart(2, '0') : '00';
      const timeLabel = `${hStr}:${mStr}`;

      // Find the latest API record logged at or prior to this time slot
      let effectivePoint: TelemetryHistoryPoint | null = null;
      for (const p of sorted) {
        const pMs = parseTs(p.timestamp);
        if (pMs > 0 && pMs <= slotMs) {
          effectivePoint = p;
        }
      }

      points.push({
        timestamp: timeLabel,
        time_short: timeLabel,
        water_level: effectivePoint ? (effectivePoint.water_level ?? 0) : (sorted[0]?.water_level ?? 0),
        current_1: effectivePoint ? (effectivePoint.current_1 ?? 0) : 0,
        current_2: effectivePoint ? (effectivePoint.current_2 ?? 0) : 0,
        current_3: effectivePoint ? (effectivePoint.current_3 ?? 0) : 0,
        current_4: effectivePoint ? (effectivePoint.current_4 ?? 0) : 0,
        low_pressure: effectivePoint ? (effectivePoint.low_pressure ?? 0) : 0,
      });
    }

    // Overwrite the last point with exact real-time API telemetry reading
    const latestPoint = sorted[sorted.length - 1];
    points[points.length - 1] = {
      ...points[points.length - 1],
      ...latestPoint,
      time_short: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    };

    return points;
  }

  // Default clean baseline if API data is loading or empty
  const now = new Date();
  const points: TelemetryHistoryPoint[] = [];
  for (let i = 24; i >= 0; i--) {
    const past = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hStr = past.getHours().toString().padStart(2, '0');
    const timeLabel = `${hStr}:00`;
    points.push({
      timestamp: timeLabel,
      time_short: timeLabel,
      water_level: 0,
      current_1: 0,
      current_2: 0,
      current_3: 0,
      current_4: 0,
      low_pressure: 0
    });
  }
  return points;
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history, motors, tankName }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'vertical'>('grid');

  // Guaranteed minimum 24-Hour historical duty cycle timeline
  const data = generate24HourHistoryData(history);

  const defaultMotorConfigs = [
    { name: 'Motor 1', key: 'current_1' },
    { name: 'Motor 2', key: 'current_2' },
    { name: 'Motor 3', key: 'current_3' },
    { name: 'Motor 4', key: 'current_4' },
    { name: 'Motor 5', key: 'low_pressure' }
  ];

  const motorConfigs = (motors && motors.length > 0)
    ? motors.map((m, idx) => ({ name: m.name || m.motor_name || `Motor ${idx + 1}`, key: m.run_param_key || `current_${idx + 1}` }))
    : defaultMotorConfigs;

  return (
    <div className="telemetry-charts-section" style={{ marginTop: '28px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#0284C7" /> Real-Time Analytical Graphs
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Live trend plots for {tankName || 'Tank'} Water Level (%) and Motor Run-Times (ON/OFF status vs Time)
          </p>
        </div>

        {/* View Mode Toggle: Grid vs Vertical */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #CBD5E1'
        }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'grid' ? '#0284C7' : '#64748B',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(15, 23, 42, 0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <LayoutGrid size={14} /> Grid View
          </button>

          <button
            onClick={() => setViewMode('vertical')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'vertical' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'vertical' ? '#0284C7' : '#64748B',
              boxShadow: viewMode === 'vertical' ? '0 1px 3px rgba(15, 23, 42, 0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Rows size={14} /> Vertical View
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* WATER LEVEL TREND */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '12px',
          padding: '18px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#F0F9FF', padding: '6px', borderRadius: '8px' }}>
                <Waves size={18} color="#0284C7" />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  {tankName ? `${tankName} Water Level (%)` : 'Tank Water Level (%)'}
                </h4>
                <span style={{ fontSize: '11px', color: '#64748B' }}>X-Axis: Time | Y-Axis: Water Level Percentage (0% to 100%)</span>
              </div>
            </div>
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0284C7'
            }}>
              Current: {data[data.length - 1]?.water_level || 0}%
            </div>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterLevelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.8} />
                <XAxis dataKey="time_short" stroke="#64748B" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Area
                  type="monotone"
                  dataKey="water_level"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waterLevelGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5 MOTOR RUN-TIME GRAPHS CONTAINER (Grid vs Vertical layout) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
          gap: '20px'
        }}>
          {motorConfigs.map((m, idx) => {
            const currentStatus = data[data.length - 1]?.[m.key as keyof TelemetryHistoryPoint] === 1;

          // Colors: Emerald Green when ON/RUNNING, Slate Grey when OFF
          const strokeColor = currentStatus ? '#059669' : '#475569';
          const fillColor = currentStatus ? '#10B981' : '#94A3B8';

          return (
            <div key={m.key} style={{
              background: '#FFFFFF',
              border: `1px solid ${currentStatus ? '#A7F3D0' : '#CBD5E1'}`,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    background: currentStatus ? '#ECFDF5' : '#F1F5F9',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MotorIcon size={16} color={strokeColor} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{m.name}</h5>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    background: currentStatus ? '#ECFDF5' : '#F1F5F9',
                    border: `1px solid ${currentStatus ? '#A7F3D0' : '#CBD5E1'}`,
                    color: strokeColor
                  }}>
                    {currentStatus ? '● RUNNING' : '○ OFF'}
                  </span>
                </div>
              </div>

              <div style={{ height: '140px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`motorGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={fillColor} stopOpacity={currentStatus ? 0.85 : 0.45} />
                        <stop offset="100%" stopColor={fillColor} stopOpacity={currentStatus ? 0.70 : 0.30} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.8} />
                    <XAxis dataKey="time_short" stroke="#64748B" fontSize={10} />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} stroke="#64748B" fontSize={10} tickFormatter={(v) => v === 1 ? 'ON' : 'OFF'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="stepAfter"
                      dataKey={m.key}
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={`url(#motorGrad-${idx})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
        </div>

      </div>
    </div>
  );
};
