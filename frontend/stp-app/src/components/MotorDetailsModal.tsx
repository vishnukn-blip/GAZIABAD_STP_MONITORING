import React, { useState, useEffect } from 'react';
import { X, Activity, Wrench, ShieldAlert, Clock, CheckCircle2, AlertTriangle, PlusCircle, Cpu } from 'lucide-react';
import { getCentralMotorSpecs, getCentralServiceLogs, saveCentralServiceLogs } from '../api';

interface MotorDetailsModalProps {
  motor: any;
  tankName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MotorDetailsModal: React.FC<MotorDetailsModalProps> = ({ motor, tankName, isOpen, onClose }) => {
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
    service_type: 'Preventive Maintenance',
    technician: 'WABAG Service Team',
    running_hours: '1240',
    notes: 'Checked bearing lubrication and alignment.',
    next_due_date: '2026-11-15'
  });
  const [showLogForm, setShowLogForm] = useState(false);

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
          // Default hardcoded service logs for demonstration
          setServiceLogs([
            {
              id: '1',
              service_date: '2026-08-15',
              service_type: 'Bearing Lubrication & Seal Inspection',
              technician: 'WABAG Service Team',
              running_hours: '1240',
              notes: 'Inspected mechanical seal, lubricated DE/NDE bearings. No vibration detected.',
              next_due_date: '2026-11-15'
            },
            {
              id: '2',
              service_date: '2026-05-10',
              service_type: 'Routine Overhaul & Insulation Check',
              technician: 'Siemens Authorized Service',
              running_hours: '850',
              notes: 'Megger insulation test passed (100 M-Ohm). Terminal box connections tightened.',
              next_due_date: '2026-08-10'
            }
          ]);
        }
      } catch {}
    };

    loadData();
  }, [isOpen, motorId]);

  const handleAddLog = async () => {
    if (!newLog.service_type || !newLog.technician) return;

    const logEntry = {
      id: Date.now().toString(),
      ...newLog
    };

    const updated = [logEntry, ...serviceLogs];
    setServiceLogs(updated);

    try {
      const logsMap = (await getCentralServiceLogs()) || {};
      logsMap[motorId] = updated;
      await saveCentralServiceLogs(logsMap);
    } catch {}

    setShowLogForm(false);
    setNewLog({
      service_date: new Date().toISOString().split('T')[0],
      service_type: 'Preventive Maintenance',
      technician: 'WABAG Service Team',
      running_hours: '1500',
      notes: '',
      next_due_date: ''
    });
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {motor?.name || motor?.motor_name || 'Motor Details'}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: isTripped ? '#FEE2E2' : isRunning ? '#D1FAE5' : '#F1F5F9',
                  color: isTripped ? '#991B1B' : isRunning ? '#065F46' : '#475569',
                  border: `1px solid ${isTripped ? '#FCA5A5' : isRunning ? '#A7F3D0' : '#CBD5E1'}`
                }}>
                  {isTripped ? 'TRIPPED' : isRunning ? 'RUNNING (ON)' : 'STOPPED (OFF)'}
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
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{specs.max_continuous_hours} Hours</div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Service Interval</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>Every {specs.recommended_service_hours} Hours</div>
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
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Service Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Bearing Replacement"
                        value={newLog.service_type}
                        onChange={e => setNewLog({ ...newLog, service_type: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Technician / Vendor</label>
                      <input
                        type="text"
                        placeholder="e.g. WABAG Maintenance"
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
                    Save Record
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
                  {serviceLogs.map((log: any) => (
                    <div key={log.id} style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          {log.service_type}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', background: '#F0F9FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                          📅 {log.service_date}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        <span>👤 Technician: <strong>{log.technician}</strong></span>
                        <span>⏱️ Runtime: <strong>{log.running_hours} Hours</strong></span>
                        {log.next_due_date && <span>🔁 Next Due: <strong>{log.next_due_date}</strong></span>}
                      </div>

                      {log.notes && (
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0, background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                          📝 {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
