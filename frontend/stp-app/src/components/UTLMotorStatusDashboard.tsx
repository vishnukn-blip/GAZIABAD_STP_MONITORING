import React, { useState } from 'react';
import { AlertOctagon, Power, RefreshCw, Zap } from 'lucide-react';

interface MotorItem {
  id: string;
  num: number;
  name: string;
  badge: 'WORKING' | 'STANDBY' | 'FAULT';
  status: 'ON' | 'OFF';
  powerKw: number;
  tempC: number;
  runtimeHours: number;
  loadCurrent: number[];
}

interface TankSystem {
  title: string;
  tankName: string;
  levelPct: number;
  flowRate: string;
  leftMotorId: string;
  rightMotorId: string;
}

export const UTLMotorStatusDashboard: React.FC = () => {
  const [stopAll, setStopAll] = useState(false);

  // 10 Motors matching UTL Instance 13.200.3.121
  const [motors, setMotors] = useState<Record<string, MotorItem>>({
    m2: {
      id: 'm2',
      num: 2,
      name: 'Sewage Feed Pump 1',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 1240.2,
      loadCurrent: [12, 12, 11.8, 12.1, 12, 11.5, 8, 4, 0, 0]
    },
    m3: {
      id: 'm3',
      num: 3,
      name: 'Sewage Feed Pump 2',
      badge: 'STANDBY',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 892.8,
      loadCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    m4: {
      id: 'm4',
      num: 4,
      name: 'Air Blower 1',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 1150.5,
      loadCurrent: [15, 15.2, 15, 14.8, 15, 15.1, 10, 5, 0, 0]
    },
    m5: {
      id: 'm5',
      num: 5,
      name: 'Air Blower 2',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 980.2,
      loadCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    m6: {
      id: 'm6',
      num: 6,
      name: 'Submersible Mixer 1',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 740.0,
      loadCurrent: [8.5, 8.5, 8.4, 8.6, 8.5, 8.5, 5, 0, 0, 0]
    },
    m7: {
      id: 'm7',
      num: 7,
      name: 'Submersible Mixer 2',
      badge: 'STANDBY',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 610.4,
      loadCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    m8: {
      id: 'm8',
      num: 8,
      name: 'Filter Feed Pump 1',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 1420.8,
      loadCurrent: [14, 14.1, 14, 13.9, 14, 14, 7, 0, 0, 0]
    },
    m9: {
      id: 'm9',
      num: 9,
      name: 'Filter Feed Pump 2',
      badge: 'STANDBY',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 1100.3,
      loadCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    m10: {
      id: 'm10',
      num: 10,
      name: 'Sludge Recirculation Pump 1',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 530.1,
      loadCurrent: [10, 10.1, 10, 9.9, 10, 10, 4, 0, 0, 0]
    },
    m1: {
      id: 'm1',
      num: 1,
      name: 'Sludge Recirculation Pump 2',
      badge: 'WORKING',
      status: 'OFF',
      powerKw: 0.0,
      tempC: 23.5,
      runtimeHours: 490.6,
      loadCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  });

  const toggleMotorStatus = (key: string) => {
    setMotors(prev => {
      const current = prev[key];
      const nextStatus = current.status === 'ON' ? 'OFF' : 'ON';
      return {
        ...prev,
        [key]: {
          ...current,
          status: nextStatus,
          powerKw: nextStatus === 'ON' ? 7.5 : 0.0,
          loadCurrent: nextStatus === 'ON' ? [14, 14.2, 14.5, 14.3, 14.4, 14.2, 14.3, 14.5, 14.4, 14.2] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      };
    });
  };

  const systems: TankSystem[] = [
    {
      title: 'SEWAGE FEED SYSTEM',
      tankName: 'Collection Tank',
      levelPct: 50,
      flowRate: '0 m³/h',
      leftMotorId: 'm2',
      rightMotorId: 'm3'
    },
    {
      title: 'AERATION BLOWER SYSTEM',
      tankName: 'Aeration Tank',
      levelPct: 65,
      flowRate: '120 m³/h',
      leftMotorId: 'm4',
      rightMotorId: 'm5'
    },
    {
      title: 'ANOXIC MIXING SYSTEM',
      tankName: 'Anoxic Tank',
      levelPct: 40,
      flowRate: '45 m³/h',
      leftMotorId: 'm6',
      rightMotorId: 'm7'
    },
    {
      title: 'FILTER FEED SYSTEM',
      tankName: 'Filter Tank',
      levelPct: 55,
      flowRate: '80 m³/h',
      leftMotorId: 'm8',
      rightMotorId: 'm9'
    },
    {
      title: 'SLUDGE RECIRCULATION SYSTEM',
      tankName: 'Treated Water Tank',
      levelPct: 80,
      flowRate: '30 m³/h',
      leftMotorId: 'm10',
      rightMotorId: 'm1'
    }
  ];

  // Metrics
  const motorList = Object.values(motors);
  const totalPumps = motorList.length;
  const activePumps = motorList.filter(m => m.status === 'ON' || m.badge === 'WORKING').length > 0 ? 1 : 0;
  const standbyPumps = motorList.filter(m => m.badge === 'STANDBY').length;
  const faults = motorList.filter(m => m.badge === 'FAULT').length;

  const renderLoadSparkline = (dataPoints: number[]) => {
    const min = 0;
    const max = 20;
    const svgPoints = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * 260;
      const y = 35 - ((val - min) / (max - min)) * 30;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 260 40" style={{ width: '100%', height: '35px', overflow: 'visible' }}>
        <polyline points={svgPoints} fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderMotorCard = (motor: MotorItem) => {
    const isWorking = motor.badge === 'WORKING';
    const isStandby = motor.badge === 'STANDBY';
    const isFault = motor.badge === 'FAULT';

    const badgeBg = isFault ? '#FEF2F2' : isWorking ? '#ECFDF5' : '#FEF9C3';
    const badgeColor = isFault ? '#DC2626' : isWorking ? '#059669' : '#CA8A04';
    const badgeBorder = isFault ? '#FCA5A5' : isWorking ? '#6EE7B7' : '#FDE047';

    return (
      <div style={{
        background: '#FFFDF0',
        borderRadius: '16px',
        border: '1.5px solid #FDE68A',
        padding: '18px 20px',
        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        height: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Card Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#451A03' }}>#{motor.num}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: badgeBg,
                color: badgeColor,
                border: `1px solid ${badgeBorder}`,
                letterSpacing: '0.5px'
              }}>
                {motor.badge}
              </span>
            </div>

            {/* Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                onClick={() => toggleMotorStatus(motor.id)}
                style={{
                  width: '42px',
                  height: '22px',
                  borderRadius: '12px',
                  background: motor.status === 'ON' ? '#10B981' : '#CBD5E1',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  padding: '2px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  left: motor.status === 'ON' ? '22px' : '2px',
                  top: '2px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <AlertOctagon size={16} color="#B45309" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          {/* Motor Title */}
          <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#78350F', margin: '0 0 6px 0' }}>
            {motor.name}
          </h4>

          {/* Live Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: motor.status === 'ON' ? '#10B981' : '#94A3B8'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: motor.status === 'ON' ? '#059669' : '#64748B' }}>
              {motor.status === 'ON' ? 'RUNNING (ON)' : 'OFF'}
            </span>
          </div>

          {/* Load Current Sparkline */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#92400E', letterSpacing: '0.5px', marginBottom: '4px' }}>
              LOAD CURRENT (A)
            </div>
            <div style={{ background: '#FEF3C7', padding: '6px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              {renderLoadSparkline(motor.loadCurrent)}
            </div>
          </div>
        </div>

        {/* Card Footer Parameters */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#92400E', fontWeight: 700 }}>POWER</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#451A03' }}>{motor.powerKw.toFixed(1)} kW</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#92400E', fontWeight: 700 }}>TEMP</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#451A03' }}>{motor.tempC.toFixed(1)} °C</div>
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 800, color: '#78350F', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⏱️</span> {motor.runtimeHours.toLocaleString()}h
          </div>
        </div>
      </div>
    );
  };

  const renderTankSystemBox = (sys: TankSystem) => {
    return (
      <div style={{
        background: '#E0F2FE',
        borderRadius: '16px',
        border: '1.5px solid #7DD3FC',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        height: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: '10px', fontWeight: 900, color: '#0369A1', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          {sys.title}
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0C4A6E', margin: '4px 0 12px 0' }}>
          {sys.tankName}
        </h3>

        {/* Tank Water Level Visualization Box */}
        <div style={{
          width: '100%',
          maxWidth: '220px',
          height: '90px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #BAE6FD',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}>
          {/* Water Fill */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${sys.levelPct}%`,
            background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
            transition: 'height 0.5s ease'
          }} />
          <span style={{
            position: 'relative',
            fontSize: '16px',
            fontWeight: 900,
            color: sys.levelPct > 45 ? '#FFFFFF' : '#0F172A',
            zIndex: 2,
            textShadow: sys.levelPct > 45 ? '0 1px 3px rgba(0,0,0,0.4)' : 'none'
          }}>
            {sys.levelPct}%
          </span>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Inlet Flow</span>
          <span style={{ fontWeight: 900, color: '#0C4A6E' }}>{sys.flowRate}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#F8FAFC', padding: '24px 32px', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ─── TOP HEADER CONTROL BAR ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.4px' }}>
              MOTOR STATUS CONTROL
            </h1>
            <button
              onClick={() => setStopAll(prev => !prev)}
              style={{
                background: stopAll ? '#EF4444' : '#FEF2F2',
                color: stopAll ? '#FFFFFF' : '#DC2626',
                border: '1.5px solid #FCA5A5',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)'
              }}
            >
              <Power size={14} /> {stopAll ? 'ALL MOTORS STOPPED' : 'STOP ALL MOTORS'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 600 }}>
            Real-time load, temperature, and operation modes for all 10 STP pumps
          </p>
        </div>

        {/* 📊 Top Right 4 KPI Summary Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Card 1: Total Pumps */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '10px 18px',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>TOTAL PUMPS</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>{totalPumps}</div>
          </div>

          {/* Card 2: Active (ON) */}
          <div style={{
            background: '#ECFDF5',
            borderRadius: '12px',
            border: '1px solid #A7F3D0',
            padding: '10px 18px',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' }}>ACTIVE (ON)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>1</div>
          </div>

          {/* Card 3: Standby (OFF) */}
          <div style={{
            background: '#FEF9C3',
            borderRadius: '12px',
            border: '1px solid #FDE047',
            padding: '10px 18px',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#CA8A04', letterSpacing: '0.5px' }}>STANDBY (OFF)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#854D0E', marginTop: '2px' }}>4</div>
          </div>

          {/* Card 4: Faults */}
          <div style={{
            background: '#FEF2F2',
            borderRadius: '12px',
            border: '1px solid #FCA5A5',
            padding: '10px 18px',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', letterSpacing: '0.5px' }}>FAULTS</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#991B1B', marginTop: '2px' }}>{faults}</div>
          </div>
        </div>
      </div>

      {/* ─── PUMPS & SYSTEM CARDS GRID (5 STAGE ROWS) ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {systems.map((sys, idx) => {
          const leftMotor = motors[sys.leftMotorId];
          const rightMotor = motors[sys.rightMotorId];

          return (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 300px 1fr',
                gap: '20px',
                alignItems: 'stretch'
              }}
            >
              {/* Left Motor Card */}
              <div>{renderMotorCard(leftMotor)}</div>

              {/* Center Tank System Box */}
              <div>{renderTankSystemBox(sys)}</div>

              {/* Right Motor Card */}
              <div>{renderMotorCard(rightMotor)}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
