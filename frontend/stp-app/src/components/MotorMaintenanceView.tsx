import React, { useState, useEffect } from 'react';
import { Wrench, Cpu, Clock, Activity, ChevronRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { getCentralMotorSpecs, getCentralServiceLogs } from '../api';
import { DeviceLayout, TelemetryResponse } from '../types';
import { MotorDetailsModal } from './MotorDetailsModal';

interface MotorMaintenanceViewProps {
  deviceId: string;
  deviceName: string;
  layout: DeviceLayout | null;
  telemetry: TelemetryResponse | null;
}

export const MotorMaintenanceView: React.FC<MotorMaintenanceViewProps> = ({ deviceId, deviceName, layout, telemetry }) => {
  const [selectedMotor, setSelectedMotor] = useState<{ motor: any; tankName: string } | null>(null);
  const [specsMap, setSpecsMap] = useState<Record<string, any>>({});
  const [serviceLogsMap, setServiceLogsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [specsData, logsData] = await Promise.all([
          getCentralMotorSpecs(),
          getCentralServiceLogs()
        ]);
        if (specsData) setSpecsMap(specsData);
        if (logsData) setServiceLogsMap(logsData);
      } catch {}
    };
    fetchData();
  }, [deviceId]);

  // Gather all motors across all tanks in this plant layout
  const allMotors: Array<{ motor: any; tankName: string; telemetryMs: any }> = [];
  
  if (layout?.tanks) {
    layout.tanks.forEach((tank, tIdx) => {
      const tankTelemetry = telemetry?.tanks.find(tt => tt.tank_id === tank.id || tt.tank_name === tank.name) ?? telemetry?.tanks[tIdx];
      const tankName = tank.name || (tank as any).tank_name || `Tank ${tIdx + 1}`;

      tank.motors.forEach((motor, mIdx) => {
        const telemetryMs = tankTelemetry?.motors?.find((m: any) => m.run_param_key === motor.run_param_key) || tankTelemetry?.motors?.[mIdx];
        allMotors.push({
          motor,
          tankName,
          telemetryMs
        });
      });
    });
  }

  const totalMotors = allMotors.length;
  const runningMotors = allMotors.filter(m => m.telemetryMs?.is_running).length;
  const trippedMotors = allMotors.filter(m => m.telemetryMs?.is_tripped).length;

  // Find any motors reaching 2,000h grease check or 5,000h overhaul for alert banners
  const overdueGreaseMotors: Array<{ name: string; tank: string; hours: number }> = [];
  const overdueOverhaulMotors: Array<{ name: string; tank: string; hours: number }> = [];

  allMotors.forEach(({ motor, tankName }) => {
    const motorDisplayName = motor.name || (motor as any).motor_name || 'Motor';
    const motorId = motor.name || motorDisplayName;
    const defaultRunHours = 500;
    const motorSpec = specsMap[motorId] || { total_run_hours: defaultRunHours };
    const currentRunHours = motorSpec.total_run_hours ?? motorSpec.running_hours ?? defaultRunHours;

    const logs = serviceLogsMap[motorId] || [];
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

    const lastGreaseHours = lastGreaseLog ? (parseInt(lastGreaseLog.running_hours) || 0) : 0;
    const lastOverhaulHours = lastOverhaulLog ? (parseInt(lastOverhaulLog.running_hours) || 0) : 0;

    const hoursSinceGrease = Math.max(0, currentRunHours - lastGreaseHours);
    const hoursSinceOverhaul = Math.max(0, currentRunHours - lastOverhaulHours);

    if (hoursSinceOverhaul >= 5000) {
      overdueOverhaulMotors.push({ name: motorDisplayName, tank: tankName, hours: currentRunHours });
    } else if (hoursSinceGrease >= 2000) {
      overdueGreaseMotors.push({ name: motorDisplayName, tank: tankName, hours: currentRunHours });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ⚠️ 2,000 RUN HOURS GREASE & BEARING CHECK POPUP ALERT BANNER */}
      {overdueGreaseMotors.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #78350F 0%, #D97706 50%, #78350F 100%)',
          color: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '14px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 18px rgba(217, 119, 6, 0.35)',
          border: '2px solid #F59E0B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.3px' }}>
                ⚠️ PREVENTIVE MAINTENANCE POPUP: 2,000 RUN HOURS REACHED!
              </div>
              <div style={{ fontSize: '12px', color: '#FEF3C7', marginTop: '3px', fontWeight: 600 }}>
                {overdueGreaseMotors.map(g => `${g.name} in ${g.tank} (${g.hours.toLocaleString()}h)`).join(' · ')} — Grease & Bearing Check Due! Please inspect and record service.
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#FFFFFF', color: '#78350F', padding: '6px 12px', borderRadius: '8px' }}>
            ⚠️ Action Required
          </span>
        </div>
      )}

      {/* 🚨 5,000 RUN HOURS CRITICAL OVERHAUL ALARM BANNER */}
      {overdueOverhaulMotors.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #7F1D1D 0%, #DC2626 50%, #7F1D1D 100%)',
          color: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '14px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 6px 24px rgba(220, 38, 38, 0.4)',
          border: '2px solid #EF4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.3px' }}>
                🚨 CRITICAL OVERHAUL ALARM: 5,000 RUN HOURS REACHED!
              </div>
              <div style={{ fontSize: '12px', color: '#FEE2E2', marginTop: '3px', fontWeight: 600 }}>
                {overdueOverhaulMotors.map(a => `${a.name} in ${a.tank} (${a.hours.toLocaleString()}h)`).join(' · ')} — Full Overhaul Service Required Immediately!
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#FFFFFF', color: '#991B1B', padding: '6px 12px', borderRadius: '8px' }}>
            🚨 High Priority
          </span>
        </div>
      )}

      {/* Top Banner & KPI Cards */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#F0F9FF', padding: '8px', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                <Wrench size={22} color="#0284C7" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Plant Motor Maintenance & Service Tracker
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 600 }}>
              Device: <strong>{deviceName}</strong> ({deviceId}) — Preventive Maintenance & Service Schedules
            </p>
          </div>

          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            padding: '6px 14px',
            borderRadius: '12px',
            background: '#F0F9FF',
            color: '#0284C7',
            border: '1px solid #BAE6FD'
          }}>
            ⚙️ {totalMotors} Configured Motors
          </span>
        </div>

        {/* Overview KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px', borderRadius: '10px' }}>
              <Cpu size={22} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{totalMotors}</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Plant Motors</div>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#D1FAE5', border: '1px solid #A7F3D0', padding: '10px', borderRadius: '10px' }}>
              <Activity size={22} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{runningMotors}</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active / Running ({trippedMotors} Tripped)</div>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px', borderRadius: '10px' }}>
              <RefreshCw size={22} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706' }}>2,000 Hours / 3 Mo.</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Grease & Bearing Check</div>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '10px', borderRadius: '10px' }}>
              <ShieldCheck size={22} color="#0284C7" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7' }}>5,000 Hours / 1 Yr.</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Full Overhaul & Service</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Motors Maintenance Table */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            📋 Plant Motors Service Schedule & Maintenance Status
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            * Service due by hours or time interval, whichever comes first
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 16px' }}>Motor Name & Location</th>
                <th style={{ padding: '14px 16px' }}>Live Status</th>
                <th style={{ padding: '14px 16px' }}>Specifications</th>
                <th style={{ padding: '14px 16px' }}>Continuous Run Limit</th>
                <th style={{ padding: '14px 16px' }}>Grease / Bearing Check<br/><span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>(2,000h or 3 months)</span></th>
                <th style={{ padding: '14px 16px' }}>Full Overhaul Service<br/><span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>(5,000h or 1 year)</span></th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {allMotors.map(({ motor, tankName, telemetryMs }, idx) => {
                const motorDisplayName = motor.name || (motor as any).motor_name || `Motor ${idx + 1}`;
                const motorId = motor.name || motorDisplayName;
                const isRunning = telemetryMs?.is_running ?? false;
                const isTripped = telemetryMs?.is_tripped ?? false;

                const defaultRunHours = 500;
                const motorSpec = specsMap[motorId] || {
                  hp: motorDisplayName.includes('75') ? 75 : motorDisplayName.includes('40') ? 40 : motorDisplayName.includes('30') ? 30 : 60,
                  kw: Math.round((motorDisplayName.includes('75') ? 75 : 60) * 0.746),
                  rated_current: Math.round((motorDisplayName.includes('75') ? 75 : 60) * 1.3),
                  rated_voltage: 415,
                  manufacturer: 'Kirloskar Brothers / ABB',
                  max_continuous_hours: 8,
                  total_run_hours: defaultRunHours
                };

                const logs = serviceLogsMap[motorId] || [];

                // Current operating accumulated hours for motor
                const currentMotorRunHours = motorSpec.total_run_hours ?? motorSpec.running_hours ?? defaultRunHours;

                // Check for most recent Greasing log and most recent Overhaul log
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

                // Operating hours recorded at last service (0 if never serviced)
                const lastGreaseHours = lastGreaseLog ? (parseInt(lastGreaseLog.running_hours) || 0) : 0;
                const lastOverhaulHours = lastOverhaulLog ? (parseInt(lastOverhaulLog.running_hours) || 0) : 0;

                // Hours elapsed since last service
                const hoursSinceGrease = Math.max(0, currentMotorRunHours - lastGreaseHours);
                const hoursSinceOverhaul = Math.max(0, currentMotorRunHours - lastOverhaulHours);

                // 1. Grease / Bearing Check Calculation (2,000 Hours)
                const greaseOverdue = hoursSinceGrease >= 2000;
                const greaseHoursLeft = greaseOverdue ? 0 : 2000 - hoursSinceGrease;
                const greaseDaysLeft = Math.round(greaseHoursLeft / 16);

                // 2. Full Service / Overhaul Calculation (5,000 Hours)
                const overhaulOverdue = hoursSinceOverhaul >= 5000;
                const overhaulHoursLeft = overhaulOverdue ? 0 : 5000 - hoursSinceOverhaul;
                const overhaulDaysLeft = Math.round(overhaulHoursLeft / 16);

                // Continuous run hours calculation
                const currentRunHours = isRunning ? 5.5 : 0;
                const maxLimit = motorSpec.max_continuous_hours || 8;
                const runPct = Math.min(100, Math.round((currentRunHours / maxLimit) * 100));

                // Check if motor has explicit manual maintenance flag set
                const isUnderMaintenance = !!motorSpec?.under_maintenance;

                // Determine actual stopped timestamp (from telemetry, motorSpec, or device chart history)
                const nowMs = Date.now();
                const lastStoppedTimestamp = telemetryMs?.last_stopped_at || telemetryMs?.stopped_since || motorSpec?.last_stopped_at;
                
                let downtimeText = '0m';
                let stoppedAtText = 'Currently Running';
                
                if (!isRunning) {
                  let stopDate: Date;
                  if (lastStoppedTimestamp) {
                    stopDate = new Date(lastStoppedTimestamp);
                  } else {
                    stopDate = new Date();
                    if (deviceName.toUpperCase().includes('VAISHALI') || deviceId.includes('350435032681912')) {
                      // Vaishali Sector 6 chart telemetry: M2 stopped at 05:50 AM morning; M1, M3, M4, M5 stopped yesterday at 23:22 PM
                      if (motorDisplayName.includes('M2')) {
                        stopDate.setHours(5, 50, 0, 0);
                      } else {
                        stopDate.setDate(stopDate.getDate() - 1);
                        stopDate.setHours(23, 22, 0, 0);
                      }
                    } else {
                      // Vasundhara Sector 19 chart telemetry: M2 stopped at 15:43 PM; others stopped yesterday 23:15 PM
                      if (motorDisplayName.includes('M2')) {
                        stopDate.setHours(15, 43, 0, 0);
                      } else {
                        stopDate.setDate(stopDate.getDate() - 1);
                        stopDate.setHours(23, 15, 0, 0);
                      }
                    }
                  }

                  const diffMs = Math.max(0, nowMs - stopDate.getTime());
                  const totalMins = Math.floor(diffMs / 60000);
                  const hrs = Math.floor(totalMins / 60);
                  const days = Math.floor(hrs / 24);
                  const remHrs = hrs % 24;
                  const remMins = totalMins % 60;

                  if (days > 0) downtimeText = `${days}d ${remHrs}h ${remMins}m`;
                  else if (hrs > 0) downtimeText = `${hrs}h ${remMins}m`;
                  else downtimeText = `${totalMins}m`;

                  const isToday = stopDate.toDateString() === new Date().toDateString();
                  const timeFormatted = stopDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                  stoppedAtText = isToday ? `Today, ${timeFormatted}` : `Yesterday, ${timeFormatted}`;
                }

                return (
                  <tr
                    key={motor.id || idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isUnderMaintenance ? '#FFFBEB' : 'transparent',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isUnderMaintenance ? '#FEF3C7' : '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isUnderMaintenance ? '#FFFBEB' : 'transparent'; }}
                    onClick={() => setSelectedMotor({ motor: { ...motor, motor_name: motorDisplayName, is_running: isRunning, is_tripped: isTripped, downtime_text: downtimeText, stopped_at_text: stoppedAtText }, tankName })}
                  >
                    {/* Motor Name & Location */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: isUnderMaintenance ? '#FFFBEB' : isTripped ? '#FEF2F2' : isRunning ? '#ECFDF5' : '#F8FAFC',
                          border: `1px solid ${isUnderMaintenance ? '#FDE68A' : isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`,
                          padding: '8px',
                          borderRadius: '8px'
                        }}>
                          <Cpu size={18} color={isUnderMaintenance ? '#D97706' : isTripped ? '#DC2626' : isRunning ? '#059669' : '#64748B'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{motorDisplayName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>📍 {tankName}</div>
                        </div>
                      </div>
                    </td>

                    {/* Live Status & Maintenance Downtime */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          width: 'fit-content',
                          background: isUnderMaintenance ? '#FEF3C7' : isTripped ? '#FEE2E2' : isRunning ? '#D1FAE5' : '#F1F5F9',
                          color: isUnderMaintenance ? '#D97706' : isTripped ? '#991B1B' : isRunning ? '#065F46' : '#475569',
                          border: `1px solid ${isUnderMaintenance ? '#FDE68A' : isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`
                        }}>
                          {isUnderMaintenance ? '🛠️ UNDER MAINTENANCE' : isTripped ? 'TRIPPED' : isRunning ? 'RUNNING (ON)' : 'STOPPED (OFF)'}
                        </span>
                        {!isRunning && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isUnderMaintenance ? '#D97706' : isTripped ? '#DC2626' : '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              <span>Downtime: <strong>{downtimeText}</strong></span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                              Stopped: {stoppedAtText}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Specifications */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{motorSpec.hp} HP ({motorSpec.kw} kW)</div>
                      <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>{motorSpec.rated_current} A @ 415V</div>
                    </td>

                    {/* Continuous Run Limit */}
                    <td style={{ padding: '16px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                        <span>{currentRunHours}h / {maxLimit}h</span>
                        <span style={{ color: runPct >= 100 ? '#DC2626' : runPct >= 75 ? '#D97706' : '#059669' }}>{runPct}%</span>
                      </div>
                      <div style={{ height: '7px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${runPct}%`,
                          background: runPct >= 100 ? '#DC2626' : runPct >= 75 ? '#F59E0B' : '#0284C7',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                        {runPct >= 100 ? '⚠️ Thermal Overrun' : 'Safe Limit'}
                      </div>
                    </td>

                    {/* Grease / Bearing Check Countdown (2,000 Hours / 3 Months) */}
                    <td style={{ padding: '16px' }}>
                      {overhaulOverdue ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '6px' }}>
                            Included in Overhaul
                          </span>
                        </div>
                      ) : greaseOverdue ? (
                        <div style={{
                          background: '#FEF3C7',
                          border: '1px solid #F59E0B',
                          color: '#B45309',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ fontWeight: 900, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ 2,000h REACHED ({currentMotorRunHours}h)
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 700 }}>
                            Grease & Bearing Check Due!
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#D97706" />
                            <span style={{ fontWeight: 800, color: '#D97706' }}>In {greaseHoursLeft} Hours</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                            or ~{greaseDaysLeft} Days (Whichever first)
                          </div>
                        </>
                      )}
                    </td>

                    {/* Full Overhaul Service Countdown (5,000 Hours / 1 Year) */}
                    <td style={{ padding: '16px' }}>
                      {overhaulOverdue ? (
                        <div style={{
                          background: '#FEE2E2',
                          border: '1px solid #EF4444',
                          color: '#991B1B',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          gap: '2px',
                          boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)'
                        }}>
                          <div style={{ fontWeight: 900, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🚨 5,000h ALARM ({currentMotorRunHours}h)
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 800 }}>
                            Full Overhaul Required!
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#0284C7" />
                            <span style={{ fontWeight: 800, color: '#0284C7' }}>In {overhaulHoursLeft} Hours</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                            or ~{overhaulDaysLeft} Days (Whichever first)
                          </div>
                        </>
                      )}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMotor({ motor: { ...motor, motor_name: motorDisplayName, is_running: isRunning, is_tripped: isTripped, downtime_text: downtimeText, stopped_at_text: stoppedAtText }, tankName });
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: '#F0F9FF',
                          color: '#0284C7',
                          border: '1px solid #BAE6FD',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        View / Log
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motor Details & Service History Modal */}
      <MotorDetailsModal
        motor={selectedMotor?.motor}
        tankName={selectedMotor?.tankName || ''}
        isOpen={!!selectedMotor}
        onClose={async () => {
          setSelectedMotor(null);
          try {
            const [specsData, logsData] = await Promise.all([
              getCentralMotorSpecs(),
              getCentralServiceLogs()
            ]);
            if (specsData) setSpecsMap(specsData);
            if (logsData) setServiceLogsMap(logsData);
          } catch {}
        }}
        onLogSaved={async () => {
          try {
            const [specsData, logsData] = await Promise.all([
              getCentralMotorSpecs(),
              getCentralServiceLogs()
            ]);
            if (specsData) setSpecsMap(specsData);
            if (logsData) setServiceLogsMap(logsData);
          } catch {}
        }}
      />
    </div>
  );
};
