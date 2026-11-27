'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitCommitHorizontal,
  Sliders,
  Waves,
} from 'lucide-react';
import {
  CHECKPOINT_MODES,
  CheckpointMode,
  WindowMode,
  evaluateStreamWindows,
} from '@/lib/streaming-lab';

export default function StreamingLabPage() {
  const [windowMode, setWindowMode] = useState<WindowMode>('tumbling');
  const [windowSizeSec, setWindowSizeSec] = useState(10);
  const [watermarkLagSec, setWatermarkLagSec] = useState(3);
  const [allowedLatenessSec, setAllowedLatenessSec] = useState(4);
  const [checkpointMode, setCheckpointMode] = useState<CheckpointMode>('aligned');

  const result = useMemo(
    () =>
      evaluateStreamWindows({
        windowMode,
        windowSizeSec,
        watermarkLagSec,
        allowedLatenessSec,
      }),
    [windowMode, windowSizeSec, watermarkLagSec, allowedLatenessSec]
  );

  const activeCheckpoint =
    CHECKPOINT_MODES.find((c) => c.id === checkpointMode) ?? CHECKPOINT_MODES[0];

  // Event-Time (X: 0..30s) vs Processing-Time (Y: 0..30s, bottom-to-top)
  const toX = (eSec: number) => 60 + (eSec / 30) * 560;
  const toY = (pSec: number) => 225 - (pSec / 30) * 185;

  const watermarkPath = result.watermarkCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.watermarkSec).toFixed(1)} ${toY(pt.procSec).toFixed(1)}`)
    .join(' ');

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME III · STREAM PROCESSING · EVENT-TIME WATERMARKS &amp; BARRIER CHECKPOINTS</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/replication-log" className="text-[var(--cobalt)] hover:underline">
              Plate 10 · Replication Log →
            </Link>
            <Link href="/chandy-lamport" className="text-[var(--signal)] hover:underline">
              Plate 04 · Chandy–Lamport →
            </Link>
            <Link href="/clocks" className="text-[var(--emerald)] hover:underline">
              HLC &amp; TrueTime →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Stream Processing: Watermarks &amp; Checkpoints
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Explore the <strong className="text-[var(--ink)]">Completeness vs. Latency</strong>{' '}
              trade-off in Dataflow and Apache Flink. Tune bounded out-of-orderness watermarks and
              allowed lateness to watch late stragglers flip between{' '}
              <strong className="text-[var(--emerald)]">on-time</strong>,{' '}
              <strong className="text-[var(--cobalt)]">late-updated</strong>, and{' '}
              <strong className="text-[var(--signal)]">dropped</strong>—then compare Aligned vs.
              Unaligned Chandy–Lamport checkpoint barriers.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Completeness
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  result.completenessPct >= 90 ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                }`}
              >
                {result.completenessPct}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Emit Latency
              </div>
              <div className="font-mono text-base font-semibold mt-1 text-[var(--cobalt)]">
                +{result.avgEmissionLatencySec}s
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Dropped
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  result.droppedCount > 0 ? 'text-[var(--signal)]' : 'text-[var(--emerald)]'
                }`}
              >
                {result.droppedCount} / {result.events.length}
              </div>
            </div>
          </div>
        </header>

        {/* Controls Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Watermark &amp; Window Controls</span>
            </div>
            <div className="flex gap-1.5 font-mono text-[10px]">
              {(['tumbling', 'sliding', 'session'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setWindowMode(m)}
                  className={`px-3 py-1 border uppercase tracking-wider transition-colors ${
                    windowMode === m
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Watermark Lag (Out-of-Orderness)</span>
                <span className="font-semibold">{watermarkLagSec}s</span>
              </div>
              <input
                type="range"
                aria-label="Watermark Lag (seconds)"
                min={0}
                max={12}
                value={watermarkLagSec}
                onChange={(e) => setWatermarkLagSec(Number(e.target.value))}
                className="w-full accent-[#D9441E]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Allowed Lateness Grace</span>
                <span className="font-semibold">{allowedLatenessSec}s</span>
              </div>
              <input
                type="range"
                aria-label="Allowed Lateness Grace (seconds)"
                min={0}
                max={12}
                value={allowedLatenessSec}
                onChange={(e) => setAllowedLatenessSec(Number(e.target.value))}
                className="w-full accent-[#1D4B8F]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Window Size</span>
                <span className="font-semibold">{windowSizeSec}s</span>
              </div>
              <input
                type="range"
                aria-label="Window Size (seconds)"
                min={6}
                max={14}
                step={2}
                value={windowSizeSec}
                onChange={(e) => setWindowSizeSec(Number(e.target.value))}
                className="w-full accent-[#0F6B50]"
              />
            </div>
          </div>
        </section>

        {/* Event-Time vs Processing-Time Oscilloscope + Window Aggregates */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
              <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                <Waves className="w-3.5 h-3.5 text-[#60A5FA]" />
                EVENT-TIME (X) VS. PROCESSING-TIME (Y) WATERMARK OSCILLOSCOPE
              </span>
              <span className="flex items-center gap-3">
                <span className="text-[#34D399]">● On-Time ({result.onTimeCount})</span>
                <span className="text-[#FBBF24]">● Late Fix ({result.lateUpdatedCount})</span>
                <span className="text-[#D9441E]">● Dropped ({result.droppedCount})</span>
              </span>
            </div>

            <svg viewBox="0 0 660 258" className="w-full h-auto">
              {/* Ideal zero-skew diagonal */}
              <line
                x1={toX(0)}
                y1={toY(0)}
                x2={toX(30)}
                y2={toY(30)}
                stroke="#2E3532"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text x={toX(26)} y={toY(27.5)} fill="#6B726D" fontSize="8.5" fontFamily="monospace">
                IDEAL (e = p)
              </text>

              {/* Axes */}
              <line x1={60} y1={225} x2={628} y2={225} stroke="#4A4E4B" />
              <line x1={60} y1={36} x2={60} y2={225} stroke="#4A4E4B" />

              {[0, 10, 20, 30].map((t) => (
                <g key={t}>
                  <line x1={toX(t)} y1={36} x2={toX(t)} y2={225} stroke="#1B201E" />
                  <text x={toX(t)} y={239} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                    {t}s
                  </text>
                  <text x={48} y={toY(t) + 3} textAnchor="end" fill="#9A968E" fontSize="9" fontFamily="monospace">
                    {t}s
                  </text>
                </g>
              ))}

              {/* Watermark curve */}
              <path d={watermarkPath} fill="none" stroke="#60A5FA" strokeWidth="2.5" />

              {/* Event points */}
              {result.events.map((ev) => {
                const cx = toX(ev.eventTimeSec);
                const cy = toY(ev.processingTimeSec);
                const fill =
                  ev.disposition === 'on-time'
                    ? '#34D399'
                    : ev.disposition === 'late-updated'
                    ? '#FBBF24'
                    : '#D9441E';
                return (
                  <g key={ev.id}>
                    <circle cx={cx} cy={cy} r="5.5" fill={fill} stroke="#111413" strokeWidth="1.4" />
                    <text
                      x={cx + 8}
                      y={cy + 3}
                      fill={fill}
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {ev.id}
                    </text>
                  </g>
                );
              })}

              <text x={340} y={253} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                EVENT TIME (WHEN GENERATED) · BLUE CURVE = HEURISTIC WATERMARK W(p) = max(e) − {watermarkLagSec}s
              </text>
              <text x={18} y={132} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace" transform="rotate(-90 18 132)">
                PROCESSING TIME (ARRIVAL)
              </text>
            </svg>
          </div>

          {/* Window Aggregates Readout */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
                {windowMode.toUpperCase()} Window Aggregates
              </div>
              <h2 className="font-editorial text-2xl mb-4">Emitted Window State</h2>
              <div className="space-y-2.5">
                {result.windows.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-[var(--paper)] border border-[var(--rule)] flex items-center justify-between font-mono text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--ink)]">{w.id}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        {w.eventCount} events
                        {w.lateUpdateCount > 0 ? ` · ${w.lateUpdateCount} late fix` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--cobalt)]">Σ = {w.sumValue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--rule)] space-y-1.5 text-xs text-[var(--ink-secondary)]">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[var(--ink)]">
                {result.droppedCount === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--emerald)]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--signal)]" />
                )}
                <span>
                  {result.droppedCount === 0
                    ? 'Zero late data loss (100% captured)'
                    : `${result.droppedCount} straggler(s) routed to Side Output DLQ`}
                </span>
              </div>
              <p>
                Notice how severe offline event <span className="font-mono">E10 (e=4s, p=24s)</span>{' '}
                only survives when Watermark Lag + Allowed Lateness ≥ 18s—otherwise route it to a
                side-output dead-letter stream for batch backfill.
              </p>
            </div>
          </div>
        </section>

        {/* Flink Checkpoint Barrier Alignment vs Unaligned */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2">
              <GitCommitHorizontal className="w-4 h-4 text-[var(--signal)]" />
              <h2 className="font-editorial text-2xl">
                Exactly-Once State: Chandy–Lamport Checkpoint Barriers
              </h2>
            </div>
            <div className="flex gap-2 font-mono text-[10px]">
              {CHECKPOINT_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setCheckpointMode(m.id)}
                  className={`px-3 py-1.5 border uppercase tracking-wider transition-colors ${
                    checkpointMode === m.id
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {m.id === 'aligned' ? 'Aligned Barriers (ABS)' : 'Unaligned Checkpoints'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7 bg-[#111413] p-4">
              <svg viewBox="0 0 640 165" className="w-full h-auto">
                {/* Input channel 1 (fast) & channel 2 (slow) */}
                <text x="14" y="48" fill="#60A5FA" fontSize="10" fontFamily="monospace">CH-1 (FAST)</text>
                <line x1="95" y1="44" x2="310" y2="44" stroke="#60A5FA" strokeWidth="2" />
                <rect x="276" y="28" width="12" height="32" fill="#D9441E" />
                <text x="282" y="20" textAnchor="middle" fill="#D9441E" fontSize="8.5" fontFamily="monospace">BARRIER #4</text>
                <rect x="210" y="34" width="52" height="20" fill="#182026" stroke="#FBBF24" />
                <text x="236" y="47" textAnchor="middle" fill="#FBBF24" fontSize="8" fontFamily="monospace">
                  {checkpointMode === 'aligned' ? 'BUFFERED' : 'IN-FLIGHT'}
                </text>

                <text x="14" y="122" fill="#34D399" fontSize="10" fontFamily="monospace">CH-2 (SLOW)</text>
                <line x1="95" y1="118" x2="310" y2="118" stroke="#34D399" strokeWidth="2" />
                <rect
                  x={checkpointMode === 'aligned' ? 140 : 276}
                  y="102"
                  width="12"
                  height="32"
                  fill="#D9441E"
                />
                <text
                  x={checkpointMode === 'aligned' ? 146 : 282}
                  y="94"
                  textAnchor="middle"
                  fill="#D9441E"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {checkpointMode === 'aligned' ? 'LAG BARRIER' : 'OVERTAKES'}
                </text>

                {/* Operator & State Snapshot */}
                <rect x="315" y="26" width="135" height="110" fill="#181C1B" stroke="#F4F0E8" strokeWidth="1.5" />
                <text x="382" y="64" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  STATEFUL OP
                </text>
                <text x="382" y="84" textAnchor="middle" fill={checkpointMode === 'aligned' ? '#FBBF24' : '#34D399'} fontSize="9" fontFamily="monospace">
                  {checkpointMode === 'aligned' ? 'PAUSES CH-1' : 'SNAPS + BUF'}
                </text>
                <text x="382" y="102" textAnchor="middle" fill="#9A968E" fontSize="8" fontFamily="monospace">
                  RocksDB State
                </text>

                <line x1="450" y1="81" x2="510" y2="81" stroke="#34D399" strokeWidth="2" />
                <rect x="512" y="48" width="112" height="66" fill="#17201C" stroke="#34D399" strokeWidth="1.5" />
                <text x="568" y="75" textAnchor="middle" fill="#34D399" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                  DURABLE S3
                </text>
                <text x="568" y="92" textAnchor="middle" fill="#F4F0E8" fontSize="8.5" fontFamily="monospace">
                  SNAPSHOT #4
                </text>

                <text x="320" y="155" textAnchor="middle" fill="#9A968E" fontSize="8.5" fontFamily="monospace">
                  {checkpointMode === 'aligned'
                    ? 'ALIGNED: WAIT FOR CH-2 BARRIER BEFORE SNAPSHOTTING (SMALLER PAYLOAD, STALLS UNDER BACKPRESSURE)'
                    : 'UNALIGNED: BARRIER OVERTAKES BUFFERS IMMEDIATELY (BOUNDED CHECKPOINT TIME UNDER BACKPRESSURE)'}
                </text>
              </svg>
            </div>

            <div className="lg:col-span-5 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[var(--cobalt)] font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>{activeCheckpoint.name}</span>
              </div>
              <p className="text-[var(--ink-secondary)] leading-relaxed">
                <strong className="text-[var(--ink)]">Mechanism:</strong> {activeCheckpoint.mechanism}
              </p>
              <p className="text-[var(--ink-secondary)] leading-relaxed">
                <strong className="text-[var(--signal)]">Under Backpressure:</strong>{' '}
                {activeCheckpoint.backpressureBehavior}
              </p>
              <p className="text-[var(--ink-secondary)] leading-relaxed">
                <strong className="text-[var(--emerald)]">Guarantee:</strong>{' '}
                {activeCheckpoint.guarantee} ({activeCheckpoint.recoverySize})
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
