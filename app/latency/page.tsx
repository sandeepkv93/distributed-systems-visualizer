'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Gauge, Radio, Sliders, Compass } from 'lucide-react';
import {
  TOPOLOGY_PRESETS,
  TopologyPresetId,
  evaluateProtocolLatencies,
} from '@/lib/latency-math';
import { CONCEPTS_BY_ID } from '@/lib/catalog';

function formatMs(ms: number): string {
  if (ms >= 100) return `${Math.round(ms)} ms`;
  return `${ms.toFixed(1)} ms`;
}

export default function LatencyEstimatorPage() {
  const [activePreset, setActivePreset] = useState<TopologyPresetId | 'custom'>('cross-region');
  const [clusterSize, setClusterSize] = useState<number>(5);
  const [baseRttMs, setBaseRttMs] = useState<number>(45);
  const [jitterMultiplier, setJitterMultiplier] = useState<number>(1.75);

  const applyPreset = (presetId: TopologyPresetId) => {
    const preset = TOPOLOGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(preset.id);
    setBaseRttMs(preset.baseRttMs);
    setJitterMultiplier(preset.jitterMultiplier);
  };

  const estimates = useMemo(
    () =>
      evaluateProtocolLatencies({
        clusterSize,
        baseRttMs,
        jitterMultiplier,
      }),
    [clusterSize, baseRttMs, jitterMultiplier]
  );

  const maxP99 = useMemo(
    () => Math.max(10, ...estimates.map((e) => e.p99Ms)),
    [estimates]
  );

  const raftEst = estimates.find((e) => e.id === 'raft')!;
  const pbftEst = estimates.find((e) => e.id === 'pbft')!;
  const tpcEst = estimates.find((e) => e.id === 'two-phase-commit')!;

  // Message scaling curve points (N = 3 .. 21)
  const scalingPoints = useMemo(() => {
    const ns = [3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    return ns.map((n) => ({
      n,
      raft: 2 * (n - 1),
      paxos: 4 * (n - 1),
      pbft: n - 1 + 2 * n * (n - 1),
    }));
  }, []);
  const maxMsgs = scalingPoints[scalingPoints.length - 1].pbft;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · QUANTITATIVE PERFORMANCE BENCH</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/bench" className="text-[var(--emerald)] hover:underline">
              Quorum Availability Bench →
            </Link>
            <Link href="/advisor" className="text-[var(--cobalt)] hover:underline">
              Protocol Advisor →
            </Link>
          </div>
        </div>

        {/* Editorial Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Latency &amp; Message Complexity Estimator
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Compare steady-state commit latency (<span className="font-mono">p50</span> &amp;{' '}
              <span className="font-mono">p99</span> straggler tails) and per-operation message
              amplification across 7 canonical distributed protocols as cluster size{' '}
              <span className="font-mono font-semibold text-[var(--ink)]">N</span> and physical WAN
              RTT scale.
            </p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Raft p50
              </div>
              <div className="font-editorial text-2xl text-[var(--signal)] tabular-nums mt-0.5">
                {formatMs(raftEst.p50Ms)}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                2PC p99
              </div>
              <div className="font-editorial text-2xl text-[var(--cobalt)] tabular-nums mt-0.5">
                {formatMs(tpcEst.p99Ms)}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                PBFT Msgs
              </div>
              <div className="font-editorial text-2xl text-[var(--ink)] tabular-nums mt-0.5">
                {pbftEst.messagesPerWrite}
              </div>
            </div>
          </div>
        </header>

        {/* Topology Presets + Calibrated Sliders */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
              <Radio className="w-3.5 h-3.5" />
              <span>Network Topology Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TOPOLOGY_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                        : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">{preset.label}</div>
                    <div
                      className={`font-mono text-[10px] mt-0.5 ${
                        isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {preset.baseRttMs} ms RTT · {preset.jitterMultiplier}x tail
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              {TOPOLOGY_PRESETS.find((p) => p.id === activePreset)?.description ??
                'Custom link parameters active — adjust cluster size, RTT, and tail jitter on the right.'}
            </p>
          </div>

          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
              <Gauge className="w-3.5 h-3.5" />
              <span>Cluster &amp; Network Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Cluster Size N */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between font-mono text-xs">
                  <label htmlFor="slider-n" className="uppercase tracking-wider text-[var(--ink-secondary)]">
                    Cluster Size N
                  </label>
                  <span className="font-semibold text-[var(--ink)] tabular-nums">N = {clusterSize}</span>
                </div>
                <input
                  id="slider-n"
                  type="range"
                  min={3}
                  max={21}
                  step={1}
                  value={clusterSize}
                  onChange={(e) => setClusterSize(Number(e.target.value))}
                  className="w-full accent-[#D9441E] cursor-pointer"
                />
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                  CFT majority: {Math.floor(clusterSize / 2) + 1}/{clusterSize} · BFT f={Math.floor((clusterSize - 1) / 3)}
                </div>
              </div>

              {/* Base RTT */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between font-mono text-xs">
                  <label htmlFor="slider-rtt" className="uppercase tracking-wider text-[var(--ink-secondary)]">
                    Base Peer RTT
                  </label>
                  <span className="font-semibold text-[var(--ink)] tabular-nums">
                    {formatMs(baseRttMs)}
                  </span>
                </div>
                <input
                  id="slider-rtt"
                  type="range"
                  min={0.5}
                  max={250}
                  step={0.5}
                  value={baseRttMs}
                  onChange={(e) => {
                    setActivePreset('custom');
                    setBaseRttMs(Number(e.target.value));
                  }}
                  className="w-full accent-[#1D4B8F] cursor-pointer"
                />
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                  One-way fiber ~{formatMs(baseRttMs / 2)}
                </div>
              </div>

              {/* p99 Jitter */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between font-mono text-xs">
                  <label htmlFor="slider-jitter" className="uppercase tracking-wider text-[var(--ink-secondary)]">
                    p99 Tail Jitter
                  </label>
                  <span className="font-semibold text-[var(--ink)] tabular-nums">
                    {jitterMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  id="slider-jitter"
                  type="range"
                  min={1.0}
                  max={4.0}
                  step={0.05}
                  value={jitterMultiplier}
                  onChange={(e) => {
                    setActivePreset('custom');
                    setJitterMultiplier(Number(e.target.value));
                  }}
                  className="w-full accent-[#0F6B50] cursor-pointer"
                />
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                  Slow-node amplification under GC/packet loss
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Oscilloscope Visualizations: Waterfall + O(N^2) Message Explosion */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Commit-Latency Waterfall SVG */}
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] text-[#F4F0E8] p-4 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-[#D9441E] font-semibold">
                COMMIT LATENCY WATERFALL · p50 PHASES &amp; p99 TAIL WHISKER
              </span>
              <span className="text-[#9E9B90]">
                SOLID = p50 COMMIT · DASHED = p99 TAIL
              </span>
            </div>

            <svg
              viewBox="0 0 820 350"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-auto"
              role="img"
              aria-label="Commit latency waterfall comparing p50 phases and p99 tail across distributed protocols"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const x = 195 + frac * 545;
                const msLabel = formatMs(maxP99 * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={x}
                      y1={16}
                      x2={x}
                      y2={316}
                      stroke="rgba(244,240,232,0.1)"
                      strokeDasharray={frac === 0 ? undefined : '3 4'}
                    />
                    <text
                      x={x}
                      y={336}
                      textAnchor="middle"
                      fill="#9E9B90"
                      fontSize="10"
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                    >
                      {msLabel}
                    </text>
                  </g>
                );
              })}

              {estimates.map((est, rowIdx) => {
                const y = 26 + rowIdx * 42;
                const barH = 20;
                const scaleX = (ms: number) => (ms / maxP99) * 545;
                let cursor = 195;
                const p50End = 195 + Math.max(4, scaleX(est.p50Ms));
                const p99End = 195 + Math.max(6, scaleX(est.p99Ms));

                return (
                  <g key={est.id} opacity={est.viable ? 1 : 0.45}>
                    <text
                      x={184}
                      y={y + 14}
                      textAnchor="end"
                      fill="#F4F0E8"
                      fontSize="11.5"
                      fontWeight="600"
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                    >
                      {est.shortName}
                    </text>

                    {/* Stacked phase bars */}
                    {est.phases.map((phase, pIdx) => {
                      const w = Math.max(3, scaleX(phase.durationMs));
                      const rectX = cursor;
                      cursor += w;
                      return (
                        <rect
                          key={`${est.id}-${pIdx}`}
                          x={rectX}
                          y={y}
                          width={w}
                          height={barH}
                          fill={phase.color}
                          stroke="#111413"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* p99 Tail Whisker */}
                    {p99End > p50End + 2 && (
                      <>
                        <line
                          x1={p50End}
                          y1={y + barH / 2}
                          x2={p99End}
                          y2={y + barH / 2}
                          stroke="#FBBF24"
                          strokeWidth="1.75"
                          strokeDasharray="4 3"
                        />
                        <line
                          x1={p99End}
                          y1={y + 3}
                          x2={p99End}
                          y2={y + barH - 3}
                          stroke="#FBBF24"
                          strokeWidth="2"
                        />
                      </>
                    )}

                    {/* Right Numeric Readout */}
                    <text
                      x={748}
                      y={y + 14}
                      fill="#E5E1D6"
                      fontSize="10"
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                    >
                      {formatMs(est.p50Ms)} / {formatMs(est.p99Ms)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Message Complexity O(N) vs O(N^2) SVG */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[#111413] text-[#F4F0E8] p-4 flex flex-col justify-between">
            <div>
              <div className="pb-3 mb-3 border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.12em] text-[#60A5FA] font-semibold">
                MESSAGES PER WRITE · O(N) vs O(N²)
              </div>

              <svg
                viewBox="0 0 360 250"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto"
                role="img"
                aria-label="Message complexity curve comparing PBFT quadratic growth to linear Raft and Paxos"
              >
                {/* Axes */}
                <line x1={42} y1={20} x2={42} y2={210} stroke="rgba(244,240,232,0.25)" />
                <line x1={42} y1={210} x2={340} y2={210} stroke="rgba(244,240,232,0.25)" />

                {/* PBFT O(N^2) curve */}
                <polyline
                  fill="none"
                  stroke="#D9441E"
                  strokeWidth="2.2"
                  points={scalingPoints
                    .map((pt) => {
                      const x = 42 + ((pt.n - 3) / 18) * 290;
                      const y = 210 - (pt.pbft / maxMsgs) * 180;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />

                {/* Paxos / 2PC 4(N-1) curve */}
                <polyline
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  points={scalingPoints
                    .map((pt) => {
                      const x = 42 + ((pt.n - 3) / 18) * 290;
                      const y = 210 - (pt.paxos / maxMsgs) * 180;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />

                {/* Raft / Quorum 2(N-1) curve */}
                <polyline
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2"
                  points={scalingPoints
                    .map((pt) => {
                      const x = 42 + ((pt.n - 3) / 18) * 290;
                      const y = 210 - (pt.raft / maxMsgs) * 180;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />

                {/* Current N vertical marker */}
                {(() => {
                  const curX = 42 + ((clusterSize - 3) / 18) * 290;
                  const pbftY = 210 - (pbftEst.messagesPerWrite / maxMsgs) * 180;
                  return (
                    <g>
                      <line
                        x1={curX}
                        y1={20}
                        x2={curX}
                        y2={210}
                        stroke="rgba(244,240,232,0.4)"
                        strokeDasharray="2 3"
                      />
                      <circle cx={curX} cy={pbftY} r={4.5} fill="#D9441E" stroke="#FAF7F1" strokeWidth="1.5" />
                      <text
                        x={Math.min(315, Math.max(58, curX))}
                        y={228}
                        textAnchor="middle"
                        fill="#F4F0E8"
                        fontSize="10"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                      >
                        N={clusterSize}
                      </text>
                    </g>
                  );
                })()}

                {/* Y-axis labels */}
                <text x={36} y={26} textAnchor="end" fill="#9E9B90" fontSize="9.5" fontFamily="monospace">
                  {maxMsgs}
                </text>
                <text x={36} y={213} textAnchor="end" fill="#9E9B90" fontSize="9.5" fontFamily="monospace">
                  0
                </text>
              </svg>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1.5 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[#D9441E]">● PBFT O(N²)</span>
                <span className="tabular-nums">{pbftEst.messagesPerWrite} msgs/write</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#FBBF24]">● Paxos / 2PC 4(N-1)</span>
                <span className="tabular-nums">{4 * (clusterSize - 1)} msgs/write</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#34D399]">● Raft / Quorum 2(N-1)</span>
                <span className="tabular-nums">{raftEst.messagesPerWrite} msgs/write</span>
              </div>
            </div>
          </div>
        </section>

        {/* Complete Specification Matrix */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--chassis)] border-b border-[var(--ink)] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-secondary)]">
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4">Fault Model</th>
                <th className="py-3 px-4 text-right">RTTs</th>
                <th className="py-3 px-4 text-right">Msgs / Write</th>
                <th className="py-3 px-4 text-right">p50</th>
                <th className="py-3 px-4 text-right">p99</th>
                <th className="py-3 px-4 text-right">Serial Ops/s</th>
                <th className="py-3 px-4 text-right">Plate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)] text-sm">
              {estimates.map((est) => {
                const concept = CONCEPTS_BY_ID.get(est.conceptId);
                return (
                  <tr
                    key={est.id}
                    className={`hover:bg-[var(--paper)] transition-colors ${
                      est.viable ? '' : 'opacity-60'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[var(--ink)]">{est.name}</div>
                      <div className="text-xs text-[var(--ink-muted)] mt-0.5">{est.viabilityNote}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--ink-secondary)]">
                      <div>{est.faultModel}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">{est.complexityBigO}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                      {est.rtts}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold tabular-nums">
                      {est.messagesPerWrite}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                      {formatMs(est.p50Ms)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-[var(--signal)] tabular-nums">
                      {formatMs(est.p99Ms)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-[var(--ink-secondary)]">
                      {est.serialOpsPerSec.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {concept && (
                        <Link
                          href={concept.path}
                          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[var(--cobalt)] hover:text-[var(--signal)]"
                        >
                          <span>PL {concept.plateNumber}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Related Workbenches Footer */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/bench"
            className="p-4 border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper-elevated)] flex items-center justify-between transition-colors"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--emerald)]">
                Next Instrument · Availability Math
              </div>
              <div className="font-editorial text-xl text-[var(--ink)] mt-0.5">
                Quorum &amp; Fault-Tolerance Workbench
              </div>
            </div>
            <Sliders className="w-5 h-5 text-[var(--emerald)]" />
          </Link>
          <Link
            href="/advisor"
            className="p-4 border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper-elevated)] flex items-center justify-between transition-colors"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--cobalt)]">
                Next Instrument · Protocol Selection
              </div>
              <div className="font-editorial text-xl text-[var(--ink)] mt-0.5">
                Architecture Decision Matrix
              </div>
            </div>
            <Compass className="w-5 h-5 text-[var(--cobalt)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
