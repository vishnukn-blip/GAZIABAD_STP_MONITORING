import React from 'react';

export interface TankProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  capacity?: number;
  currentVolume?: number;
  levelPercent?: number;
  name?: string;
  variant?: 'main' | 'underground';
  showInletStream?: boolean;
}

export const Tank: React.FC<TankProps> = ({
  x = 0, y = 0, width = 150, height = 190,
  capacity = 10000, currentVolume = 0,
  levelPercent = 0, name = 'Tank',
  variant = 'main', showInletStream = false
}) => {
  const clampLevel = Math.max(0, Math.min(100, levelPercent));
  const maxWaterHeight = height - 40;
  const waterHeight = (maxWaterHeight * clampLevel) / 100;
  const sanitizeId = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');

  const levelColor = clampLevel > 70 ? '#10B981' : clampLevel > 30 ? '#F59E0B' : '#EF4444';

  return (
    <g transform={`translate(${x}, ${y})`} className="scada-tank-group select-none">
      {variant === 'main' && (
        <>
          {/* Support Legs */}
          <rect x={-width / 2 + 10} y={height - 20} width={12} height={28} fill="#334155" rx={2} />
          <rect x={width / 2 - 22} y={height - 20} width={12} height={28} fill="#334155" rx={2} />
          <rect x={-7} y={height - 20} width={14} height={28} fill="#1E293B" rx={2} />
          <line x1={-width / 2 + 10} y1={height - 5} x2={width / 2 - 10} y2={height + 5} stroke="#475569" strokeWidth={2} />
          <line x1={-width / 2 + 10} y1={height + 5} x2={width / 2 - 10} y2={height - 5} stroke="#475569" strokeWidth={2} />
          {/* Concrete Base */}
          <rect x={-width / 2 - 14} y={height + 8} width={width + 28} height={12} fill="#64748B" rx={3} />

          {/* Shell */}
          <rect x={-width / 2} y={20} width={width} height={height - 40} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth={3} />
          {/* Dome Top */}
          <path d={`M ${-width / 2} 20 Q 0 -14 ${width / 2} 20 Z`} fill="#E2E8F0" stroke="#CBD5E1" strokeWidth={3} />
          {/* Bottom Dish */}
          <path d={`M ${-width / 2} ${height - 20} Q 0 ${height + 4} ${width / 2} ${height - 20} Z`} fill="#CBD5E1" stroke="#CBD5E1" strokeWidth={3} />

          {/* Level Sensor */}
          <rect x={-10} y={-16} width={20} height={10} fill="#0F172A" rx={2} />
          <line x1={0} y1={-6} x2={0} y2={20} stroke="#38BDF8" strokeWidth={2} strokeDasharray="3 3" />
          <circle cx={0} cy={-20} r={3} fill="#10B981" className="animate-pulse" />

          {/* Ladder */}
          <g transform={`translate(${-width / 2 - 13}, 14)`}>
            <line x1={0} y1={0} x2={0} y2={height - 18} stroke="#475569" strokeWidth={2} />
            <line x1={8} y1={0} x2={8} y2={height - 18} stroke="#475569" strokeWidth={2} />
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={0} y1={i * 20} x2={8} y2={i * 20} stroke="#475569" strokeWidth={2} />
            ))}
          </g>

          {/* Inlet Pipe on Roof */}
          <rect x={-9} y={0} width={18} height={20} fill="#334155" stroke="#1E293B" strokeWidth={1.5} rx={1} />

          {/* Water Fill */}
          <defs>
            <clipPath id={`tankClip-${sanitizeId(name)}`}>
              <rect x={-width / 2 + 2} y={20} width={width - 4} height={height - 40} />
            </clipPath>
            <linearGradient id={`waterGrad-${sanitizeId(name)}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          <g clipPath={`url(#tankClip-${sanitizeId(name)})`}>
            <rect
              x={-width / 2 + 2}
              y={20 + (height - 40) - waterHeight}
              width={width - 4}
              height={waterHeight}
              fill={`url(#waterGrad-${sanitizeId(name)})`}
              style={{ transition: 'y 0.8s ease, height 0.8s ease' }}
            />
            {showInletStream && waterHeight < maxWaterHeight && (
              <rect x={-5} y={20} width={10} height={Math.max(0, maxWaterHeight - waterHeight)}
                fill="#38BDF8" opacity={0.7} />
            )}
          </g>

          {/* Glass highlight */}
          <rect x={-width / 2 + 9} y={22} width={16} height={height - 44} fill="#FFFFFF" opacity={0.2} />

          {/* Sight Glass Gauge */}
          <g transform={`translate(${width / 2 + 6}, 20)`}>
            <rect x={0} y={0} width={10} height={height - 40} rx={4} fill="#0F172A" stroke="#475569" strokeWidth={1} />
            <rect x={2} y={(height - 40) - waterHeight} width={6} height={waterHeight}
              fill={levelColor} rx={2} style={{ transition: 'y 0.8s ease, height 0.8s ease' }} />
            {[0, 25, 50, 75, 100].map(mark => {
              const tickY = (height - 40) - ((height - 40) * mark) / 100;
              return (
                <g key={mark} transform={`translate(12, ${tickY})`}>
                  <line x1={-2} y1={0} x2={6} y2={0} stroke="#64748B" strokeWidth={1.5} />
                  <text x={9} y={3} fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="700" fill="#64748B">{mark}%</text>
                </g>
              );
            })}
          </g>

          {/* Digital Readout */}
          <g transform={`translate(0, ${height / 2 - 10})`}>
            <rect x={-52} y={-22} width={104} height={44} rx={8}
              fill="rgba(15,23,42,0.88)" stroke={levelColor} strokeWidth={1.5} />
            <text x={0} y={-4} fontFamily="JetBrains Mono, monospace" fontSize="15" fontWeight="800"
              fill={levelColor} textAnchor="middle">{clampLevel.toFixed(0)}%</text>
            <text x={0} y={12} fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600"
              fill="#CBD5E1" textAnchor="middle">
              {currentVolume.toLocaleString()} / {capacity.toLocaleString()} L
            </text>
          </g>

          {/* Tank Label */}
          <text x={0} y={-28} fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill="#1E293B" textAnchor="middle">{name}</text>
        </>
      )}

      {variant === 'underground' && (
        <>
          <defs>
            <linearGradient id={`sumpGrad-${sanitizeId(name)}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          {/* Ground Line */}
          <line x1={-width / 2 - 28} y1={0} x2={width / 2 + 28} y2={0} stroke="#78350F" strokeWidth={4} />
          <text x={-width / 2 - 24} y={-5} fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#78350F">GROUND LEVEL</text>

          {/* Sump Box */}
          <rect x={-width / 2} y={10} width={width} height={height - 30} fill="#334155" stroke="#1E293B" strokeWidth={4} rx={4} />

          {/* Water Fill */}
          <rect
            x={-width / 2 + 4}
            y={10 + (height - 38) - (waterHeight * 0.85)}
            width={width - 8}
            height={waterHeight * 0.85}
            fill={`url(#sumpGrad-${sanitizeId(name)})`}
            style={{ transition: 'y 0.8s ease, height 0.8s ease' }}
          />

          {/* Float Switch */}
          <line x1={width / 4} y1={0} x2={width / 4} y2={90} stroke="#F59E0B" strokeWidth={2} />
          <circle cx={width / 4} cy={90} r={7} fill="#F59E0B" />

          {/* Level Readout */}
          <rect x={-44} y={height / 2 - 5} width={88} height={28} rx={4} fill="rgba(15,23,42,0.92)" stroke="#10B981" strokeWidth={1} />
          <text x={0} y={height / 2 + 12} fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#10B981" textAnchor="middle">
            SUMP: {clampLevel.toFixed(0)}%
          </text>

          {/* Label */}
          <text x={0} y={height + 6} fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#94A3B8" textAnchor="middle">{name}</text>
        </>
      )}
    </g>
  );
};

export default Tank;
