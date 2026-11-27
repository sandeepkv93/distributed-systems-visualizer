'use client';

import { useCallback, useState } from 'react';
import { Flame, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  DROP_RATE_OPTIONS,
  DELAY_MULTIPLIER_OPTIONS,
  isChaosActive,
} from '@/lib/chaos';
import { useDismissibleHudPopover } from '@/hooks/useDismissiblePopover';

interface ChaosStripProps {
  config: ChaosConfig;
  droppedCount: number;
  onChange: (next: ChaosConfig) => void;
  onResetDropped: () => void;
}

export default function ChaosStrip({
  config,
  droppedCount,
  onChange,
  onResetDropped,
}: ChaosStripProps) {
  const [expanded, setExpanded] = useState(false);
  const close = useCallback(() => setExpanded(false), []);
  const containerRef = useDismissibleHudPopover('chaos', expanded, close);
  const active = isChaosActive(config);

  const handleReset = () => {
    onChange(DEFAULT_CHAOS_CONFIG);
    onResetDropped();
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[calc(100%-1.5rem)]"
    >
      {expanded && (
        <div
          className="mb-2 w-[300px] sm:w-[340px] max-w-[calc(100vw-2rem)] bg-[#161918]/96 border border-[#F4F0E8]/25 shadow-[0_12px_32px_rgba(0,0,0,0.55)] p-3.5 text-[#F4F0E8] font-mono"
          role="region"
          aria-label="Network Chaos Controls"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#F4F0E8]/12">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#FB923C] font-semibold">
              Network Fault Injection
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#C8C3B8] hover:text-[#F4F0E8] cursor-pointer"
              title="Reset chaos to deterministic defaults"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Packet Loss Selector */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#9E9B90] mb-1.5">
              <span>Packet Loss</span>
              <span className={config.dropRate > 0 ? 'text-[#F87171] font-semibold' : 'text-[#C8C3B8]'}>
                {config.dropRate}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {DROP_RATE_OPTIONS.map((rate) => {
                const selected = config.dropRate === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onChange({ ...config, dropRate: rate })}
                    className={`py-1 text-[11px] tabular-nums border transition-colors cursor-pointer ${
                      selected
                        ? rate > 0
                          ? 'bg-[#D9441E] text-[#FAF7F1] border-[#D9441E] font-semibold'
                          : 'bg-[#F4F0E8] text-[#161614] border-[#F4F0E8] font-semibold'
                        : 'bg-[#1F2422] text-[#C8C3B8] border-[#F4F0E8]/15 hover:border-[#F4F0E8]/45'
                    }`}
                  >
                    {rate}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wire Delay Multiplier Selector */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#9E9B90] mb-1.5">
              <span>Wire Delay Multiplier</span>
              <span
                className={
                  config.delayMultiplier > 1 ? 'text-[#FBBF24] font-semibold' : 'text-[#C8C3B8]'
                }
              >
                {config.delayMultiplier}×
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {DELAY_MULTIPLIER_OPTIONS.map((mult) => {
                const selected = config.delayMultiplier === mult;
                return (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => onChange({ ...config, delayMultiplier: mult })}
                    className={`py-1 text-[11px] tabular-nums border transition-colors cursor-pointer ${
                      selected
                        ? mult > 1
                          ? 'bg-[#A8640B] text-[#FAF7F1] border-[#FBBF24] font-semibold'
                          : 'bg-[#F4F0E8] text-[#161614] border-[#F4F0E8] font-semibold'
                        : 'bg-[#1F2422] text-[#C8C3B8] border-[#F4F0E8]/15 hover:border-[#F4F0E8]/45'
                    }`}
                  >
                    {mult}×
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#F4F0E8]/12 text-[10px]">
            <span className="text-[#9E9B90]">0% · 1× keeps scenarios deterministic</span>
            <span className="tabular-nums text-[#F87171] font-semibold">
              DROPPED {droppedCount}
            </span>
          </div>
        </div>
      )}

      {/* Compact Hardware Toggle Pill */}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 border font-mono text-[10px] uppercase tracking-[0.1em] transition-colors cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${
          active
            ? 'bg-[#2B1510]/95 border-[#D9441E] text-[#FAF7F1]'
            : 'bg-[#161918]/92 border-[#F4F0E8]/20 text-[#C8C3B8] hover:border-[#F4F0E8]/45 hover:text-[#F4F0E8]'
        }`}
        aria-expanded={expanded}
        aria-label="Toggle network chaos controls"
      >
        <Flame className={`w-3 h-3 ${active ? 'text-[#F97316]' : 'text-[#9E9B90]'}`} />
        <span>
          {active
            ? `Chaos: ${config.dropRate}% DROP · ${config.delayMultiplier}× DELAY`
            : 'Chaos: OFF'}
        </span>
        {droppedCount > 0 && (
          <span className="px-1.5 py-0.2 bg-[#D9441E] text-[#FAF7F1] tabular-nums">
            ✕{droppedCount}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="w-3 h-3 opacity-75" />
        ) : (
          <ChevronUp className="w-3 h-3 opacity-75" />
        )}
      </button>
    </div>
  );
}
