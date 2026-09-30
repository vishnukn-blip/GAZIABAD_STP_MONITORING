import React, { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { getWaterQualityTelemetry } from '../api';

interface WaterQualityData {
  plant_id: string;
  plant_name: string;
  system_time: string;
  last_data_at: string;
  version: string;
  bod_mg_l: number;
  cod_mg_l: number;
  tds_mg_l: number;
  turbidity_ntu: number;
  conductivity_us_cm: number;
  ph_level: number;
  inlet_flow_rate?: number;
  outlet_flow_rate?: number;
  orp_mv?: number;
  total_inlet_flow?: number;
  total_outlet_flow?: number;
  tss_mg_l?: number;
  chlorine_mg_l?: number;
  status_bod: string;
  status_cod: string;
  status_tds: string;
  status_turbidity: string;
  status_conductivity: string;
  status_ph: string;
  status_tss?: string;
  history?: any[];
}

export const WaterQualityDashboard: React.FC = () => {
  const [systemTime, setSystemTime] = useState<string>(new Date().toLocaleTimeString('en-GB'));
  const [data, setData] = useState<WaterQualityData>({
    plant_id: "98203928",
    plant_name: "Plant #98203928",
    system_time: new Date().toLocaleTimeString('en-GB'),
    last_data_at: new Date().toLocaleTimeString('en-GB'),
    version: "WQ_V1.0_NIMBLEVISION_23062026",
    bod_mg_l: 28.0,
    cod_mg_l: 47.0,
    tds_mg_l: 739.0,
    turbidity_ntu: 42.0,
    conductivity_us_cm: 1559.0,
    ph_level: 7.5,
    inlet_flow_rate: 0.0,
    outlet_flow_rate: 0.0,
    orp_mv: 247.0,
    total_inlet_flow: 0.0,
    total_outlet_flow: 0.0,
    tss_mg_l: 56.0,
    chlorine_mg_l: 0.0,
    status_bod: "NORMAL",
    status_cod: "NORMAL",
    status_tds: "NORMAL",
    status_turbidity: "CRITICAL",
    status_conductivity: "NORMAL",
    status_ph: "NORMAL",
    status_tss: "CRITICAL"
  });

  const [timeFilter, setTimeFilter] = useState('Last 24 hours');
  const [paramFilter, setParamFilter] = useState('All Parameters');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString('en-GB'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWQ = async () => {
    setLoading(true);
    try {
      const directResp = await fetch('/local-api/api/water_quality/telemetry');
      if (directResp.ok) {
        const directJson = await directResp.json();
        if (directJson) {
          const p = directJson.data || directJson;
          setData(prev => ({
            ...prev,
            ...p,
            bod_mg_l: p.bod_mg_l ?? p.bod ?? prev.bod_mg_l,
            cod_mg_l: p.cod_mg_l ?? p.cod ?? prev.cod_mg_l,
            tds_mg_l: p.tds_mg_l ?? p.tds ?? prev.tds_mg_l,
            turbidity_ntu: p.turbidity_ntu ?? p.turbidity ?? prev.turbidity_ntu,
            conductivity_us_cm: p.conductivity_us_cm ?? p.conductivity ?? prev.conductivity_us_cm,
            ph_level: p.ph_level ?? p.ph ?? prev.ph_level,
            last_data_at: directJson.timestamp || p.last_data_at || p.timestamp || prev.last_data_at
          }));
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Direct fetch from local DB backend error:', e);
    }

    try {
      const res = await getWaterQualityTelemetry();
      if (res) {
        setData(res);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    fetchWQ();
    const interval = setInterval(fetchWQ, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderSparkline = (baseVal: number, color: string, id: string) => {
    const points = [
      baseVal - 1.2, baseVal + 0.8, baseVal - 0.5, baseVal + 1.1,
      baseVal - 0.8, baseVal + 0.5, baseVal + 1.4, baseVal - 0.2,
      baseVal + 0.9, baseVal, baseVal - 1.0, baseVal
    ];
    const min = Math.min(...points) - 1;
    const max = Math.max(...points) + 1;

    const svgPoints = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * 360;
      const y = 60 - ((val - min) / (max - min)) * 45;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,60 ${svgPoints} 360,60`;

    return (
      <svg viewBox="0 0 360 60" style={{ width: '100%', height: '65px', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${id})`} />
        <polyline points={svgPoints} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderGaugeArc = (val: number, maxVal: number, color: string, label: string) => {
    const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
    const dashoffset = 180 - (180 * pct) / 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90px' }}>
        <svg viewBox="0 0 100 55" style={{ width: '140px', height: '75px' }}>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="180"
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
          <text x="50" y="44" textAnchor="middle" fontSize="16" fontWeight="900" fill="#0F172A">{val}</text>
          <text x="50" y="54" textAnchor="middle" fontSize="6" fontWeight="700" fill="#64748B" letterSpacing="0.5">{label}</text>
        </svg>
      </div>
    );
  };

  return (
    <div style={{ background: '#F8FAFC', padding: '24px 32px', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ─── TOP CONTROL BAR ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            NIMBLE VISION STP MONITORING DASHBOARD
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: '4px 0 2px 0', letterSpacing: '-0.5px' }}>
            OVERVIEW
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            Real-time telemetry and operation analysis
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>

          <select
            value={paramFilter}
            onChange={e => setParamFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option>All Parameters</option>
            <option>Critical Only</option>
            <option>Normal Only</option>
          </select>

          <span style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🏢 Plant #{data.plant_id}
          </span>

          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>SYSTEM TIME: <span style={{ color: '#0F172A' }}>{systemTime}</span></div>
            <div>DATA AT: <span style={{ color: '#059669' }}>{data.last_data_at}</span></div>
          </div>

          <button
            onClick={fetchWQ}
            disabled={loading}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={16} color="#475569" className={loading ? 'spin' : ''} />
          </button>

          <span style={{
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Sub Header Metadata Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
        <span>VERSION: {data.version}</span>
        <span>LAST DATA: {new Date().getDate()} {new Date().toLocaleString('default', { month: 'short' }).toUpperCase()} {data.last_data_at}</span>
      </div>

      {/* ─── 6 PARAMETER CARDS GRID ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

        {/* CARD 1: BOD */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #10B981',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>BOD (BIOCHEMICAL OXYGEN DEMAND)</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', background: '#ECFDF5', padding: '2px 10px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.bod_mg_l}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-30 mg/L</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.bod_mg_l, '#10B981', 'bod')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 2: COD */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #8B5CF6',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>COD (CHEMICAL OXYGEN DEMAND)</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#6D28D9', background: '#F5F3FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.cod_mg_l}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-250 mg/L</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.cod_mg_l, '#8B5CF6', 'cod')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 3: TDS */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #3B82F6',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>TDS (TOTAL DISSOLVED SOLIDS)</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.tds_mg_l}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-2100 mg/L</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.tds_mg_l, 3000, '#3B82F6', 'MG/L')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>SCALE 0-3000</span>
          </div>
        </div>

        {/* CARD 4: TURBIDITY */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #EF4444',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>TURBIDITY</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#B91C1C', background: '#FEF2F2', padding: '2px 10px', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
                CRITICAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#DC2626' }}>{data.turbidity_ntu}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>NTU</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#DC2626' }}>0-10 NTU</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.turbidity_ntu, 100, '#EF4444', 'NTU')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span style={{ color: '#DC2626' }}>SCALE 0-100</span>
          </div>
        </div>

        {/* CARD 5: CONDUCTIVITY */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #F59E0B',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>CONDUCTIVITY</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', background: '#FFFBEB', padding: '2px 10px', borderRadius: '12px', border: '1px solid #FDE68A' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.conductivity_us_cm}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>µS/cm</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-3000 µS/cm</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.conductivity_us_cm, '#F59E0B', 'cond')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 6: PH */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #2563EB',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>PH</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.ph_level}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>6.5-8.5</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.ph_level, 14, '#2563EB', 'pH')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>SCALE 0-14</span>
          </div>
        </div>

        {/* CARD 7: INLET FLOW RATE */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #0EA5E9',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>INLET FLOW RATE</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', background: '#F0F9FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.inlet_flow_rate ?? 0}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>m³/h</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-50 m³/h</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.inlet_flow_rate ?? 0, '#0EA5E9', 'inlet_flow')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 8: OUTLET FLOW RATE */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #6366F1',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>OUTLET FLOW RATE</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4338CA', background: '#EEF2FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.outlet_flow_rate ?? 0}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>m³/h</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-50 m³/h</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.outlet_flow_rate ?? 0, '#6366F1', 'outlet_flow')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 9: ORP */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #EC4899',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>ORP</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#BE185D', background: '#FDF2F8', padding: '2px 10px', borderRadius: '12px', border: '1px solid #FBCFE8' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.orp_mv ?? 247}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>mV</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>200-600 mV</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.orp_mv ?? 247, 1000, '#EC4899', 'mV')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>SCALE 0-1000</span>
          </div>
        </div>

        {/* CARD 10: TOTAL INLET FLOW */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #14B8A6',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>TOTAL INLET FLOW</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', background: '#F0FDFA', padding: '2px 10px', borderRadius: '12px', border: '1px solid #99F6E4' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.total_inlet_flow ?? 0}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>m³</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-999999 m³</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.total_inlet_flow ?? 0, '#14B8A6', 'total_inlet')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 11: TOTAL OUTLET FLOW */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #4F46E5',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>TOTAL OUTLET FLOW</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#3730A3', background: '#EEF2FF', padding: '2px 10px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.total_outlet_flow ?? 0}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>m³</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-999999 m³</strong>
              </div>
            </div>
          </div>
          <div>{renderSparkline(data.total_outlet_flow ?? 0, '#4F46E5', 'total_outlet')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>24H TREND</span>
          </div>
        </div>

        {/* CARD 12: TSS */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #EF4444',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>TSS</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#B91C1C', background: '#FEF2F2', padding: '2px 10px', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
                CRITICAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#DC2626' }}>{data.tss_mg_l ?? 56}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#DC2626' }}>0-20 mg/L</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.tss_mg_l ?? 56, 100, '#EF4444', 'MG/L')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span style={{ color: '#DC2626' }}>SCALE 0-100</span>
          </div>
        </div>

        {/* CARD 13: CHLORINE */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          borderTop: '4px solid #10B981',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                PARAMETER: <strong style={{ color: '#0F172A' }}>CHLORINE</strong>
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', background: '#ECFDF5', padding: '2px 10px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                NORMAL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0F172A' }}>{data.chlorine_mg_l ?? 0}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>mg/L</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                SAFE RANGE<br />
                <strong style={{ color: '#0F172A' }}>0-20 mg/L</strong>
              </div>
            </div>
          </div>
          <div>{renderGaugeArc(data.chlorine_mg_l ?? 0, 20, '#10B981', 'MG/L')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.last_data_at}</span>
            <span>SCALE 0-20</span>
          </div>
        </div>

      </div>
    </div>
  );
};
