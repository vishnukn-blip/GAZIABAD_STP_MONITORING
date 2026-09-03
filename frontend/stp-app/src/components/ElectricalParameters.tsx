import React, { useState, useEffect } from 'react';
import {
  Zap, Activity, Gauge, Cpu, RefreshCw, AlertTriangle, Layers,
  Calculator, Settings, TrendingUp, X
} from 'lucide-react';
import { getElectricalTelemetry, getElectricalMeters, getTariffConfig, saveTariffConfig } from '../api';

interface ElectricalParametersProps {
  deviceId?: string;
  deviceName?: string;
}

export const ElectricalParameters: React.FC<ElectricalParametersProps> = ({
  deviceId = "350435032683868",
  deviceName = "VASUNDHARA SECTOR 7 , 8MLD PLANT"
}) => {
  const [telemetry, setTelemetry] = useState<any>({
    v1n: 0.0, v2n: 0.0, v3n: 0.0, v_ln: 0.0,
    v12: 0.0, v23: 0.0, v31: 0.0, v_ll: 0.0,
    i1: 0.0, i2: 0.0, i3: 0.0, i_avg: 0.0,
    kw1: 0.0, kw2: 0.0, kw3: 0.0, total_kw: 0.0,
    pf1: 0.0, pf2: 0.0, pf3: 0.0, pf_avg: 0.0,
    freq: 0.0, kwh: 0.0,
    has_data: false
  });
  const [allMetersTelemetry, setAllMetersTelemetry] = useState<{ [meterId: string]: any }>({});
  const [lastUpdated, setLastUpdated] = useState<string>('Loading...');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [selectedMeter, setSelectedMeter] = useState<string>('1');
  const [availableMeters, setAvailableMeters] = useState<string[]>(['1']);
  const [billingMode, setBillingMode] = useState<'realtime' | 'cumulative'>('realtime');

  // Tariff Configuration & Modal States
  const [tariffConfig, setTariffConfig] = useState<any>({
    tariff_rate: 7.50,
    sanctioned_load: 50.0,
    demand_charge: 275.0,
    duty_rate: 7.5
  });
  const [showTariffModal, setShowTariffModal] = useState<boolean>(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);
  const [tempTariff, setTempTariff] = useState<any>({ ...tariffConfig });
  const [isSavingTariff, setIsSavingTariff] = useState<boolean>(false);

  useEffect(() => {
    const loadTariff = async () => {
      if (!deviceId) return;
      const res = await getTariffConfig(deviceId);
      if (res) {
        setTariffConfig(res);
        setTempTariff(res);
      }
    };
    loadTariff();
  }, [deviceId]);

  const handleSaveTariff = async () => {
    setIsSavingTariff(true);
    const payload = {
      device_id: deviceId,
      tariff_rate: parseFloat(tempTariff.tariff_rate) || 7.5,
      sanctioned_load: parseFloat(tempTariff.sanctioned_load) || 50.0,
      demand_charge: parseFloat(tempTariff.demand_charge) || 275.0,
      duty_rate: parseFloat(tempTariff.duty_rate) || 7.5
    };
    await saveTariffConfig(payload);
    setTariffConfig(payload);
    setIsSavingTariff(false);
    setShowTariffModal(false);
  };

  const fetchTelemetry = async () => {
    if (!deviceId) return;
    setIsFetching(true);
    
    let activeMeter = selectedMeter;
    const metersList = await getElectricalMeters(deviceId);
    let validMeters = availableMeters;
    if (metersList && metersList.length > 0) {
      validMeters = metersList;
      setAvailableMeters(metersList);
      if (!metersList.includes(selectedMeter)) {
        activeMeter = metersList[0];
        setSelectedMeter(activeMeter);
      }
    }

    // Concurrently fetch telemetry for all available meters
    const telemetryPromises = validMeters.map(mId => getElectricalTelemetry(deviceId, mId));
    const results = await Promise.all(telemetryPromises);

    const telemetryMap: { [mId: string]: any } = {};
    results.forEach((res, index) => {
      const mId = validMeters[index];
      if (res) {
        telemetryMap[mId] = res;
      }
    });

    setAllMetersTelemetry(telemetryMap);

    const activeData = telemetryMap[activeMeter] || results.find(r => r != null) || null;
    if (activeData) {
      setTelemetry(activeData);
      const rawTimestamp = activeData.timestamp || activeData.updated_at;
      if (activeData.has_data && rawTimestamp) {
        let rawStr = rawTimestamp;
        if (!rawStr.endsWith('Z') && !rawStr.includes('+')) {
          rawStr += 'Z';
        }
        const d = new Date(rawStr);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const mins = String(d.getMinutes()).padStart(2, '0');
          const secs = String(d.getSeconds()).padStart(2, '0');
          setLastUpdated(`${year}-${month}-${day} ${hours}:${mins}:${secs}`);
        } else {
          setLastUpdated(rawTimestamp.replace('T', ' ').split('.')[0]);
        }
      } else {
        setLastUpdated('No Telemetry Received');
      }
    } else {
      setLastUpdated('No Telemetry Received');
    }
    setIsFetching(false);
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [deviceId, selectedMeter]);

  // --------------------------------------------------------------------------
  // MULTI-METER BILL ESTIMATOR ENGINE (Motor-by-Motor & Overall Plant Total)
  // --------------------------------------------------------------------------
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate()); // e.g., 3 on Sept 3rd
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); // e.g., 30 in Sept
  const monthName = now.toLocaleString('default', { month: 'short' }); // e.g., "Sep"

  const tariffRate = tariffConfig.tariff_rate || 7.50;
  const sanctionedLoad = tariffConfig.sanctioned_load || 50.0;
  const demandRate = tariffConfig.demand_charge || 275.0;
  const dutyRate = (tariffConfig.duty_rate || 7.5) / 100;

  const fixedDemandCharge = sanctionedLoad * demandRate;

  // Breakdown for every active meter/motor
  const metersBreakdown = availableMeters.map((mId) => {
    const t = allMetersTelemetry[mId] || {};
    const rawKw = Math.abs(t.total_kw || ((t.kw1 || 0) + (t.kw2 || 0) + (t.kw3 || 0)) || 0);
    const kwLoad = rawKw || (t.i_avg && t.v_ll ? (t.i_avg * t.v_ll * 1.732 * Math.abs(t.pf_avg || 0.9)) / 1000 : 0);
    const actualKwh = Math.abs(t.kwh || 0);

    // In cumulative mode, calculate daily average based on days elapsed in current month (e.g. 3 days)
    const dailyKwh = billingMode === 'cumulative'
      ? (actualKwh > 0 ? actualKwh / daysElapsed : kwLoad * 24)
      : kwLoad * 24;

    const monthlyKwh = dailyKwh * totalDaysInMonth;
    const energyCharge = monthlyKwh * tariffRate;

    const pfVal = Math.abs(t.pf_avg || 0.0);
    let pfImpact = 0;
    if (pfVal > 0 && pfVal < 0.85) {
      const drop = (0.85 - pfVal) * 100;
      pfImpact = energyCharge * (0.02 * drop);
    } else if (pfVal >= 0.95) {
      pfImpact = -(energyCharge * 0.005);
    }

    return {
      meterId: mId,
      rawKw,
      kwLoad,
      actualKwh,
      dailyKwh,
      monthlyKwh,
      energyCharge,
      pfImpact,
      pfVal,
      hasData: !!t.has_data
    };
  });

  // Overall Plant Calculation (Sum of all active motors/meters + Fixed Demand + Govt Duty)
  const totalPlantEnergyCharge = metersBreakdown.reduce((sum, item) => sum + item.energyCharge, 0);
  const totalPlantPfImpact = metersBreakdown.reduce((sum, item) => sum + item.pfImpact, 0);
  const totalPlantSubtotalBeforeTax = totalPlantEnergyCharge + fixedDemandCharge;
  const totalPlantElectricityDuty = (totalPlantSubtotalBeforeTax + totalPlantPfImpact) * dutyRate;
  const totalPlantMonthlyBill = totalPlantSubtotalBeforeTax + totalPlantPfImpact + totalPlantElectricityDuty;
  const totalPlantDailyCost = totalPlantMonthlyBill / totalDaysInMonth;
  const totalPlantDailyKwh = metersBreakdown.reduce((sum, item) => sum + item.dailyKwh, 0);

  // Selected Meter Individual Calculation
  const selectedMeterData = metersBreakdown.find(m => m.meterId === selectedMeter) || metersBreakdown[0] || {
    meterId: selectedMeter, rawKw: 0, kwLoad: 0, actualKwh: 0, dailyKwh: 0, monthlyKwh: 0, energyCharge: 0, pfImpact: 0, pfVal: 0, hasData: false
  };

  const numMeters = Math.max(availableMeters.length, 1);
  const meterShareFixedCharge = fixedDemandCharge / numMeters;
  const selectedMeterSubtotal = selectedMeterData.energyCharge + meterShareFixedCharge;
  const selectedMeterDuty = (selectedMeterSubtotal + selectedMeterData.pfImpact) * dutyRate;
  const selectedMeterMonthlyBill = selectedMeterSubtotal + selectedMeterData.pfImpact + selectedMeterDuty;
  const selectedMeterDailyCost = selectedMeterMonthlyBill / totalDaysInMonth;

  const electricalStats = {
    loadCurrent: { value: telemetry.i_avg ?? 0.0, unit: 'A', label: 'REAL-TIME PHASE CURRENT' },
    supplyVoltage: { value: telemetry.v_ll ?? 0.0, unit: 'V', label: 'PHASE-TO-PHASE RMS' },
    realPower: { value: telemetry.total_kw ?? ((telemetry.kw1 || 0) + (telemetry.kw2 || 0) + (telemetry.kw3 || 0)), unit: 'kW', label: 'ACTIVE LOAD UTILIZATION' },
    reactivePower: { value: 0.0, unit: 'kVAR', label: 'LAGGING REACTIVE DEMAND' },
    powerFactor: { value: telemetry.pf_avg ?? 0.0, label: 'SYSTEM EFFICIENCY (PF)', status: (telemetry.pf_avg > 0 && telemetry.pf_avg < 0.85 ? 'WARNING' : 'NORMAL') },
    totalEnergy: { value: telemetry.kwh ?? 0.0, unit: 'kWh', label: 'CUMULATIVE USAGE' }
  };

  const phaseTableRows = [
    {
      parameter: 'Voltage LN (Phase-to-Neutral)',
      r: `${telemetry.v1n?.toFixed(2) ?? '0.00'} V`,
      y: `${telemetry.v2n?.toFixed(2) ?? '0.00'} V`,
      b: `${telemetry.v3n?.toFixed(2) ?? '0.00'} V`,
      total: `${telemetry.v_ln?.toFixed(2) ?? '0.00'} V`
    },
    {
      parameter: 'Voltage LL (Line-to-Line)',
      r: `${telemetry.v12?.toFixed(2) ?? '0.00'} V`,
      y: `${telemetry.v23?.toFixed(2) ?? '0.00'} V`,
      b: `${telemetry.v31?.toFixed(2) ?? '0.00'} V`,
      total: `${telemetry.v_ll?.toFixed(2) ?? '0.00'} V`
    },
    {
      parameter: 'Current (Phase Currents)',
      r: `${telemetry.i1?.toFixed(4) ?? '0.0000'} A`,
      y: `${telemetry.i2?.toFixed(4) ?? '0.0000'} A`,
      b: `${telemetry.i3?.toFixed(4) ?? '0.0000'} A`,
      total: `${telemetry.i_avg?.toFixed(4) ?? '0.0000'} A`
    },
    {
      parameter: 'Active Power',
      r: `${telemetry.kw1?.toFixed(4) ?? '0.0000'} kW`,
      y: `${telemetry.kw2?.toFixed(4) ?? '0.0000'} kW`,
      b: `${telemetry.kw3?.toFixed(4) ?? '0.0000'} kW`,
      total: `${(telemetry.total_kw ?? ((telemetry.kw1 || 0) + (telemetry.kw2 || 0) + (telemetry.kw3 || 0)))?.toFixed(4)} kW`
    },
    {
      parameter: 'Power Factor',
      r: `${telemetry.pf1?.toFixed(4) ?? '0.0000'}`,
      y: `${telemetry.pf2?.toFixed(4) ?? '0.0000'}`,
      b: `${telemetry.pf3?.toFixed(4) ?? '0.0000'}`,
      total: `${telemetry.pf_avg?.toFixed(4) ?? '0.0000'}`
    },
    {
      parameter: 'Grid Frequency',
      r: `${telemetry.freq?.toFixed(3) ?? '0.000'} Hz`,
      y: `${telemetry.freq?.toFixed(3) ?? '0.000'} Hz`,
      b: `${telemetry.freq?.toFixed(3) ?? '0.000'} Hz`,
      total: `${telemetry.freq?.toFixed(3) ?? '0.000'} Hz`
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
          {/* Meter Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={16} color="#9333EA" />
            <select 
              value={selectedMeter}
              onChange={(e) => setSelectedMeter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E9D5FF',
                background: '#FDF4FF',
                fontSize: '12px',
                fontWeight: 700,
                color: '#9333EA',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {availableMeters.map(m => (
                <option key={m} value={m}>Meter ID: {m}</option>
              ))}
            </select>
          </div>

          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: isFetching ? '#FFFBEB' : '#F0FDF4',
            color: isFetching ? '#B45309' : '#166534',
            border: `1px solid ${isFetching ? '#FDE68A' : '#BBF7D0'}`,
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <RefreshCw size={14} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            Latest Data Updated: {lastUpdated}
          </span>

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
        </div>
      </div>

      {/* ⚡ MONTHLY ELECTRICITY BILL ESTIMATOR CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: '#FFFFFF',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
        border: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '10px', borderRadius: '12px', color: '#38BDF8' }}>
              <Calculator size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#F8FAFC' }}>
                MONTHLY ELECTRICITY BILL ESTIMATOR
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Real-time multi-meter cost accumulation & overall plant tariff calculations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Segmented Mode Selector Switch */}
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <button
                onClick={() => setBillingMode('realtime')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: billingMode === 'realtime' ? '#0284C7' : 'transparent',
                  color: billingMode === 'realtime' ? '#FFFFFF' : '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Zap size={13} color={billingMode === 'realtime' ? '#FFFFFF' : '#38BDF8'} />
                ⚡ Real-Time Load Projection (kW)
              </button>
              <button
                onClick={() => setBillingMode('cumulative')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: billingMode === 'cumulative' ? '#0284C7' : 'transparent',
                  color: billingMode === 'cumulative' ? '#FFFFFF' : '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Activity size={13} color={billingMode === 'cumulative' ? '#FFFFFF' : '#A855F7'} />
                📊 Cumulative Meter Reading (kWh)
              </button>
            </div>

            <button
              onClick={() => { setTempTariff({ ...tariffConfig }); setShowTariffModal(true); }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#F8FAFC',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Settings size={15} color="#38BDF8" />
              Configure Tariff Rates
            </button>
            
            <button
              onClick={() => setShowBreakdownModal(true)}
              style={{
                background: '#0284C7',
                border: 'none',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <TrendingUp size={15} />
              View Cost Breakdown
            </button>
          </div>
        </div>

        {/* 3 Main Metric Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          
          {/* 1. OVERALL PLANT PROJECTED / CUMULATIVE BILL */}
          <div style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.5px' }}>
              OVERALL PLANT {billingMode === 'cumulative' ? `CUMULATIVE BILL (${monthName} Day 1-${daysElapsed})` : 'PROJECTED BILL'}
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#38BDF8', letterSpacing: '-0.5px' }}>
                ₹{totalPlantMonthlyBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>/ month</span>
            </div>
            <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'block', marginTop: '4px' }}>
              {billingMode === 'cumulative'
                ? `Pro-rated for ${daysElapsed} days of ${monthName} (~${totalPlantDailyKwh.toFixed(1)} kWh/day avg across ${availableMeters.length} meters)`
                : `Est. ~₹${totalPlantDailyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day (${totalPlantDailyKwh.toFixed(1)} kWh/day across ${availableMeters.length} meters)`}
            </span>
          </div>

          {/* 2. SELECTED METER ESTIMATED / CUMULATIVE BILL */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#A855F7', letterSpacing: '0.5px' }}>
              METER ID: {selectedMeter} {billingMode === 'cumulative' ? `CUMULATIVE BILL (Day 1-${daysElapsed})` : 'ESTIMATED BILL'}
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#C084FC', letterSpacing: '-0.5px' }}>
                ₹{selectedMeterMonthlyBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>/ month</span>
            </div>
            <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'block', marginTop: '4px' }}>
              {billingMode === 'cumulative'
                ? `Actual ${selectedMeterData.actualKwh.toFixed(1)} kWh in ${daysElapsed} days (~${selectedMeterData.dailyKwh.toFixed(1)} kWh/day avg)`
                : `Est. ~₹${selectedMeterDailyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day (${selectedMeterData.kwLoad.toFixed(2)} kW load)`}
            </span>
          </div>

          {/* 3. TARIFF & CONTRACT DEMAND */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.5px' }}>
              TARIFF & CONTRACT DEMAND
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#FACC15' }}>
                ₹{tariffConfig.tariff_rate || 7.50}
              </span>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>/ kWh</span>
            </div>
            <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'block', marginTop: '4px' }}>
              Sanctioned: {tariffConfig.sanctioned_load || 50} kW (@ ₹{tariffConfig.demand_charge}/kW)
            </span>
          </div>

        </div>

        {/* 📊 INDIVIDUAL MOTOR / METER COST BREAKDOWN CARDS */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="#38BDF8" />
            INDIVIDUAL MOTOR / METER BILL CONTRIBUTION:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {metersBreakdown.map((m) => {
              const isSelected = m.meterId === selectedMeter;
              // Calculate individual meter total with share of fixed charge and duty
              const mShareFixed = fixedDemandCharge / numMeters;
              const mSubtotal = m.energyCharge + mShareFixed;
              const mDuty = (mSubtotal + m.pfImpact) * dutyRate;
              const mTotalBill = mSubtotal + m.pfImpact + mDuty;

              return (
                <div
                  key={m.meterId}
                  onClick={() => setSelectedMeter(m.meterId)}
                  style={{
                    background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isSelected ? '#A855F7' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#E9D5FF' : '#F8FAFC' }}>
                      Motor / Meter ID: {m.meterId}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: '10px', background: '#A855F7', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Active View
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: 900, color: isSelected ? '#C084FC' : '#38BDF8', marginTop: '2px' }}>
                    ₹{mTotalBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}> /mo</span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Load: {m.kwLoad.toFixed(2)} kW</span>
                    <span>{billingMode === 'cumulative' ? `${m.actualKwh.toFixed(1)} kWh total` : `~${m.dailyKwh.toFixed(1)} kWh/day`}</span>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* ---------------------------------------------------- */}
      {/* TARIFF CONFIGURATION MODAL DIALOG                     */}
      {/* ---------------------------------------------------- */}
      {showTariffModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#0284C7" />
                Configure Tariff & Demand
              </h3>
              <button
                onClick={() => setShowTariffModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px 0' }}>
              Set your state electricity board (e.g. UPPCL) tariff parameters to accurately calculate monthly industrial electricity costs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Unit Tariff Rate (₹ / kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempTariff.tariff_rate}
                  onChange={(e) => setTempTariff({ ...tempTariff, tariff_rate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Sanctioned / Contract Load (kW)
                </label>
                <input
                  type="number"
                  step="1"
                  value={tempTariff.sanctioned_load}
                  onChange={(e) => setTempTariff({ ...tempTariff, sanctioned_load: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Fixed Demand Charge Rate (₹ / kW / month)
                </label>
                <input
                  type="number"
                  step="5"
                  value={tempTariff.demand_charge}
                  onChange={(e) => setTempTariff({ ...tempTariff, demand_charge: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  State Electricity Duty Tax (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={tempTariff.duty_rate}
                  onChange={(e) => setTempTariff({ ...tempTariff, duty_rate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowTariffModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTariff}
                disabled={isSavingTariff}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                {isSavingTariff ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DETAILED COST BREAKDOWN MODAL                        */}
      {/* ---------------------------------------------------- */}
      {showBreakdownModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={20} color="#0284C7" />
                Itemized Bill Breakdown
              </h3>
              <button
                onClick={() => setShowBreakdownModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Total Plant Energy Cost ({availableMeters.length} Meters @ ₹{tariffRate}/kWh)</span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>₹{totalPlantEnergyCharge.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Fixed Demand Charge ({sanctionedLoad} kW @ ₹{demandRate}/kW)</span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>₹{fixedDemandCharge.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: totalPlantPfImpact < 0 ? '#166534' : totalPlantPfImpact > 0 ? '#991B1B' : '#475569' }}>
                  Total Power Factor Rebate / Penalty
                </span>
                <span style={{ fontWeight: 800, color: totalPlantPfImpact < 0 ? '#166534' : totalPlantPfImpact > 0 ? '#991B1B' : '#0F172A', fontFamily: 'monospace' }}>
                  {totalPlantPfImpact < 0 ? `-₹${Math.abs(totalPlantPfImpact).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `+₹${totalPlantPfImpact.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Govt. Electricity Duty Tax ({tariffConfig.duty_rate}%)</span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>₹{totalPlantElectricityDuty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px 0', fontSize: '16px', fontWeight: 900, color: '#0284C7' }}>
                <span>OVERALL PLANT ESTIMATED BILL</span>
                <span style={{ fontFamily: 'monospace' }}>₹{totalPlantMonthlyBill.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
