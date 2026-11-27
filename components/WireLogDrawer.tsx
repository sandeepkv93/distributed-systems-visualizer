'use client';

import { useCallback, useState } from 'react';
import { Terminal, Copy, Download, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { InvariantCheck } from '@/lib/invariants';
import {
  WireTraceFrame,
  summarizeWireFrames,
  formatTraceMarkdown,
  formatTraceJson,
} from '@/lib/trace-export';
import { showToast } from '@/lib/toast';
import { useDismissibleHudPopover } from '@/hooks/useDismissiblePopover';

interface WireLogDrawerProps {
  protocol: string;
  scenario: string;
  frames: readonly WireTraceFrame[];
  invariants?: readonly InvariantCheck[];
  className?: string;
}

export default function WireLogDrawer({
  protocol,
  scenario,
  frames,
  invariants = [],
  className = 'top-3.5 right-[114px]',
}: WireLogDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = useCallback(() => setExpanded(false), []);
  const containerRef = useDismissibleHudPopover('wire-log', expanded, close);
  const summary = summarizeWireFrames(frames);

  const handleCopyMarkdown = async () => {
    const md = formatTraceMarkdown({
      protocol,
      scenario,
      invariants,
      frames,
    });
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      showToast('Markdown wire trace copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Unable to copy trace in this browser context.', 'error');
    }
  };

  const handleDownloadJson = () => {
    const json = formatTraceJson({
      protocol,
      scenario,
      invariants,
      frames,
    });
    const slug = protocol.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-wire-trace.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON wire trace downloaded.', 'success');
  };

  const recentFrames = frames.slice(-14).reverse();

  return (
    <div
      ref={containerRef}
      className={`absolute ${className} z-20 flex flex-col items-end max-w-[calc(100%-1.5rem)]`}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 bg-[#141816]/94 border border-[#F4F0E8]/22 hover:border-[#F4F0E8]/45 text-[#F4F0E8] font-mono text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.1em] backdrop-blur-sm shadow-md transition-colors cursor-pointer"
        aria-expanded={expanded}
        aria-label="Toggle live wire transcript recorder"
      >
        <Terminal className="w-3 h-3 text-[#60A5FA] flex-shrink-0" />
        <span className="hidden sm:inline">Wire Log</span>
        <span className="px-1 bg-[#F4F0E8]/12 text-[#F4F0E8] tabular-nums">{summary.total}</span>
        {summary.dropped > 0 && (
          <span className="px-1 bg-[#D9441E] text-[#FAF7F1] tabular-nums">
            ✕{summary.dropped}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3 h-3 opacity-75 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-75 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div
          className="mt-1.5 w-[290px] sm:w-[350px] max-w-[calc(100vw-2rem)] max-h-[55vh] overflow-y-auto bg-[#141816]/96 border border-[#F4F0E8]/22 shadow-[0_12px_32px_rgba(0,0,0,0.55)] text-[#F4F0E8] font-mono"
          role="region"
          aria-label="Live Wire Transcript"
        >
          <div className="px-3 py-2 border-b border-[#F4F0E8]/12 flex items-center justify-between gap-2">
            <span className="text-[9.5px] uppercase tracking-[0.12em] text-[#9E9B90]">
              {summary.delivered} OK · {summary.inFlight} FLIGHT · {summary.dropped} DROP
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1F2422] hover:bg-[#D9441E] border border-[#F4F0E8]/18 text-[9.5px] uppercase tracking-wider text-[#F4F0E8] transition-colors cursor-pointer"
                title="Copy Markdown transcript"
              >
                {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                <span>MD</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1F2422] hover:bg-[#1D4B8F] border border-[#F4F0E8]/18 text-[9.5px] uppercase tracking-wider text-[#F4F0E8] transition-colors cursor-pointer"
                title="Download JSON transcript"
              >
                <Download className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#F4F0E8]/8 p-2 space-y-1">
            {recentFrames.length === 0 ? (
              <div className="py-5 text-center text-[10px] text-[#9E9B90]">
                Step or play a scenario to record wire frames.
              </div>
            ) : (
              recentFrames.map((frame, i) => {
                const seq = frames.length - i;
                const isDropped =
                  frame.status === 'dropped' ||
                  frame.status === 'lost' ||
                  frame.status === 'failure';
                const isFlight = frame.status === 'in-flight';
                return (
                  <div
                    key={`${frame.id}-${seq}`}
                    className="pt-1 first:pt-0 text-[10px] flex items-center justify-between gap-2"
                  >
                    <div className="truncate text-[#E5E2D9]">
                      <span className="text-[#9E9B90] mr-1.5 tabular-nums">
                        T{String(seq).padStart(2, '0')}
                      </span>
                      <span>
                        {frame.from} → {frame.to}
                      </span>{' '}
                      <span className="text-[#60A5FA]">{frame.type}</span>
                    </div>
                    <span
                      className={`px-1 py-0.25 text-[8.5px] uppercase flex-shrink-0 ${
                        isDropped
                          ? 'bg-[#D9441E] text-[#FAF7F1]'
                          : isFlight
                          ? 'bg-[#A8640B] text-[#FAF7F1]'
                          : 'bg-[#0F6B50] text-[#FAF7F1]'
                      }`}
                    >
                      {isDropped ? 'DROP' : isFlight ? 'WIRE' : 'OK'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
