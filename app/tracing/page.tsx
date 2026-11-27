'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitBranch,
  Sliders,
} from 'lucide-react';
import {
  TRACE_PRESETS,
  TracePresetId,
  analyzeTrace,
  evaluateSamplingEconomics,
} from '@/lib/tracing-lab';

export default function TracingLabPage() {
  const [presetId, setPresetId] = useState<TracePresetId>('checkout-fanout');
  const [clockSkewMs, setClockSkewMs] = useState(0);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // Sampling economics sliders
  const [totalRps, setTotalRps] = useState(20000);
  const [headSamplePct, setHeadSamplePct] = useState(5);
  const [errorRatePct, setErrorRatePct] = useState(0.5);
  const [tailBufferSec, setTailBufferSec] = useState(15);

  const analysis = useMemo(
    () => analyzeTrace(presetId, clockSkewMs),
    [presetId, clockSkewMs]
  );

  const sampling = useMemo(
    () =>
      evaluateSamplingEconomics({
        totalRps,
        errorRatePct,
        slowTailRatePct: 1,
        headSamplePct,
        tailBufferSec,
      }),
    [totalRps, errorRatePct, headSamplePct, tailBufferSec]
  );

  const inspectedSpan =
    analysis.spans.find((s) => s.spanId === selectedSpanId) ?? analysis.bottleneckSpan;

  // Waterfall horizontal scale
  const minMs = Math.min(0, ...analysis.spans.map((s) => s.reportedStartMs));
  const maxMs = Math.max(analysis.totalDurationMs, ...analysis.spans.map((s) => s.reportedEndMs));
  const spanRange = Math.max(1, maxMs - minMs);
  const toX = (ms: number) => 205 + ((ms - minMs) / spanRange) * 485;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME IV · OBSERVABILITY · DISTRIBUTED TRACING · W3C TRACEPARENT &amp; TAIL SAMPLING</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/clocks" className="text-[var(--cobalt)] hover:underline">
              HLC &amp; Clock Skew →
            </Link>
            <Link href="/queueing" className="text-[var(--signal)] hover:underline">
              Fan-Out Tail Lab →
            </Link>
            <Link href="/resilience" className="text-[var(--emerald)] hover:underline">
              Mesh Resilience →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Distributed Tracing &amp; Tail Sampling Lab
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Inspect <strong className="text-[var(--ink)]">OpenTelemetry / Dapper</strong> span
              waterfalls, isolate the latency critical path, inject host{' '}
              <strong className="text-[var(--signal)]">NTP clock-skew span inversions</strong>,
              decode W3C <span className="font-mono">traceparent</span> headers, and model{' '}
              <strong className="text-[var(--ink)]">Head vs. Tail Sampling</strong> economics.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Total RTT
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {analysis.totalDurationMs} ms
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Critical Spans
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--emerald)]">
                {analysis.criticalPathIds.length} / {analysis.spans.length}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Clock Skew
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  analysis.clockSkewInversionDetected ? 'text-[var(--signal)]' : 'text-[var(--emerald)]'
                }`}
              >
                {analysis.clockSkewInversionDetected ? 'INVERTED' : 'CLEAN'}
              </div>
            </div>
          </div>
        </header>

        {/* Trace Preset & Clock Skew Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7 flex flex-wrap gap-2">
              {TRACE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPresetId(p.id);
                    setSelectedSpanId(null);
                  }}
                  className={`px-3 py-2 border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    presetId === p.id
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="lg:col-span-5">
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--signal)]" />
                  Child Host NTP Clock Skew
                </span>
                <span className="font-semibold">
                  {clockSkewMs >= 0 ? `+${clockSkewMs}` : clockSkewMs} ms
                </span>
              </div>
              <input
                type="range"
                aria-label="Child Host NTP Clock Skew (ms)"
                min={-90}
                max={90}
                step={5}
                value={clockSkewMs}
                onChange={(e) => setClockSkewMs(Number(e.target.value))}
                className="w-full accent-[#D9441E]"
              />
            </div>
          </div>
        </section>

        {/* Waterfall SVG + W3C Traceparent Inspector */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
              <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                <GitBranch className="w-3.5 h-3.5 text-[#60A5FA]" />
                OPENTELEMETRY SPAN WATERFALL (CLICK ANY SPAN TO INSPECT)
              </span>
              <span className="flex items-center gap-3">
                <span className="text-[#34D399]">■ Critical Path</span>
                <span className="text-[#60A5FA]">■ Parallel Shadowed</span>
                <span className="text-[#D9441E]">■ Error / Skewed</span>
              </span>
            </div>

            <svg viewBox="0 0 720 265" className="w-full h-auto">
              {/* Time ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const ms = Math.round(minMs + frac * spanRange);
                const x = toX(ms);
                return (
                  <g key={frac}>
                    <line x1={x} y1={24} x2={x} y2={245} stroke="#1F2422" />
                    <text x={x} y={16} textAnchor="middle" fill="#9A968E" fontSize="8.5" fontFamily="monospace">
                      {ms}ms
                    </text>
                  </g>
                );
              })}

              {analysis.spans.map((span, idx) => {
                const y = 36 + idx * 30;
                const x1 = toX(span.reportedStartMs);
                const x2 = toX(span.reportedEndMs);
                const barW = Math.max(8, x2 - x1);
                const isSelected = inspectedSpan.spanId === span.spanId;
                const fill =
                  span.status === 'error' || span.clockInverted
                    ? '#D9441E'
                    : span.onCriticalPath
                    ? '#34D399'
                    : '#60A5FA';

                return (
                  <g
                    key={span.spanId}
                    className="cursor-pointer"
                    onClick={() => setSelectedSpanId(span.spanId)}
                  >
                    {isSelected && (
                      <rect x="4" y={y - 10} width="712" height="24" fill="#1D2321" />
                    )}
                    <text
                      x={12 + span.depth * 12}
                      y={y + 5}
                      fill={isSelected ? '#FBBF24' : '#D6D2C7'}
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {span.service}
                    </text>
                    <rect
                      x={x1}
                      y={y - 6}
                      width={barW}
                      height="16"
                      fill={fill}
                      fillOpacity={isSelected ? 0.95 : 0.78}
                      stroke={isSelected ? '#F4F0E8' : fill}
                      strokeWidth={isSelected ? '1.6' : '1'}
                    />
                    <text
                      x={Math.min(698, x2 + 6)}
                      y={y + 5}
                      fill="#9A968E"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {span.durationMs}ms{span.clockInverted ? ' [SKEW!]' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
                Selected Span &amp; W3C Context
              </div>
              <h2 className="font-editorial text-2xl leading-tight">
                {inspectedSpan.service} · {inspectedSpan.operation}
              </h2>

              <div className="p-3 bg-[#111413] text-[#F4F0E8] font-mono text-[10px] break-all space-y-1">
                <div className="text-[#9A968E] uppercase">W3C traceparent Header</div>
                <div className="text-[#34D399]">{inspectedSpan.traceparent}</div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Host</span>
                  <span>{inspectedSpan.host}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Reported Window</span>
                  <span>
                    {inspectedSpan.reportedStartMs}ms → {inspectedSpan.reportedEndMs}ms
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Critical Path</span>
                  <span className={inspectedSpan.onCriticalPath ? 'text-[var(--emerald)] font-semibold' : 'text-[var(--ink-muted)]'}>
                    {inspectedSpan.onCriticalPath ? 'YES (DIRECTLY IMPACTS RTT)' : 'NO (OVERLAPPED)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Clock Skew Check</span>
                  <span className={inspectedSpan.clockInverted ? 'text-[var(--signal)] font-semibold' : 'text-[var(--emerald)] font-semibold'}>
                    {inspectedSpan.clockInverted ? 'CHILD OUTSIDE PARENT!' : 'CAUSALLY VALID'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[var(--paper)] border border-[var(--rule)] text-xs text-[var(--ink-secondary)]">
              {analysis.preset.summary}
            </div>
          </div>
        </section>

        {/* Head vs Tail Sampling Economics Workbench */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[var(--rule)]">
            <Sliders className="w-4 h-4 text-[var(--signal)]" />
            <h2 className="font-editorial text-2xl">
              Head-Based vs. Tail-Based Sampling Economics
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Fleet Trace Throughput</span>
                  <span className="font-semibold">{totalRps.toLocaleString()} traces/s</span>
                </div>
                <input
                  type="range"
                  aria-label="Fleet Trace Throughput (traces/s)"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={totalRps}
                  onChange={(e) => setTotalRps(Number(e.target.value))}
                  className="w-full accent-[#1D4B8F]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Head-Based Sample Rate</span>
                  <span className="font-semibold">{headSamplePct}%</span>
                </div>
                <input
                  type="range"
                  aria-label="Head-Based Sample Rate (%)"
                  min={1}
                  max={25}
                  value={headSamplePct}
                  onChange={(e) => setHeadSamplePct(Number(e.target.value))}
                  className="w-full accent-[#D9441E]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">5xx Error Rate</span>
                  <span className="font-semibold">{errorRatePct.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  aria-label="5xx Error Rate (%)"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={errorRatePct}
                  onChange={(e) => setErrorRatePct(Number(e.target.value))}
                  className="w-full accent-[#D9441E]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Tail Collector Assembly Buffer</span>
                  <span className="font-semibold">{tailBufferSec}s</span>
                </div>
                <input
                  type="range"
                  aria-label="Tail Collector Assembly Buffer (seconds)"
                  min={5}
                  max={45}
                  step={5}
                  value={tailBufferSec}
                  onChange={(e) => setTailBufferSec(Number(e.target.value))}
                  className="w-full accent-[#0F6B50]"
                />
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[var(--rule)] bg-[var(--paper)] space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase">
                  <span className="font-semibold text-[var(--signal)]">Head-Based Sampling</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--signal)]" />
                </div>
                <div className="font-mono text-2xl font-semibold">
                  {sampling.headErrorCapturePct}%{' '}
                  <span className="text-xs font-normal text-[var(--ink-muted)]">5xx captured</span>
                </div>
                <div className="font-mono text-xs text-[var(--ink-secondary)]">
                  Stored: {sampling.headStoredRps.toLocaleString()} traces/s · Collector RAM: 0 MB
                </div>
                <p className="text-xs text-[var(--ink-secondary)]">
                  Decides at the root gateway before the request executes—stateless and cheap, but
                  blindly discards {(100 - sampling.headErrorCapturePct).toFixed(0)}% of rare
                  outages.
                </p>
              </div>

              <div className="p-4 border border-[var(--emerald)] bg-[#0F6B50]/8 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase">
                  <span className="font-semibold text-[var(--emerald)]">Tail-Based Sampling</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--emerald)]" />
                </div>
                <div className="font-mono text-2xl font-semibold text-[var(--emerald)]">
                  {sampling.tailErrorCapturePct}%{' '}
                  <span className="text-xs font-normal text-[var(--ink-muted)]">5xx &amp; p99</span>
                </div>
                <div className="font-mono text-xs text-[var(--ink-secondary)]">
                  Stored: {sampling.tailStoredRps.toLocaleString()} traces/s · Buffer:{' '}
                  {sampling.tailBufferMb.toLocaleString()} MB RAM
                </div>
                <p className="text-xs text-[var(--ink-secondary)]">
                  Buffers complete traces by <span className="font-mono">traceId</span> (via
                  consistent hashing) until spans finish—capturing 100% of errors and p99 outliers
                  at low storage volume.
                </p>
              </div>

              <div className="sm:col-span-2 p-3 bg-[var(--paper)] border-l-2 border-[var(--cobalt)] text-xs text-[var(--ink-secondary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--cobalt)] flex-shrink-0" />
                <span>{sampling.verdict}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
