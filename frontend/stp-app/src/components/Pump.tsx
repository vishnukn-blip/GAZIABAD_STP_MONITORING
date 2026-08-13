import React from 'react';

export interface PumpProps {
  x?: number;
  y?: number;
  status?: 'ON' | 'OFF';
  tripped?: boolean;
  name?: string;
}

export const Pump: React.FC<PumpProps> = ({
  x = 0, y = 0, status = 'OFF', tripped = false, name = 'Motor'
}) => {
  const isOn = status === 'ON';
  const mainColor = tripped ? '#EF4444' : isOn ? '#10B981' : '#64748B';
  const darkColor = tripped ? '#991B1B' : isOn ? '#047857' : '#334155';
  const glowColor = tripped ? 'rgba(239,68,68,0.4)' : isOn ? 'rgba(16,185,129,0.4)' : 'transparent';

  return (
    <g transform={`translate(${x}, ${y})`} className="scada-pump-group select-none">
      {/* Base Mounting Plate */}
      <rect x={-55} y={40} width={110} height={14} rx={4} fill="#334155" stroke="#1E293B" strokeWidth={2} />
      <rect x={-48} y={54} width={12} height={6} fill="#0F172A" />
      <rect x={36} y={54} width={12} height={6} fill="#0F172A" />
      {/* Vibration Pads */}
      <rect x={-46} y={35} width={14} height={6} fill="#64748B" />
      <rect x={32} y={35} width={14} height={6} fill="#64748B" />

      {/* MOTOR HOUSING */}
      <g transform="translate(12, -10)">
        <rect x={0} y={-25} width={42} height={50} rx={6}
          fill={mainColor} stroke={darkColor} strokeWidth={2}
          style={{ transition: 'all 0.5s ease', filter: (isOn || tripped) ? `drop-shadow(0 0 10px ${glowColor})` : 'none' }} />
        {[-16, -8, 0, 8, 16].map((fy, i) => (
          <line key={i} x1={5} y1={fy} x2={37} y2={fy} stroke={darkColor} strokeWidth={1.5} opacity={0.6} />
        ))}
        {/* Junction Box */}
        <rect x={10} y={-33} width={20} height={9} rx={2} fill="#1E293B" stroke="#475569" strokeWidth={1} />
        <circle cx={20} cy={-28.5} r={2} fill={tripped ? '#EF4444' : isOn ? '#10B981' : '#EF4444'} />
        {/* Fan Guard */}
        <rect x={42} y={-22} width={14} height={44} rx={4} fill="#1E293B" stroke="#475569" strokeWidth={1} />
        <g transform="translate(49, 0)">
          <circle cx={0} cy={0} r={16} fill="rgba(15,23,42,0.5)" />
          <g className={isOn && !tripped ? 'animate-motor-fan' : ''} style={{ transformOrigin: '0px 0px', transformBox: 'fill-box' }}>
            <path d="M -12 0 Q 0 -8 12 0 Q 0 8 -12 0 Z" fill="#94A3B8" />
            <path d="M 0 -12 Q 8 0 0 12 Q -8 0 0 -12 Z" fill="#CBD5E1" />
            <circle cx={0} cy={0} r={4} fill="#0F172A" />
          </g>
        </g>
      </g>

      {/* PUMP VOLUTE */}
      <g transform="translate(-22, -10)">
        <circle cx={0} cy={0} r={30} fill={mainColor} stroke={darkColor} strokeWidth={3} style={{ transition: 'all 0.5s ease' }} />
        <circle cx={0} cy={0} r={15} fill={darkColor} />
        <circle cx={0} cy={0} r={6} fill="#E2E8F0" />
        <g className={isOn && !tripped ? 'animate-motor-fan' : ''} style={{ transformOrigin: '0px 0px', transformBox: 'fill-box' }}>
          <path d="M -12 0 L 12 0 M 0 -12 L 0 12" stroke={mainColor} strokeWidth={3} />
        </g>
        {/* Suction Inlet */}
        <rect x={-40} y={-10} width={12} height={20} fill={mainColor} stroke={darkColor} strokeWidth={2} />
        <rect x={-44} y={-14} width={6} height={28} fill="#334155" rx={1} />
        {/* Discharge Outlet Top */}
        <rect x={-10} y={-40} width={20} height={12} fill={mainColor} stroke={darkColor} strokeWidth={2} />
        <rect x={-14} y={-44} width={28} height={6} fill="#334155" rx={1} />
        {/* Pressure gauge */}
        <line x1={6} y1={-30} x2={6} y2={-46} stroke="#64748B" strokeWidth={2} />
        <circle cx={6} cy={-51} r={8} fill="#FFFFFF" stroke="#334155" strokeWidth={1.5} />
        <path d="M 6 -51 L 10 -54" stroke={tripped ? '#EF4444' : '#10B981'} strokeWidth={1.5} strokeLinecap="round" />
      </g>

      {/* Shaft Coupling */}
      <rect x={-8} y={-18} width={22} height={16} fill="#475569" rx={2} stroke="#1E293B" />
      <line x1={3} y1={-18} x2={3} y2={-2} stroke="#CBD5E1" strokeWidth={2} />

      {/* Status Badge */}
      <rect x={-42} y={50} width={84} height={20} rx={10}
        fill={tripped ? '#DC2626' : isOn ? '#059669' : '#475569'} stroke="#FFFFFF" strokeWidth={1.5} />
      <text x={0} y={64} fontFamily="Inter, sans-serif" fontSize="9" fontWeight="800" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.05em">
        {tripped ? '⚠ TRIP' : `● ${status}`}
      </text>

      {/* Equipment Tag */}
      <text x={0} y={-68} fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#94A3B8" textAnchor="middle">{name}</text>
    </g>
  );
};

export default Pump;
