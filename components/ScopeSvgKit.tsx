'use client';

import { motion } from 'framer-motion';

export const SCOPE_COLORS = {
  bg: '#111413',
  nodeFill: '#171C1A',
  nodeFillLeader: '#261712',
  nodeFillFailed: '#1B1A19',
  signal: '#D9441E',
  signalBright: '#F97316',
  emerald: '#34D399',
  cobalt: '#60A5FA',
  amber: '#FBBF24',
  danger: '#F87171',
  inkLight: '#F4F0E8',
  inkMuted: '#9E9B90',
  hairline: 'rgba(244, 240, 232, 0.14)',
  hairlineSubtle: 'rgba(244, 240, 232, 0.07)',
} as const;

/**
 * Shared SVG <defs> for oscilloscope canvases: crisp directional arrowheads
 * and diagonal danger hatch pattern for partitions / faults.
 */
export function ScopeDefs({ idPrefix = 'scope' }: { idPrefix?: string }) {
  const markers: Array<{ id: string; color: string }> = [
    { id: 'signal', color: SCOPE_COLORS.signal },
    { id: 'emerald', color: SCOPE_COLORS.emerald },
    { id: 'cobalt', color: SCOPE_COLORS.cobalt },
    { id: 'amber', color: SCOPE_COLORS.amber },
    { id: 'danger', color: SCOPE_COLORS.danger },
    { id: 'muted', color: SCOPE_COLORS.inkMuted },
  ];

  return (
    <defs>
      {markers.map((m) => (
        <marker
          key={m.id}
          id={`${idPrefix}-arrow-${m.id}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill={m.color} />
        </marker>
      ))}
      <pattern
        id={`${idPrefix}-hatch`}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(217, 68, 30, 0.2)" strokeWidth="1.5" />
      </pattern>
    </defs>
  );
}

interface ScopeNodeProps {
  x: number;
  y: number;
  radius?: number;
  label: string;
  sublabel?: string;
  topTag?: string;
  bottomLine1?: string;
  bottomLine2?: string;
  accentColor: string;
  fillColor?: string;
  failed?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  haloColor?: string;
  onClick?: () => void;
}

/**
 * Precision double-ring oscilloscope hardware node with crisp monospace telemetry.
 */
export function ScopeNode({
  x,
  y,
  radius = 38,
  label,
  sublabel,
  topTag,
  bottomLine1,
  bottomLine2,
  accentColor,
  fillColor,
  failed = false,
  highlighted = false,
  selected = false,
  haloColor,
  onClick,
}: ScopeNodeProps) {
  const coreFill =
    fillColor ??
    (failed
      ? SCOPE_COLORS.nodeFillFailed
      : highlighted
      ? SCOPE_COLORS.nodeFillLeader
      : SCOPE_COLORS.nodeFill);

  return (
    <g
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : undefined}
      role={onClick ? 'button' : undefined}
    >
      {/* Partition or selection outer dashed halo */}
      {(haloColor || selected || highlighted) && (
        <circle
          cx={x}
          cy={y}
          r={radius + (selected ? 9 : 7)}
          fill="none"
          stroke={selected ? SCOPE_COLORS.inkLight : haloColor ?? accentColor}
          strokeWidth={selected ? 1.6 : 1.1}
          strokeDasharray={selected ? undefined : '4 3'}
          opacity={selected ? 0.9 : 0.7}
        />
      )}

      {/* Subtle calibration ring */}
      <circle
        cx={x}
        cy={y}
        r={radius + 2.5}
        fill="none"
        stroke={accentColor}
        strokeWidth="0.75"
        opacity={failed ? 0.25 : 0.35}
      />

      {/* Core node body */}
      <motion.circle
        cx={x}
        cy={y}
        r={radius}
        fill={coreFill}
        stroke={failed ? SCOPE_COLORS.danger : accentColor}
        strokeWidth={highlighted || selected ? 2.4 : 1.8}
        whileHover={onClick ? { scale: 1.06 } : undefined}
        transition={{ duration: 0.16 }}
      />

      {/* Crashed node diagonal crosshairs */}
      {failed && (
        <path
          d={`M${x - radius * 0.42} ${y - radius * 0.42} L${x + radius * 0.42} ${y + radius * 0.42} M${x + radius * 0.42} ${y - radius * 0.42} L${x - radius * 0.42} ${y + radius * 0.42}`}
          stroke={SCOPE_COLORS.danger}
          strokeWidth="1.5"
          opacity="0.45"
          className="pointer-events-none"
        />
      )}

      {/* Top role/state tag */}
      {topTag && (
        <g className="pointer-events-none">
          <text
            x={x}
            y={y - radius - 12}
            textAnchor="middle"
            fill={failed ? SCOPE_COLORS.danger : accentColor}
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.1em"
            fontFamily="var(--font-mono), monospace"
          >
            {topTag}
          </text>
        </g>
      )}

      {/* Center ID label */}
      <text
        x={x}
        y={sublabel ? y - 4 : y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={failed ? '#8F8B80' : SCOPE_COLORS.inkLight}
        fontSize={radius >= 38 ? '13' : '11.5'}
        fontWeight="600"
        fontFamily="var(--font-mono), monospace"
        className="pointer-events-none"
      >
        {label}
      </text>

      {/* Optional inner sublabel */}
      {sublabel && (
        <text
          x={x}
          y={y + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={failed ? SCOPE_COLORS.danger : SCOPE_COLORS.inkMuted}
          fontSize="9.5"
          fontFamily="var(--font-mono), monospace"
          className="pointer-events-none"
        >
          {sublabel}
        </text>
      )}

      {/* Bottom telemetry lines */}
      {bottomLine1 && (
        <text
          x={x}
          y={y + radius + 16}
          textAnchor="middle"
          fill={SCOPE_COLORS.inkLight}
          fontSize="10"
          fontFamily="var(--font-mono), monospace"
          opacity="0.88"
          className="pointer-events-none"
        >
          {bottomLine1}
        </text>
      )}
      {bottomLine2 && (
        <text
          x={x}
          y={y + radius + 30}
          textAnchor="middle"
          fill={SCOPE_COLORS.inkMuted}
          fontSize="9.5"
          fontFamily="var(--font-mono), monospace"
          className="pointer-events-none"
        >
          {bottomLine2}
        </text>
      )}
    </g>
  );
}

interface ScopeEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  markerKey?: 'signal' | 'emerald' | 'cobalt' | 'amber' | 'danger' | 'muted';
  idPrefix?: string;
  inset?: number;
  label?: string;
  dashed?: boolean;
}

/**
 * Directional wire message with animated signal pulse traveling from source to target.
 */
export function ScopeEdge({
  x1,
  y1,
  x2,
  y2,
  color,
  markerKey = 'cobalt',
  idPrefix = 'scope',
  inset = 42,
  label,
  dashed = false,
}: ScopeEdgeProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const sx = x1 + ux * Math.min(inset, len * 0.3);
  const sy = y1 + uy * Math.min(inset, len * 0.3);
  const ex = x2 - ux * Math.min(inset + 4, len * 0.32);
  const ey = y2 - uy * Math.min(inset + 4, len * 0.32);

  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  return (
    <g className="pointer-events-none">
      <motion.line
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth="1.75"
        strokeDasharray={dashed ? '5 4' : undefined}
        markerEnd={`url(#${idPrefix}-arrow-${markerKey})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.85 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.circle
        r="3.6"
        fill={color}
        initial={{ cx: sx, cy: sy, opacity: 1 }}
        animate={{ cx: ex, cy: ey, opacity: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {label && (
        <g>
          <rect
            x={midX - label.length * 3.2 - 5}
            y={midY - 9}
            width={label.length * 6.4 + 10}
            height="16"
            rx="1.5"
            fill="#111413"
            stroke={color}
            strokeWidth="0.9"
            opacity="0.95"
          />
          <text
            x={midX}
            y={midY + 2}
            textAnchor="middle"
            fill={color}
            fontSize="8.5"
            fontFamily="var(--font-mono), monospace"
            fontWeight="600"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
