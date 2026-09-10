import React, { useState, useEffect } from 'react';
import { X, Activity, Wrench, ShieldAlert, Clock, CheckCircle2, AlertTriangle, PlusCircle, Cpu } from 'lucide-react';
import { getCentralMotorSpecs, saveCentralMotorSpecs, getCentralServiceLogs, saveCentralServiceLogs, getCentralPlantReplacements, saveCentralPlantReplacements } from '../api';

interface MotorDetailsModalProps {
  motor: any;
  tankName: string;
  isOpen: boolean;
  onClose: () => void;
  onLogSaved?: () => void;
}

export const MotorDetailsModal: React.FC<MotorDetailsModalProps> = ({ motor, tankName, isOpen, onClose, onLogSaved }) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'history'>('specs');
  const [specs, setSpecs] = useState<any>({
    hp: 60,
    kw: 45,
    rated_current: 78.5,
    rated_voltage: 415,
    manufacturer: 'Kirloskar Brothers / ABB',
    max_continuous_hours: 8,
    recommended_service_hours: 500
  });

  const [serviceLogs, setServiceLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'Bearing Greasing',
    technician: 'WABAG Service Team',
    running_hours: '1420',
    part_cost: '1500',
    labor_cost: '1000',
    notes: 'Flushed old grease and packed NLGI Grade 2 lithium complex grease in DE & NDE bearings.',
    next_due_date: '2026-11-20'
  });
  const [showLogForm, setShowLogForm] = useState(false);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);

  const motorId = motor?.name || motor?.motor_name || 'MOTOR_1';
  const isRunning = motor?.is_running ?? true;
  const isTripped = motor?.is_tripped ?? false;

  // Mock calculated continuous run time for hardcoded demo (e.g. 5.5 hours)
  const currentRunHours = isRunning ? 5.5 : 0;
  const maxLimit = specs.max_continuous_hours || 8;
  const runPercentage = Math.min(100, Math.round((currentRunHours / maxLimit) * 100));

  let riskLevel: 'normal' | 'warning' | 'critical' = 'normal';
  if (runPercentage >= 100) riskLevel = 'critical';
  else if (runPercentage >= 75) riskLevel = 'warning';

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      // 1. Fetch Specs
      try {
        const centralSpecsMap = await getCentralMotorSpecs();
        if (centralSpecsMap && centralSpecsMap[motorId]) {
          setSpecs(centralSpecsMap[motorId]);
          setIsUnderMaintenance(!!centralSpecsMap[motorId].under_maintenance);
        } else {
          // Hardcoded fallback spec based on motor name
          const hpVal = motorId.includes('75') ? 75 : motorId.includes('40') ? 40 : motorId.includes('30') ? 30 : 60;
          setSpecs({
            hp: hpVal,
            kw: Math.round(hpVal * 0.746),
            rated_current: Math.round(hpVal * 1.3),
            rated_voltage: 415,
            manufacturer: 'Kirloskar Brothers / ABB',
            max_continuous_hours: 8,
            recommended_service_hours: 500
          });
        }
      } catch {}

      // 2. Fetch Service Logs
      try {
        const logsMap = await getCentralServiceLogs();
        if (logsMap && Array.isArray(logsMap[motorId])) {
          setServiceLogs(logsMap[motorId]);
        } else {
          // Default hardcoded service logs with bearing greasing, rewinding & costs
          setServiceLogs([
            {
              id: '1',
              service_date: '2026-08-20',
              service_type: 'Bearing Greasing',
              technician: 'WABAG Service Team',
              running_hours: '1420',
              part_cost: 1500,
              labor_cost: 1000,
              total_cost: 2500,
              notes: 'Flushed old grease and packed high-temperature NLGI 2 Lithium complex grease in DE & NDE bearings.',
              next_due_date: '2026-11-20'
            },
            {
              id: '2',
              service_date: '2026-06-15',
              service_type: 'Bearing Replacement',
              technician: 'SKF Authorized Service',
              running_hours: '1100',
              part_cost: 8500,
              labor_cost: 3000,
              total_cost: 11500,
              notes: 'Replaced worn Drive End (DE) 6314 C3 ball bearing and mechanical shaft seal due to minor vibration.',
              next_due_date: '2027-06-15'
            },
            {
              id: '3',
              service_date: '2026-03-10',
              service_type: 'Motor Rewinding',
              technician: 'ABB Motors Repair Works',
              running_hours: '650',
              part_cost: 32000,
              labor_cost: 6500,
              total_cost: 38500,
              notes: 'Complete Class H copper stator coil rewinding, vacuum pressure impregnation (VPI) varnishing, and rotor balancing.',
              next_due_date: '2027-03-10'
            }
          ]);
        }
      } catch {}
    };

    loadData();
  }, [isOpen, motorId]);

  const handleAddLog = async () => {
    if (!newLog.service_type || !newLog.technician) return;

    const pCost = parseFloat(newLog.part_cost) || 0;
    const lCost = parseFloat(newLog.labor_cost) || 0;
    const tCost = pCost + lCost;

    const logEntry = {
      id: Date.now().toString(),
      service_date: newLog.service_date,
      service_type: newLog.service_type,
      technician: newLog.technician,
      running_hours: newLog.running_hours,
      part_cost: pCost,
      labor_cost: lCost,
      total_cost: tCost,
      notes: newLog.notes,
      next_due_date: newLog.next_due_date
    };

    const updated = [logEntry, ...serviceLogs];
    setServiceLogs(updated);

    try {
      const logsMap = (await getCentralServiceLogs()) || {};
      logsMap[motorId] = updated;
      await saveCentralServiceLogs(logsMap);

      // Auto-sync cost to Plant Replacements & Expenditure Log if total cost > 0
      const activeDeviceId = motor?.device_id || "350435032683868";
      if (tCost > 0) {
        const replacements = (await getCentralPlantReplacements()) || [];
        const newReplRecord = {
          id: `maint_${Date.now()}`,
          device_id: activeDeviceId,
          replacement_date: newLog.service_date,
          category: 'Bearing & Rewinding' as const,
          component_name: `${motorId} (${tankName})`,
          quantity: 1,
          old_part_details: `Activity: ${newLog.service_type}`,
          new_part_details: `Completed: ${newLog.service_type} - ${newLog.notes || 'Service overhaul'}`,
          vendor_name: newLog.technician,
          invoice_no: `SRV-${Date.now().toString().slice(-6)}`,
          part_cost: pCost,
          labor_cost: lCost,
          total_cost: tCost,
          warranty_months: newLog.service_type.includes('Rewinding') ? 12 : 6,
          reason_notes: `Logged via Motor Maintenance Tracker: ${newLog.service_type}`
        };
        await saveCentralPlantReplacements([newReplRecord, ...replacements]);
      }

      // Clear under_maintenance status and update service run hour markers according to service type
      setIsUnderMaintenance(false);
      const centralSpecs = (await getCentralMotorSpecs()) || {};
      const currentMotorSpec = centralSpecs[motorId] || specs;
      const currentTotalRunHours = currentMotorSpec.total_run_hours ?? currentMotorSpec.running_hours ?? 2050;
      const serviceRunHours = parseInt(newLog.running_hours) || currentTotalRunHours;
      
      const isOverhaulType = 
        newLog.service_type?.toLowerCase().includes('overhaul') || 
        newLog.service_type?.toLowerCase().includes('rewind');

      const isGreaseType = 
        newLog.service_type?.toLowerCase().includes('greasing') || 
        newLog.service_type?.toLowerCase().includes('bearing') ||
        isOverhaulType;

      const updatedSpec = {
        ...currentMotorSpec,
        under_maintenance: false,
        total_run_hours: Math.max(currentTotalRunHours, serviceRunHours),
        last_grease_hours: isGreaseType ? serviceRunHours : (currentMotorSpec.last_grease_hours || 0),
        last_overhaul_hours: isOverhaulType ? serviceRunHours : (currentMotorSpec.last_overhaul_hours || 0)
      };
      setSpecs(updatedSpec);
      centralSpecs[motorId] = updatedSpec;
      await saveCentralMotorSpecs(centralSpecs);
    } catch {}

    setShowLogForm(false);
    if (onLogSaved) onLogSaved();
    setNewLog({
      service_date: new Date().toISOString().split('T')[0],
      service_type: 'Bearing Greasing',
      technician: 'WABAG Service Team',
      running_hours: '1500',
      part_cost: '1500',
      labor_cost: '1000',
      notes: '',
      next_due_date: ''
    });
  };

  const toggleMaintenanceStatus = async () => {
    const nextState = !isUnderMaintenance;
    setIsUnderMaintenance(nextState);
    try {
      const allSpecs = (await getCentralMotorSpecs()) || {};
      allSpecs[motorId] = { ...(allSpecs[motorId] || specs), under_maintenance: nextState };
      await saveCentralMotorSpecs(allSpecs);
      if (onLogSaved) onLogSaved();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #CBD5E1'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: isTripped ? '#FEF2F2' : isRunning ? '#ECFDF5' : '#F8FAFC',
              border: `1px solid ${isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`,
              padding: '10px',
              borderRadius: '12px'
            }}>
              <Cpu size={24} color={isTripped ? '#DC2626' : isRunning ? '#059669' : '#64748B'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {motor?.name || motor?.motor_name || 'Motor Details'}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: isUnderMaintenance ? '#FEF3C7' : isTripped ? '#FEE2E2' : isRunning ? '#D1FAE5' : '#F1F5F9',
                  color: isUnderMaintenance ? '#D97706' : isTripped ? '#991B1B' : isRunning ? '#065F46' : '#475569',
                  border: `1px solid ${isUnderMaintenance ? '#FDE68A' : isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`
                }}>
                  {isUnderMaintenance ? '🛠️ UNDER MAINTENANCE' : isTripped ? 'TRIPPED' : isRunning ? 'RUNNING (ON)' : 'STOPPED (OFF)'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 600 }}>
                Location: {tankName || 'STP Plant Tank'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
          padding: '0 24px'
        }}>
          <button
            onClick={() => setActiveTab('specs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 18px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'specs' ? '3px solid #0284C7' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'specs' ? '#0284C7' : '#64748B',
              cursor: 'pointer'
            }}
          >
            <Activity size={16} />
            Specs & Breakdown Risk
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 18px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #0284C7' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'history' ? '#0284C7' : '#64748B',
              cursor: 'pointer'
            }}
          >
            <Wrench size={16} />
            Service & Maintenance History ({serviceLogs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'specs' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Continuous Operating & Breakdown Prevention Status */}
              <div style={{
                background: riskLevel === 'critical' ? '#FEF2F2' : riskLevel === 'warning' ? '#FFFBEB' : '#F0F9FF',
                border: `1px solid ${riskLevel === 'critical' ? '#FCA5A5' : riskLevel === 'warning' ? '#FDE68A' : '#BAE6FD'}`,
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} color={riskLevel === 'critical' ? '#DC2626' : riskLevel === 'warning' ? '#D97706' : '#0284C7'} />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Continuous Operating Hours Tracker
                      </h4>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                        Monitors run time without rest to prevent motor thermal breakdown
                      </p>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: riskLevel === 'critical' ? '#DC2626' : riskLevel === 'warning' ? '#D97706' : '#0284C7',
                    color: '#FFFFFF'
                  }}>
                    {riskLevel === 'critical' ? 'OVERRUN ALERT' : riskLevel === 'warning' ? 'SWITCHOVER ADVISORY' : 'NORMAL OPERATING'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    <span>Current Run: {currentRunHours} Hours</span>
                    <span>Max Allowed: {maxLimit} Hours</span>
                  </div>
                  <div style={{ height: '10px', background: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${runPercentage}%`,
                      background: riskLevel === 'critical' ? '#DC2626' : riskLevel === 'warning' ? '#F59E0B' : '#0284C7',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                </div>

                {/* Risk Advice */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {riskLevel === 'critical' ? (
                    <>
                      <ShieldAlert size={16} color="#DC2626" />
                      <span style={{ color: '#991B1B' }}>⚠️ <strong>Warning:</strong> Motor has exceeded continuous operating threshold. Rest motor or toggle standby pump to prevent winding damage!</span>
                    </>
                  ) : riskLevel === 'warning' ? (
                    <>
                      <AlertTriangle size={16} color="#D97706" />
                      <span style={{ color: '#92400E' }}>💡 <strong>Advisory:</strong> Motor has reached 75%+ continuous operating limit. Recommend switching to alternate pump soon.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#059669" />
                      <span style={{ color: '#065F46' }}>✅ Motor operating within safe continuous thermal limits.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Maintenance & Downtime Duration Banner */}
              <div style={{
                background: !isRunning ? (isTripped ? '#FEF2F2' : '#FFFBEB') : '#ECFDF5',
                border: `1px solid ${!isRunning ? (isTripped ? '#FCA5A5' : '#FDE68A') : '#A7F3D0'}`,
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: !isRunning ? (isTripped ? '#FEE2E2' : '#FEF3C7') : '#D1FAE5',
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${!isRunning ? (isTripped ? '#FCA5A5' : '#FDE68A') : '#A7F3D0'}`
                  }}>
                    <Clock size={22} color={!isRunning ? (isTripped ? '#DC2626' : '#D97706') : '#059669'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                      Pump Operational & Maintenance Status
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: !isRunning ? (isTripped ? '#991B1B' : '#92400E') : '#065F46', marginTop: '2px' }}>
                      {!isRunning ? `⏱️ Non-Operational Downtime: ${motor?.downtime_text || '28m'}` : '🟢 Active Operational (0m Downtime)'}
                    </div>
                    {!isRunning && (
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        Stopped At: <strong>{motor?.stopped_at_text || 'Today, 03:43 PM'}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={toggleMaintenanceStatus}
                  title={isUnderMaintenance ? 'Click to clear maintenance and mark motor as operational' : 'Click to flag motor as under maintenance / unavailable'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: isUnderMaintenance ? '#FEF3C7' : '#F8FAFC',
                    color: isUnderMaintenance ? '#B45309' : '#475569',
                    border: `1.5px solid ${isUnderMaintenance ? '#F59E0B' : '#CBD5E1'}`,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isUnderMaintenance ? '🛠️ UNDER MAINTENANCE (Click to Mark Operational)' : '⚙️ Flag Under Maintenance'}
                </button>
              </div>

              {/* Nameplate Specifications Grid */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                  📋 Nameplate Technical Specifications
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px'
                }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Rated Power</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{specs.hp} HP ({specs.kw} kW)</div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Rated Current</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>{specs.rated_current} Amps</div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supply Voltage</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{specs.rated_voltage}V (3-Phase)</div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Manufacturer</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{specs.manufacturer}</div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Max Continuous Limit</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{specs.max_continuous_hours || 8} Hours</div>
                  </div>

                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>Grease / Bearing Check</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>Every 2,000h or 3 Months</div>
                  </div>

                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>Full Service & Overhaul</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>Every 4,000–5,000h or 1 Year</div>
                  </div>
                </div>

                {/* Accumulated Run Hours & Maintenance Alarm Control */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        ⏱️ Total Operating Run Hours & Threshold Alarms
                      </h5>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 600 }}>
                        Configured cumulative operating hours for threshold evaluation (2,000h Grease Popup / 5,000h Overhaul Alarm)
                      </p>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#0284C7' }}>
                      {(specs.total_run_hours ?? 500).toLocaleString()} Hours
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Quick Alarm Presets:</span>
                    <button
                      onClick={async () => {
                        const lastGreaseLog = serviceLogs.find((l: any) => 
                          l.service_type?.toLowerCase().includes('greasing') || 
                          l.service_type?.toLowerCase().includes('bearing') ||
                          l.service_type?.toLowerCase().includes('rewind') ||
                          l.service_type?.toLowerCase().includes('overhaul')
                        );
                        const lastHrs = lastGreaseLog ? (parseInt(lastGreaseLog.running_hours) || 0) : 0;
                        const targetHours = lastHrs + 2050;

                        const updated = { ...specs, total_run_hours: targetHours };
                        setSpecs(updated);
                        try {
                          const centralSpecs = (await getCentralMotorSpecs()) || {};
                          centralSpecs[motorId] = updated;
                          await saveCentralMotorSpecs(centralSpecs);
                          if (onLogSaved) onLogSaved();
                        } catch {}
                      }}
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        color: '#B45309',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ⚠️ Trigger 2,000h Grease Popup
                    </button>

                    <button
                      onClick={async () => {
                        const lastOverhaulLog = serviceLogs.find((l: any) => 
                          l.service_type?.toLowerCase().includes('rewind') || 
                          l.service_type?.toLowerCase().includes('overhaul')
                        );
                        const lastHrs = lastOverhaulLog ? (parseInt(lastOverhaulLog.running_hours) || 0) : 0;
                        const targetHours = lastHrs + 5120;

                        const updated = { ...specs, total_run_hours: targetHours };
                        setSpecs(updated);
                        try {
                          const centralSpecs = (await getCentralMotorSpecs()) || {};
                          centralSpecs[motorId] = updated;
                          await saveCentralMotorSpecs(centralSpecs);
                          if (onLogSaved) onLogSaved();
                        } catch {}
                      }}
                      style={{
                        background: '#FEE2E2',
                        border: '1px solid #EF4444',
                        color: '#991B1B',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🚨 Trigger 5,000h Overhaul Alarm
                    </button>

                    <button
                      onClick={async () => {
                        const curHours = specs.total_run_hours ?? specs.running_hours ?? 2050;
                        const updated = {
                          ...specs,
                          under_maintenance: false,
                          last_grease_hours: curHours,
                          last_overhaul_hours: curHours
                        };
                        setSpecs(updated);
                        try {
                          const centralSpecs = (await getCentralMotorSpecs()) || {};
                          centralSpecs[motorId] = updated;
                          await saveCentralMotorSpecs(centralSpecs);
                          if (onLogSaved) onLogSaved();
                        } catch {}
                      }}
                      style={{
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#047857',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Reset to Normal (Clear Alarm)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Service & Maintenance History */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  🛠️ Recorded Service & Overhaul Logs
                </h4>
                <button
                  onClick={() => setShowLogForm(!showLogForm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <PlusCircle size={14} />
                  {showLogForm ? 'Cancel' : 'Log Maintenance'}
                </button>
              </div>

              {/* Log Maintenance Form */}
              {showLogForm && (
                <div style={{
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 800, color: '#0284C7', margin: 0 }}>
                    + Record New Maintenance Event
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Service Date</label>
                      <input
                        type="date"
                        value={newLog.service_date}
                        onChange={e => setNewLog({ ...newLog, service_date: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Service Activity Type *</label>
                      <select
                        value={newLog.service_type}
                        onChange={e => setNewLog({ ...newLog, service_type: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', background: '#FFFFFF', fontWeight: 700 }}
                      >
                        <option value="Bearing Greasing">🛢️ Bearing Greasing</option>
                        <option value="Bearing Replacement">⚙️ Bearing Replacement</option>
                        <option value="Motor Rewinding">🌀 Motor Rewinding</option>
                        <option value="Impeller & Shaft Realignment">🛠️ Impeller & Shaft Realignment</option>
                        <option value="Preventive Overhaul & Insulation Test">🔍 Preventive Overhaul & Insulation Test</option>
                        <option value="Routine Inspection">📋 Routine Inspection</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Technician / Vendor *</label>
                      <input
                        type="text"
                        placeholder="e.g. SKF / WABAG Service Team"
                        value={newLog.technician}
                        onChange={e => setNewLog({ ...newLog, technician: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Operating Hours at Service</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={newLog.running_hours}
                        onChange={e => setNewLog({ ...newLog, running_hours: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Spare Part / Material Cost (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={newLog.part_cost}
                        onChange={e => setNewLog({ ...newLog, part_cost: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Labor / Service Fee (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1000"
                        value={newLog.labor_cost}
                        onChange={e => setNewLog({ ...newLog, labor_cost: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Remarks & Work Performed</label>
                    <textarea
                      rows={2}
                      placeholder="Enter details of service..."
                      value={newLog.notes}
                      onChange={e => setNewLog({ ...newLog, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                    />
                  </div>
                  <button
                    onClick={handleAddLog}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '8px 18px',
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Save & Sync to Expenditure Log
                  </button>
                </div>
              )}

              {/* Logs Timeline */}
              {serviceLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '13px' }}>
                  No service logs recorded yet. Use the button above to add a maintenance record.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {serviceLogs.map((log: any) => {
                    const totalCostVal = log.total_cost ?? ((log.part_cost || 0) + (log.labor_cost || 0));
                    return (
                      <div key={log.id} style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {log.service_type.includes('Greasing') ? '🛢️' : log.service_type.includes('Rewinding') ? '🌀' : log.service_type.includes('Bearing') ? '⚙️' : '🛠️'}
                            {log.service_type}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {totalCostVal > 0 && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #86EFAC' }}>
                                💰 Cost: ₹{totalCostVal.toLocaleString('en-IN')}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', background: '#F0F9FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                              📅 {log.service_date}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', fontWeight: 600, flexWrap: 'wrap' }}>
                          <span>👤 Technician: <strong>{log.technician}</strong></span>
                          <span>⏱️ Runtime: <strong>{log.running_hours} Hours</strong></span>
                          {log.next_due_date && <span>🔁 Next Due: <strong>{log.next_due_date}</strong></span>}
                          {log.part_cost > 0 && <span>Spares: <strong>₹{Number(log.part_cost).toLocaleString('en-IN')}</strong></span>}
                          {log.labor_cost > 0 && <span>Labor: <strong>₹{Number(log.labor_cost).toLocaleString('en-IN')}</strong></span>}
                        </div>

                        {log.notes && (
                          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                            📝 {log.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
