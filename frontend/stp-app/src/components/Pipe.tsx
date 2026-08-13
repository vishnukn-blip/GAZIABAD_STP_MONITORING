import React from 'react';

export interface PipeProps {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  path?: string;
  flowing?: boolean;
  reverse?: boolean;
  strokeWidth?: number;
  label?: string;
  labelPos?: { x: number; y: number };
}

export const Pipe: React.FC<PipeProps> = ({
  x1, y1, x2, y2, path,
  flowing = false, reverse = false,
  strokeWidth = 24, label, labelPos = { x: 0, y: 0 }
}) => {
  const innerWidth = strokeWidth - 8;

  return (
    <g className="scada-pipe-group">
      {path ? (
        <path d={path} fill="none" stroke="url(#metallicPipeGrad)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#metallicPipeGrad)" strokeWidth={strokeWidth} strokeLinecap="round" />
      )}

      {path ? (
        <path d={path} fill="none" stroke={flowing ? "#0369A1" : "#475569"} strokeWidth={innerWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.5s ease' }} />
      ) : (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={flowing ? "#0369A1" : "#475569"} strokeWidth={innerWidth} strokeLinecap="round" style={{ transition: 'stroke 0.5s ease' }} />
      )}

      {flowing && (
        <>
          {path ? (
            <path d={path} fill="none" stroke="#38BDF8" strokeWidth={innerWidth - 4} strokeLinecap="round" strokeLinejoin="round" className={reverse ? "animate-pipe-flow-reverse" : "animate-pipe-flow"} />
          ) : (
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38BDF8" strokeWidth={innerWidth - 4} strokeLinecap="round" className={reverse ? "animate-pipe-flow-reverse" : "animate-pipe-flow"} />
          )}
          {path ? (
            <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" className="animate-flow-arrow" opacity={0.85} />
          ) : (
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" className="animate-flow-arrow" opacity={0.85} />
          )}
        </>
      )}

      {!path && x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined && (
        <>
          <rect x={x1 - 4} y={y1 - strokeWidth / 2 - 2} width={8} height={strokeWidth + 4} fill="#475569" rx={2} />
          <rect x={x2 - 4} y={y2 - strokeWidth / 2 - 2} width={8} height={strokeWidth + 4} fill="#475569" rx={2} />
        </>
      )}

      {label && (
        <text x={labelPos.x} y={labelPos.y} fill={flowing ? "#0284C7" : "#64748B"} style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          {label}
        </text>
      )}
    </g>
  );
};

export default Pipe;
