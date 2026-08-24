import React from 'react';
import {
  Zap, Activity, Gauge, Cpu, RefreshCw, AlertTriangle, Layers
} from 'lucide-react';

interface ElectricalParametersProps {
  deviceId?: string;
  deviceName?: string;
}

export const ElectricalParameters: React.FC<ElectricalParametersProps> = ({
  deviceName = "VASUNDHARA SECTOR 7 , 8MLD PLANT"
}) => {
  // Hardcoded values as requested for initial presentation (structured for future API hook binding)
  const electricalStats = {
    loadCurrent: { value: 8.7, unit: 'A', label: 'REAL-TIME PHASE CURRENT' },
    supplyVoltage: { value: 412.9, unit: 'V', label: 'PHASE-TO-PHASE RMS' },
    realPower: { value: 5.25, unit: 'kW', label: 'ACTIVE LOAD UTILIZATION' },
    reactivePower: { value: 3.35, unit: 'kVAR', label: 'LAGGING REACTIVE DEMAND' },
    powerFactor: { value: 0.840, label: 'SYSTEM EFFICIENCY (PF)', status: 'WARNING' },
    totalEnergy: { value: 1.01, unit: 'kWh', label: 'CUMULATIVE USAGE' }
  };

  const phaseTableRows = [
    {
      parameter: 'Voltage LN (Phase-to-Neutral)',
      r: '238.7 V',
      y: '238.7 V',
      b: '238.7 V',
      total: '238.7 V'
    },
    {
      parameter: 'Voltage LL (Line-to-Line)',
      r: '413.3 V',
      y: '412.3 V',
      b: '415.2 V',
      total: '413.6 V'
    },
    {
      parameter: 'Current (Phase Currents)',
      r: '8.92 A',
      y: '8.43 A',
      b: '8.89 A',
      total: '8.75 A'
    },
    {
      parameter: 'Active Power',
      r: '1.76 kW',
      y: '1.69 kW',
      b: '1.78 kW',
      total: '5.25 kW'
    },
    {
      parameter: 'Reactive Power',
      r: '1.20 kVAR',
      y: '1.10 kVAR',
      b: '1.16 kVAR',
      total: '3.46 kVAR'
    },
    {
      parameter: 'Apparent Power',
      r: '2.13 kVA',
      y: '2.01 kVA',
      b: '2.12 kVA',
      total: '6.26 kVA'
    },
    {
      parameter: 'Power Factor',
      r: '0.83',
      y: '0.84',
      b: '0.84',
      total: '0.84'
    }
  ];

  // Helper SVG mini sparkline chart renderer
  const renderSparkline = (strokeColor: string, points: string) => (
    <svg width="100%" height="45" viewBox="0 0 300 45" style={{ overflow: 'visible', marginTop: '12px' }}>
      <defs>
        <linearGradient id={`grad-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={`0,45 ${points} 300,45`} fill={`url(#grad-${strokeColor.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Bar & Control Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#FFFFFF',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={22} color="#0284C7" />
            ELECTRICAL STATS & PARAMETERS
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Real-time telemetry, 3-phase power analysis, and accumulation for {deviceName}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            background: '#F8FAFC',
            fontSize: '12px',
            fontWeight: 700,
            color: '#0F172A',
            cursor: 'pointer',
            outline: 'none'
          }}>
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>

          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: '#F0F9FF',
            color: '#0284C7',
            border: '1px solid #BAE6FD',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Cpu size={14} />
            Plant Telemetry Active
          </span>

          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: '#F0FDF4',
            color: '#166534',
            border: '1px solid #BBF7D0',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            LIVE DATA
          </span>
        </div>
      </div>

      {/* Electrical Summary Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>

        {/* 1. LOAD CURRENT */}
        <div style={{
          background: '#E0F2FE',
          borderRadius: '16px',
          border: '1px solid #BAE6FD',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1', margin: 0, letterSpacing: '0.5px' }}>
                LOAD CURRENT
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', margin: '2px 0 0 0' }}>
                {electricalStats.loadCurrent.label}
              </p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', color: '#0284C7' }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#0C4A6E', letterSpacing: '-1px' }}>
              {electricalStats.loadCurrent.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0369A1' }}>
              {electricalStats.loadCurrent.unit}
            </span>
          </div>
          {renderSparkline('#0284C7', '0,30 30,35 60,25 90,15 120,28 150,12 180,32 210,18 240,22 270,10 300,20')}
        </div>

        {/* 2. SUPPLY VOLTAGE */}
        <div style={{
          background: '#FFEDD5',
          borderRadius: '16px',
          border: '1px solid #FED7AA',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#C2410C', margin: 0, letterSpacing: '0.5px' }}>
                SUPPLY VOLTAGE
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#EA580C', margin: '2px 0 0 0' }}>
                {electricalStats.supplyVoltage.label}
              </p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', color: '#EA580C' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#7C2D12', letterSpacing: '-1px' }}>
              {electricalStats.supplyVoltage.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#C2410C' }}>
              {electricalStats.supplyVoltage.unit}
            </span>
          </div>
          {renderSparkline('#EA580C', '0,25 30,32 60,18 90,10 120,12 150,14 180,8 210,24 240,16 270,14 300,18')}
        </div>

        {/* 3. REAL POWER */}
        <div style={{
          background: '#F3E8FF',
          borderRadius: '16px',
          border: '1px solid #E9D5FF',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#6D28D9', margin: 0, letterSpacing: '0.5px' }}>
                REAL POWER
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', margin: '2px 0 0 0' }}>
                {electricalStats.realPower.label}
              </p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', color: '#7C3AED' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#4C1D95', letterSpacing: '-1px' }}>
              {electricalStats.realPower.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#6D28D9' }}>
              {electricalStats.realPower.unit}
            </span>
          </div>
          {renderSparkline('#7C3AED', '0,20 30,20 60,18 90,18 120,16 150,16 180,15 210,15 240,15 270,14 300,14')}
        </div>

        {/* 4. REACTIVE POWER */}
        <div style={{
          background: '#FCE7F3',
          borderRadius: '16px',
          border: '1px solid #FBCFE8',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(219, 39, 119, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#BE185D', margin: 0, letterSpacing: '0.5px' }}>
                REACTIVE POWER
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#DB2777', margin: '2px 0 0 0' }}>
                {electricalStats.reactivePower.label}
              </p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', color: '#DB2777' }}>
              <RefreshCw size={18} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#831843', letterSpacing: '-1px' }}>
              {electricalStats.reactivePower.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#BE185D' }}>
              {electricalStats.reactivePower.unit}
            </span>
          </div>
          {renderSparkline('#DB2777', '0,28 30,26 60,26 90,25 120,24 150,22 180,22 210,21 240,21 270,20 300,20')}
        </div>

        {/* 5. POWER FACTOR */}
        <div style={{
          background: '#FEF3C7',
          borderRadius: '16px',
          border: '1px solid #FDE68A',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#B45309', margin: 0, letterSpacing: '0.5px' }}>
                POWER FACTOR
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', margin: '2px 0 0 0' }}>
                {electricalStats.powerFactor.label}
              </p>
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              background: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FCD34D',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AlertTriangle size={12} />
              {electricalStats.powerFactor.status}
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#78350F', letterSpacing: '-1px' }}>
              {electricalStats.powerFactor.value.toFixed(3)}
            </span>
          </div>
          
          {/* Efficiency Gauge Progress Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '100%', height: '8px', background: '#FDE68A', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${electricalStats.powerFactor.value * 100}%`, height: '100%', background: '#D97706', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#B45309', marginTop: '4px', fontWeight: 700 }}>
              <span>0.0 (Poor)</span>
              <span>1.0 (Optimal)</span>
            </div>
          </div>
        </div>

        {/* 6. TOTAL ENERGY */}
        <div style={{
          background: '#D1FAE5',
          borderRadius: '16px',
          border: '1px solid #A7F3D0',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#047857', margin: 0, letterSpacing: '0.5px' }}>
                TOTAL ENERGY
              </h4>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#059669', margin: '2px 0 0 0' }}>
                {electricalStats.totalEnergy.label}
              </p>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '10px', color: '#059669' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#064E3B', letterSpacing: '-1px' }}>
              {electricalStats.totalEnergy.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#047857' }}>
              {electricalStats.totalEnergy.unit}
            </span>
          </div>
          {renderSparkline('#059669', '0,35 30,32 60,28 90,26 120,22 150,18 180,14 210,12 240,8 270,6 300,4')}
        </div>

      </div>

      {/* 3-PHASE PARAMETER ANALYZER Table Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F1F5F9'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#0284C7" />
              3-PHASE PARAMETER ANALYZER
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              COMPREHENSIVE REAL-TIME TELEMETRY BREAKDOWN
            </p>
          </div>

          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#EA580C',
            background: '#FFF7ED',
            border: '1px solid #FFEDD5',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            ● SYSTEM FREQUENCY: 50 Hz
          </span>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569', borderRadius: '8px 0 0 8px' }}>PARAMETER</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>PHASE 1 (R)</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>PHASE 2 (Y)</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>PHASE 3 (B)</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, color: '#0284C7', borderRadius: '0 8px 8px 0' }}>TOTAL / AVERAGE</th>
              </tr>
            </thead>
            <tbody>
              {phaseTableRows.map((row, index) => (
                <tr
                  key={row.parameter}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    background: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    transition: 'background 0.2s'
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1E293B' }}>{row.parameter}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{row.r}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{row.y}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{row.b}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#0284C7', background: '#F0F9FF' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
