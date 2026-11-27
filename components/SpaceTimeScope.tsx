'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, GitCommitHorizontal, X } from 'lucide-react';
import {
  SpaceTimeActor,
  SpaceTimeFrame,
  computeSpaceTimeLayout,
} from '@/lib/spacetime';
import { SCOPE_COLORS } from './ScopeSvgKit';

export type ScopeMode = 'topology' | 'spacetime';

interface ScopeModeToggleProps {
  mode: ScopeMode;
  onChange: (mode: ScopeMode) => void;
  frameCount: number;
}

/**
 * Hardware-styled Topology <-> Space-Time wire trace toggle pill.
 */
export function ScopeModeToggle({ mode, onChange, frameCount }: ScopeModeToggleProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        onChange(mode === 'topology' ? 'spacetime' : 'topology');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onChange]);

  return (
    <div
      className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 inline-flex border border-[rgba(244,240,232,0.24)] bg-[#141816]/95 backdrop-blur-sm shadow-md font-mono text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.1em]"
      role="group"
      aria-label="Oscilloscope view mode"
    >
      <button
        type="button"
        aria-pressed={mode === 'topology'}
        title="Topology View (S)"
        onClick={() => onChange('topology')}
        className={`px-2 sm:px-2.5 py-1.5 inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
          mode === 'topology'
            ? 'bg-[#F4F0E8] text-[#161614] font-semibold'
            : 'text-[#9E9B90] hover:text-[#F4F0E8]'
        }`}
      >
        <GitCommitHorizontal className="w-3 h-3 flex-shrink-0" />
        <span className="hidden sm:inline">Topology</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === 'spacetime'}
        title="Space-Time Wire Trace (S)"
        onClick={() => onChange('spacetime')}
        className={`px-2 sm:px-2.5 py-1.5 inline-flex items-center gap-1.5 border-l border-[rgba(244,240,232,0.18)] transition-colors cursor-pointer ${
          mode === 'spacetime'
            ? 'bg-[#D9441E] text-[#FAF7F1] font-semibold'
            : 'text-[#9E9B90] hover:text-[#F4F0E8]'
        }`}
      >
        <Activity className="w-3 h-3 flex-shrink-0" />
        <span>
          <span className="hidden sm:inline">Space-Time</span>
          <span className="sm:hidden">Trace</span>
        </span>
        <span
          className={`px-1 py-0.25 text-[9px] tabular-nums ${
            mode === 'spacetime'
              ? 'bg-[#161614]/30 text-[#FAF7F1]'
              : 'bg-[rgba(244,240,232,0.1)] text-[#F4F0E8]'
          }`}
        >
          {frameCount}
        </span>
      </button>
    </div>
  );
}

interface SpaceTimeScopeProps {
  svgRef?: React.RefObject<SVGSVGElement | null>;
  title: string;
  actors: SpaceTimeActor[];
  frames: SpaceTimeFrame[];
  idPrefix?: string;
}

/**
 * Interactive Lamport Space-Time (sequence) diagram rendered on the recessed obsidian oscilloscope.
 */
export default function SpaceTimeScope({
  svgRef,
  title,
  actors,
  frames,
  idPrefix = 'st',
}: SpaceTimeScopeProps) {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  const layout = useMemo(
    () => computeSpaceTimeLayout(actors, frames, { width: 880, maxFrames: 16 }),
    [actors, frames]
  );

  const selectedArrow = useMemo(
    () => layout.arrows.find((a) => a.frame.id === selectedFrameId) ?? null,
    [layout.arrows, selectedFrameId]
  );

  const uniqueColors = useMemo(() => {
    const set = new Set<string>([
      SCOPE_COLORS.signal,
      SCOPE_COLORS.cobalt,
      SCOPE_COLORS.emerald,
      SCOPE_COLORS.amber,
      SCOPE_COLORS.danger,
      SCOPE_COLORS.inkMuted,
    ]);
    layout.arrows.forEach((a) => set.add(a.frame.color));
    return Array.from(set);
  }, [layout.arrows]);

  const markerIdForColor = (color: string) =>
    `${idPrefix}-arr-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="w-full h-full relative flex flex-col">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        role="img"
        aria-label={`${title} space-time wire trace`}
      >
        <defs>
          {uniqueColors.map((color) => (
            <marker
              key={color}
              id={markerIdForColor(color)}
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Scope Banner Telemetry */}
        <text
          x="24"
          y="28"
          fill={SCOPE_COLORS.inkMuted}
          fontSize="9.5"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="0.14em"
        >
          WIRE TRACE · {title.toUpperCase()} · {layout.totalFrames} FRAMES
          {layout.truncatedCount > 0 ? ` (SHOWING LATEST ${layout.arrows.length})` : ''}
        </text>

        {/* Horizontal time-axis calibration grid */}
        {layout.arrows.map((arrow) => (
          <g key={`row-${arrow.frame.id}-${arrow.seq}`}>
            <line
              x1="64"
              y1={arrow.y1}
              x2={layout.width - 28}
              y2={arrow.y1}
              stroke="rgba(244, 240, 232, 0.04)"
              strokeWidth="1"
            />
            <text
              x="24"
              y={arrow.y1 + 3}
              fill={SCOPE_COLORS.inkMuted}
              fontSize="9"
              fontFamily="var(--font-mono), monospace"
            >
              T{String(arrow.seq).padStart(2, '0')}
            </text>
          </g>
        ))}

        {/* Vertical node lifelines */}
        {layout.lifelines.map(({ actor, x }) => (
          <g key={actor.id}>
            <line
              x1={x}
              y1={layout.lifelineStartY}
              x2={x}
              y2={layout.lifelineEndY}
              stroke={actor.failed ? 'rgba(248, 113, 113, 0.35)' : 'rgba(244, 240, 232, 0.16)'}
              strokeWidth="1.2"
              strokeDasharray={actor.failed ? '3 5' : '4 4'}
            />

            {/* Top actor badge */}
            <rect
              x={x - 42}
              y={layout.headerY - 16}
              width="84"
              height="38"
              rx="2"
              fill={actor.failed ? SCOPE_COLORS.nodeFillFailed : SCOPE_COLORS.nodeFill}
              stroke={actor.failed ? SCOPE_COLORS.danger : actor.color}
              strokeWidth="1.5"
            />
            <text
              x={x}
              y={layout.headerY - 1}
              textAnchor="middle"
              fill={actor.failed ? SCOPE_COLORS.danger : SCOPE_COLORS.inkLight}
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-mono), monospace"
            >
              {actor.label}
            </text>
            {actor.sublabel && (
              <text
                x={x}
                y={layout.headerY + 13}
                textAnchor="middle"
                fill={SCOPE_COLORS.inkMuted}
                fontSize="8.5"
                fontFamily="var(--font-mono), monospace"
              >
                {actor.sublabel}
              </text>
            )}
          </g>
        ))}

        {/* Empty state prompt */}
        {layout.arrows.length === 0 && (
          <g>
            <rect
              x={layout.width / 2 - 210}
              y="225"
              width="420"
              height="64"
              rx="2"
              fill="#151917"
              stroke="rgba(244, 240, 232, 0.2)"
              strokeWidth="1"
            />
            <text
              x={layout.width / 2}
              y="252"
              textAnchor="middle"
              fill={SCOPE_COLORS.inkLight}
              fontSize="12"
              fontFamily="var(--font-mono), monospace"
              fontWeight="600"
            >
              NO WIRE FRAMES CAPTURED YET
            </text>
            <text
              x={layout.width / 2}
              y="272"
              textAnchor="middle"
              fill={SCOPE_COLORS.inkMuted}
              fontSize="10"
              fontFamily="var(--font-mono), monospace"
            >
              Select a scenario or trigger an action to trace RPCs across lifelines
            </text>
          </g>
        )}

        {/* Slanted Lamport Space-Time RPC arrows */}
        {layout.arrows.map((arrow) => {
          const isSelected = selectedFrameId === arrow.frame.id;
          const isInFlight = arrow.frame.status === 'in-flight';
          const stroke = arrow.dropped ? SCOPE_COLORS.danger : arrow.frame.color;
          const labelText = arrow.frame.label.slice(0, 14);
          const pillW = Math.max(46, labelText.length * 6.2 + 12);

          return (
            <g
              key={`${arrow.frame.id}-${arrow.seq}`}
              onClick={() =>
                setSelectedFrameId((prev) => (prev === arrow.frame.id ? null : arrow.frame.id))
              }
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${arrow.frame.label} from ${arrow.frame.from} to ${arrow.frame.to}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedFrameId((prev) =>
                    prev === arrow.frame.id ? null : arrow.frame.id
                  );
                }
              }}
            >
              {/* Sender departure dot */}
              <circle cx={arrow.x1} cy={arrow.y1} r={isSelected ? 4.5 : 3} fill={stroke} />

              {/* Slanted wire trajectory */}
              <line
                x1={arrow.x1}
                y1={arrow.y1}
                x2={arrow.x2}
                y2={arrow.y2}
                stroke={stroke}
                strokeWidth={isSelected ? 2.5 : isInFlight ? 2 : 1.5}
                strokeDasharray={arrow.dropped || arrow.frame.dashed ? '5 4' : undefined}
                opacity={isSelected || isInFlight ? 1 : 0.78}
                markerEnd={arrow.dropped ? undefined : `url(#${markerIdForColor(stroke)})`}
              />

              {/* Dropped packet X marker */}
              {arrow.dropped && (
                <path
                  d={`M${arrow.x2 - 5} ${arrow.y2 - 5} L${arrow.x2 + 5} ${arrow.y2 + 5} M${arrow.x2 + 5} ${arrow.y2 - 5} L${arrow.x2 - 5} ${arrow.y2 + 5}`}
                  stroke={SCOPE_COLORS.danger}
                  strokeWidth="2"
                />
              )}

              {/* Compact RPC pill label */}
              <rect
                x={arrow.midX - pillW / 2}
                y={arrow.midY - 8.5}
                width={pillW}
                height="15"
                rx="1.5"
                fill={isSelected ? stroke : '#111413'}
                stroke={stroke}
                strokeWidth={isSelected ? 1.4 : 0.9}
              />
              <text
                x={arrow.midX}
                y={arrow.midY + 2}
                textAnchor="middle"
                fill={isSelected ? '#111413' : stroke}
                fontSize="8.5"
                fontWeight="600"
                fontFamily="var(--font-mono), monospace"
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected Packet Frame Inspector Strip */}
      {selectedArrow && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(92%,520px)] bg-[#151917]/95 backdrop-blur-md border border-[rgba(244,240,232,0.28)] px-3.5 py-2.5 font-mono text-xs text-[#F4F0E8] shadow-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#9E9B90]">
              <span>Frame T{String(selectedArrow.seq).padStart(2, '0')}</span>
              <span>·</span>
              <span
                className={
                  selectedArrow.dropped
                    ? 'text-[#F87171]'
                    : selectedArrow.frame.status === 'in-flight'
                    ? 'text-[#FBBF24]'
                    : 'text-[#34D399]'
                }
              >
                {selectedArrow.frame.status.toUpperCase()}
              </span>
            </div>
            <div className="mt-0.5 truncate">
              <span className="font-semibold text-[#F4F0E8]">{selectedArrow.frame.label}</span>
              <span className="text-[#9E9B90]">
                {' '}
                · {selectedArrow.frame.from} → {selectedArrow.frame.to}
              </span>
              {selectedArrow.frame.sublabel && (
                <span className="text-[#60A5FA]"> · {selectedArrow.frame.sublabel}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFrameId(null)}
            className="text-[#9E9B90] hover:text-[#F4F0E8] cursor-pointer flex-shrink-0"
            aria-label="Close frame inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
