'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { InvariantCheck, summarizeInvariants } from '@/lib/invariants';

interface InvariantMonitorProps {
  checks: readonly InvariantCheck[];
  protocolLabel?: string;
}

export default function InvariantMonitor({
  checks,
  protocolLabel = 'Formal Properties',
}: InvariantMonitorProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = summarizeInvariants(checks);

  const pillClasses =
    summary.overall === 'violated'
      ? 'bg-[#2D1410]/95 border-[#D9441E] text-[#FAF7F1]'
      : summary.overall === 'degraded'
      ? 'bg-[#29200F]/95 border-[#FBBF24]/70 text-[#FEF3C7]'
      : 'bg-[#141816]/94 border-[#34D399]/40 text-[#E6F7EF]';

  const statusText =
    summary.overall === 'violated'
      ? 'VIOLATED'
      : summary.overall === 'degraded'
      ? 'DEGRADED'
      : 'HOLDING';

  return (
    <div className="absolute top-3.5 left-4 z-20 flex flex-col items-start">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 border font-mono text-[10px] uppercase tracking-[0.1em] backdrop-blur-sm shadow-md transition-colors cursor-pointer ${pillClasses}`}
        aria-expanded={expanded}
        aria-label="Toggle formal invariant monitor"
      >
        {summary.overall === 'violated' ? (
          <ShieldAlert className="w-3.5 h-3.5 text-[#F87171]" />
        ) : summary.overall === 'degraded' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
        )}
        <span className="font-semibold">
          Invariants {summary.holdingCount}/{summary.totalCount} · {statusText}
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 opacity-75" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-75" />
        )}
      </button>

      {expanded && (
        <div
          className="mt-1.5 w-[290px] sm:w-[320px] bg-[#141816]/96 border border-[#F4F0E8]/22 shadow-[0_12px_32px_rgba(0,0,0,0.55)] p-3 text-[#F4F0E8] font-mono"
          role="region"
          aria-label={`${protocolLabel} live invariant checks`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4F0E8]/12 text-[9.5px] uppercase tracking-[0.12em] text-[#9E9B90]">
            <span>{protocolLabel}</span>
            <span className="tabular-nums">
              {summary.holdingCount}/{summary.totalCount} OK
            </span>
          </div>

          <div className="space-y-2">
            {checks.map((check) => {
              const badgeColor =
                check.status === 'violated'
                  ? 'bg-[#D9441E] text-[#FAF7F1]'
                  : check.status === 'degraded'
                  ? 'bg-[#A8640B] text-[#FAF7F1]'
                  : 'bg-[#0F6B50] text-[#FAF7F1]';
              return (
                <div
                  key={check.id}
                  className="p-2 bg-[#1A1F1D] border border-[#F4F0E8]/10 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-[#F4F0E8] truncate">
                      {check.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.25 text-[8.5px] uppercase tracking-wider font-semibold flex-shrink-0 ${badgeColor}`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-[#60A5FA]">{check.formula}</div>
                  <div className="text-[10px] font-sans text-[#C8C3B8] leading-snug">
                    {check.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
