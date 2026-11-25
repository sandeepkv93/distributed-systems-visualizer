'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import {
  CLOCK_PRESETS,
  ClockPresetId,
  formatHlc,
  simulateClockTrace,
} from '@/lib/clocks-lab';

export default function ClocksLabPage() {
  const [activePreset, setActivePreset] = useState<ClockPresetId | 'custom'>('ntp-skew');
  const [skewA, setSkewA] = useState(25);
  const [skewB, setSkewB] = useState(-20);
  const [skewC, setSkewC] = useState(5);
  const [epsilonMs, setEpsilonMs] = useState(20);

  const applyPreset = (id: ClockPresetId) => {
    const preset = CLOCK_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setSkewA(preset.skewA);
    setSkewB(preset.skewB);
    setSkewC(preset.skewC);
    setEpsilonMs(preset.epsilonMs);
  };

  const result = useMemo(
    () =>
      simulateClockTrace({
        skewA,
        skewB,
        skewC,
        epsilonMs,
      }),
    [skewA, skewB, skewC, epsilonMs]
  );

  // Compute SVG X scale across all wall/TrueTime intervals
  const minT = useMemo(
    () =>
      Math.min(
        60,
        ...result.events.map((e) => Math.min(e.trueTimeMs, e.trueTimeEarliestMs, e.wallClockMs))
      ) - 10,
    [result.events]
  );
  const maxT = useMemo(
    () =>
      Math.max(
        190,
        ...result.events.map((e) => Math.max(e.trueTimeMs, e.trueTimeLatestMs, e.hlc.l))
      ) + 15,
    [result.events]
  );
  const toX = (t: number) => 120 + ((t - minT) / Math.max(1, maxT - minT)) * 710;
  const laneY: Record<'A' | 'B' | 'C', number> = { A: 74, B: 158, C: 242 };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · PHYSICAL CLOCK SKEW · HLC &amp; TRUETIME LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/lamport-clocks" className="text-[var(--cobalt)] hover:underline">
              Plate 02 · Lamport Clocks →
            </Link>
            <Link href="/vector-clocks" className="text-[var(--signal)] hover:underline">
              Plate 03 · Vector Clocks →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Hybrid Logical Clocks &amp; TrueTime Uncertainty
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Inject physical NTP clock skew across three nodes and watch how{' '}
              <strong className="text-[var(--ink)]">Wall-Clock LWW</strong> silently drops causally
              newer writes—while <strong className="text-[var(--ink)]">HLC (l, c)</strong> preserves
              causality without waiting and{' '}
              <strong className="text-[var(--ink)]">Spanner TrueTime</strong> enforces external
              consistency via <span className="font-mono">2ε</span> Commit-Wait.
            </p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                LWW Inversions
              </div>
              <div
                className={`font-editorial text-2xl tabular-nums mt-0.5 ${
                  result.lwwInversionCount > 0 ? 'text-[var(--signal)]' : 'text-[var(--emerald)]'
                }`}
              >
                {result.lwwInversionCount}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                HLC Order
              </div>
              <div className="font-editorial text-2xl text-[var(--emerald)] mt-0.5">
                {result.hlcOrderHolds ? 'SAFE' : 'FAIL'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Commit-Wait
              </div>
              <div className="font-editorial text-2xl text-[var(--cobalt)] tabular-nums mt-0.5">
                {result.trueTimeCommitWaitMs}ms
              </div>
            </div>
          </div>
        </header>

        {/* Presets & Skew Controls */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Clock Regime Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CLOCK_PRESETS.map((preset) => {
                const selected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                        : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">{preset.label}</div>
                    <div
                      className={`font-mono text-[10px] mt-0.5 ${
                        selected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      ε = ±{preset.epsilonMs}ms · 2ε = {preset.epsilonMs * 2}ms
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              {CLOCK_PRESETS.find((p) => p.id === activePreset)?.description ??
                'Custom skew configuration active.'}
            </p>
          </div>

          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
              <Sliders className="w-3.5 h-3.5" />
              <span>Physical Drift Offsets &amp; TrueTime Uncertainty Bound (ε)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Node A Clock Skew', value: skewA, set: setSkewA },
                { label: 'Node B Clock Skew', value: skewB, set: setSkewB },
                { label: 'Node C Clock Skew', value: skewC, set: setSkewC },
              ].map((ctrl) => (
                <div key={ctrl.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between font-mono text-xs">
                    <span className="text-[var(--ink-secondary)]">{ctrl.label}</span>
                    <span className="font-semibold tabular-nums">
                      {ctrl.value >= 0 ? `+${ctrl.value}` : ctrl.value} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={ctrl.value}
                    onChange={(e) => {
                      setActivePreset('custom');
                      ctrl.set(Number(e.target.value));
                    }}
                    className="w-full accent-[#D9441E] cursor-pointer"
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between font-mono text-xs">
                  <span className="text-[var(--ink-secondary)]">TrueTime Bound ε</span>
                  <span className="font-semibold text-[var(--cobalt)] tabular-nums">
                    ±{epsilonMs} ms (wait {epsilonMs * 2}ms)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={epsilonMs}
                  onChange={(e) => {
                    setActivePreset('custom');
                    setEpsilonMs(Number(e.target.value));
                  }}
                  className="w-full accent-[#1D4B8F] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Oscilloscope SVG Timeline */}
        <section className="mb-8 border border-[var(--ink)] bg-[#111413] text-[#F4F0E8] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.12em]">
            <span className="text-[#D9441E] font-semibold">
              CAUSAL CHAIN (e1 → e2 → e3 → e4) · SKEWED WALL CLOCK vs TRUETIME [earliest, latest]
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[#9E9B90]">
              <span>
                <span className="text-[#60A5FA]">[───]</span> TrueTime ±ε
              </span>
              <span>
                <span className="text-[#34D399]">●</span> Monotonic
              </span>
              <span>
                <span className="text-[#D9441E]">●</span> LWW Inversion
              </span>
            </div>
          </div>

          <svg
            viewBox="0 0 880 300"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto"
            role="img"
            aria-label="Physical clock skew, HLC timestamps, and TrueTime uncertainty intervals across three nodes"
          >
            <defs>
              <marker
                id="clock-causal"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 7 3.5, 0 7" fill="#FBBF24" />
              </marker>
            </defs>

            {/* Node lanes */}
            {(['A', 'B', 'C'] as const).map((node) => {
              const y = laneY[node];
              const nodeSkew = node === 'A' ? skewA : node === 'B' ? skewB : skewC;
              return (
                <g key={node}>
                  <text
                    x={106}
                    y={y - 2}
                    textAnchor="end"
                    fill="#F4F0E8"
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    Node {node}
                  </text>
                  <text
                    x={106}
                    y={y + 13}
                    textAnchor="end"
                    fill="#9E9B90"
                    fontSize="9.5"
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    skew {nodeSkew >= 0 ? `+${nodeSkew}` : nodeSkew}ms
                  </text>
                  <line
                    x1={120}
                    y1={y}
                    x2={836}
                    y2={y}
                    stroke="rgba(244,240,232,0.16)"
                    strokeDasharray="3 4"
                  />
                </g>
              );
            })}

            {/* Causal RPC Arrows (by true real time) */}
            {result.events.slice(1).map((evt, idx) => {
              const prev = result.events[idx];
              const x1 = toX(prev.trueTimeMs);
              const y1 = laneY[prev.node];
              const x2 = toX(evt.trueTimeMs);
              const y2 = laneY[evt.node];
              return (
                <line
                  key={`arrow-${evt.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FBBF24"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.7"
                  markerEnd="url(#clock-causal)"
                />
              );
            })}

            {/* Events: TrueTime uncertainty bracket + wall-clock dot + HLC badge */}
            {result.events.map((evt) => {
              const y = laneY[evt.node];
              const xEarliest = toX(evt.trueTimeEarliestMs);
              const xLatest = toX(evt.trueTimeLatestMs);
              const xWall = toX(evt.wallClockMs);
              const dotColor = evt.lwwCausalInversion ? '#D9441E' : '#34D399';

              return (
                <g key={evt.id}>
                  {/* TrueTime [earliest, latest] bracket */}
                  <line
                    x1={xEarliest}
                    y1={y}
                    x2={xLatest}
                    y2={y}
                    stroke="#60A5FA"
                    strokeWidth="4"
                    opacity="0.55"
                  />
                  <line x1={xEarliest} y1={y - 7} x2={xEarliest} y2={y + 7} stroke="#60A5FA" strokeWidth="1.5" />
                  <line x1={xLatest} y1={y - 7} x2={xLatest} y2={y + 7} stroke="#60A5FA" strokeWidth="1.5" />

                  {/* Skewed Wall-Clock marker */}
                  <circle cx={xWall} cy={y} r={6} fill={dotColor} stroke="#FAF7F1" strokeWidth="1.5" />

                  <text
                    x={xWall}
                    y={y - 16}
                    textAnchor="middle"
                    fill={dotColor}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    {evt.id}: pt={evt.wallClockMs}ms
                  </text>
                  <text
                    x={xWall}
                    y={y + 24}
                    textAnchor="middle"
                    fill="#E5E1D6"
                    fontSize="9.5"
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    HLC {formatHlc(evt.hlc)}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* Three-Protocol Verdict Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--signal)] font-semibold">
                1. Raw Wall-Clock LWW
              </span>
              {result.lwwInversionCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-[var(--signal)]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[var(--emerald)]" />
              )}
            </div>
            <div className="font-editorial text-xl">
              {result.lwwInversionCount > 0
                ? `${result.lwwInversionCount} Causal Inversion(s) Detected`
                : 'No Inversions Under Current Skew'}
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Comparing raw NTP timestamps across nodes allows a fast-clock older write to discard a
              causally newer write from a slow-clock peer.
            </p>
          </div>

          <div className="p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--emerald)] font-semibold">
                2. Hybrid Logical Clock (HLC)
              </span>
              <ShieldCheck className="w-4 h-4 text-[var(--emerald)]" />
            </div>
            <div className="font-editorial text-xl">
              100% Causal Order · Max Drift {result.maxHlcDriftFromWallMs}ms
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Used in CockroachDB &amp; MongoDB: merges physical time with a logical counter{' '}
              <span className="font-mono">(l, c)</span> in 64 bits so{' '}
              <span className="font-mono">a → b ⇒ HLC(a) &lt; HLC(b)</span> with zero commit-wait.
            </p>
          </div>

          <div className="p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--cobalt)] font-semibold">
                3. Spanner TrueTime (2ε Wait)
              </span>
              {result.externalConsistencyGuaranteed ? (
                <ShieldCheck className="w-4 h-4 text-[var(--emerald)]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--signal)]" />
              )}
            </div>
            <div className="font-editorial text-xl">
              {result.externalConsistencyGuaranteed
                ? `External Consistency (${result.trueTimeCommitWaitMs}ms wait)`
                : `Bound Breached (actual skew > ±${epsilonMs}ms)`}
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Spanner sleeps <span className="font-mono">2ε</span> before releasing locks so real-time
              order matches commit timestamps—requiring hardware GPS+atomic clocks to keep{' '}
              <span className="font-mono">ε ≈ 3ms</span>.
            </p>
          </div>
        </section>

        {/* Detailed Event Table */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--chassis)] border-b border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4 text-right">True Time</th>
                <th className="py-3 px-4 text-right">Wall Clock (pt)</th>
                <th className="py-3 px-4 text-right">HLC (l, c)</th>
                <th className="py-3 px-4 text-right">TrueTime [e, l]</th>
                <th className="py-3 px-4 text-right">LWW Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)] text-xs font-mono">
              {result.events.map((evt) => (
                <tr key={evt.id} className="hover:bg-[var(--paper)]">
                  <td className="py-3 px-4 font-sans text-sm text-[var(--ink)]">
                    <span className="font-mono text-xs text-[var(--signal)] font-semibold mr-2">
                      {evt.id}
                    </span>
                    {evt.label}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{evt.trueTimeMs}ms</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold">
                    {evt.wallClockMs}ms
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[var(--emerald)] font-semibold">
                    {formatHlc(evt.hlc)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[var(--cobalt)]">
                    [{evt.trueTimeEarliestMs}, {evt.trueTimeLatestMs}]ms
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                        evt.lwwCausalInversion
                          ? 'bg-[var(--signal)] text-[#FAF7F1]'
                          : 'bg-[var(--emerald)]/12 text-[var(--emerald)]'
                      }`}
                    >
                      {evt.lwwCausalInversion ? 'INVERTED (LOST)' : 'ORDERED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cross-Links */}
        <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-wider">
          <Link
            href="/systems"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--ink)] bg-[var(--paper-elevated)] hover:bg-[var(--ink)] hover:text-[#FAF7F1] transition-colors"
          >
            <span>Inspect Spanner &amp; CockroachDB Blueprints</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/eventual-consistency"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper-elevated)] transition-colors"
          >
            <span>Open Plate 05 · Eventual Consistency</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
