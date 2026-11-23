'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sliders, ArrowUpRight, ShieldCheck, AlertTriangle, Check, X } from 'lucide-react';
import {
  analyzeDynamoQuorum,
  analyzeCrashConsensus,
  analyzeByzantineConsensus,
  assignBenchNodeRoles,
  formatAvailabilityPercent,
} from '@/lib/quorum-math';
import { ScopeDefs, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';

interface BenchPreset {
  id: string;
  label: string;
  tag: string;
  n: number;
  w: number;
  r: number;
  crashed: number;
  p: number;
}

const PRESETS: readonly BenchPreset[] = [
  { id: 'dynamo-classic', label: 'Dynamo Classic', tag: 'N=3 · W=2 · R=2', n: 3, w: 2, r: 2, crashed: 0, p: 0.99 },
  { id: 'eventual-fast', label: 'Fast Write (Stale)', tag: 'N=5 · W=1 · R=2', n: 5, w: 1, r: 2, crashed: 0, p: 0.99 },
  { id: 'strict-5', label: 'Strict Majority', tag: 'N=5 · W=3 · R=3', n: 5, w: 3, r: 3, crashed: 1, p: 0.99 },
  { id: 'pbft-4', label: 'PBFT Minimum (f=1)', tag: 'N=4 · W=3 · R=3', n: 4, w: 3, r: 3, crashed: 1, p: 0.99 },
  { id: 'bft-7', label: 'BFT Quorum (f=2)', tag: 'N=7 · W=5 · R=5', n: 7, w: 5, r: 5, crashed: 2, p: 0.99 },
];

const UPTIME_OPTIONS = [
  { label: '90%', value: 0.9 },
  { label: '95%', value: 0.95 },
  { label: '99%', value: 0.99 },
  { label: '99.9%', value: 0.999 },
];

export default function QuorumWorkbenchPage() {
  const [n, setN] = useState(5);
  const [w, setW] = useState(3);
  const [r, setR] = useState(3);
  const [crashed, setCrashed] = useState(0);
  const [nodeAvailability, setNodeAvailability] = useState(0.99);

  const handleSetN = (nextN: number) => {
    const clamped = Math.max(3, Math.min(11, nextN));
    setN(clamped);
    setW((prev) => Math.max(1, Math.min(clamped, prev)));
    setR((prev) => Math.max(1, Math.min(clamped, prev)));
    setCrashed((prev) => Math.max(0, Math.min(clamped - 1, prev)));
  };

  const applyPreset = (preset: BenchPreset) => {
    setN(preset.n);
    setW(preset.w);
    setR(preset.r);
    setCrashed(preset.crashed);
    setNodeAvailability(preset.p);
  };

  const dynamo = useMemo(
    () => analyzeDynamoQuorum(n, w, r, crashed, nodeAvailability),
    [n, w, r, crashed, nodeAvailability]
  );

  const cft = useMemo(
    () => analyzeCrashConsensus(n, crashed, nodeAvailability),
    [n, crashed, nodeAvailability]
  );

  const bft = useMemo(
    () => analyzeByzantineConsensus(n, crashed, nodeAvailability),
    [n, crashed, nodeAvailability]
  );

  const benchNodes = useMemo(
    () => assignBenchNodeRoles(n, w, r, crashed),
    [n, w, r, crashed]
  );

  // Ring geometry for the recessed oscilloscope SVG
  const cx = 360;
  const cy = 250;
  const ringRadius = 158;
  const positionedNodes = useMemo(() => {
    return benchNodes.map((node, idx) => {
      const angle = (idx * 2 * Math.PI) / benchNodes.length - Math.PI / 2;
      return {
        ...node,
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
        angle,
      };
    });
  }, [benchNodes]);

  const writeNodes = positionedNodes.filter((node) => node.inWriteSet);
  const readNodes = positionedNodes.filter((node) => node.inReadSet);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--emerald)] font-semibold">
            <Sliders className="w-3.5 h-3.5" />
            CALCULATOR WORKBENCH · QUORUM &amp; FAULT TOLERANCE
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        {/* Monograph Heading + Presets */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
              Quorum <em className="italic text-[var(--signal)] font-normal">Intersection</em> Bench
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
              Tune replication factor <code className="font-mono text-xs px-1 bg-[var(--chassis)]">N</code>,
              write quorum <code className="font-mono text-xs px-1 bg-[var(--chassis)]">W</code>,
              read quorum <code className="font-mono text-xs px-1 bg-[var(--chassis)]">R</code>,
              and live node failures to inspect strict quorum overlap, Crash Fault Tolerance
              (2f+1), Byzantine bounds (3f+1), and exact binomial cluster availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const active =
                n === preset.n &&
                w === preset.w &&
                r === preset.r &&
                crashed === preset.crashed;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1.5 border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                    {preset.label}
                  </div>
                  <div
                    className={`font-mono text-[9px] tabular-nums ${
                      active ? 'text-[#FB923C]' : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {preset.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Workbench Split: Controls + Live Oscilloscope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left 5 Columns: Calibrated Parameter Deck */}
          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--chassis)] p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ink)]/20">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ink)]">
                  Cluster Parameters
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] tabular-nums">
                  HEALTHY {dynamo.healthy}/{n}
                </span>
              </div>

              {/* Parameter N */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="bench-n"
                    className="font-mono text-xs uppercase tracking-wider text-[var(--ink)] font-medium"
                  >
                    Replicas (N)
                  </label>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">
                    N = {n}
                  </span>
                </div>
                <input
                  id="bench-n"
                  type="range"
                  min={3}
                  max={11}
                  step={1}
                  value={n}
                  onChange={(e) => handleSetN(Number(e.target.value))}
                  className="w-full accent-[var(--signal)] cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-[var(--ink-muted)] mt-0.5 tabular-nums">
                  <span>3</span>
                  <span>5</span>
                  <span>7</span>
                  <span>9</span>
                  <span>11</span>
                </div>
              </div>

              {/* Parameter W */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="bench-w"
                    className="font-mono text-xs uppercase tracking-wider text-[var(--cobalt)] font-medium"
                  >
                    Write Quorum (W)
                  </label>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--cobalt)]">
                    W = {w}
                  </span>
                </div>
                <input
                  id="bench-w"
                  type="range"
                  min={1}
                  max={n}
                  step={1}
                  value={w}
                  onChange={(e) => setW(Number(e.target.value))}
                  className="w-full accent-[var(--cobalt)] cursor-pointer"
                />
              </div>

              {/* Parameter R */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="bench-r"
                    className="font-mono text-xs uppercase tracking-wider text-[var(--ochre)] font-medium"
                  >
                    Read Quorum (R)
                  </label>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--ochre)]">
                    R = {r}
                  </span>
                </div>
                <input
                  id="bench-r"
                  type="range"
                  min={1}
                  max={n}
                  step={1}
                  value={r}
                  onChange={(e) => setR(Number(e.target.value))}
                  className="w-full accent-[var(--ochre)] cursor-pointer"
                />
              </div>

              {/* Simulated Crashed Nodes */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="bench-crashed"
                    className="font-mono text-xs uppercase tracking-wider text-[var(--signal)] font-medium"
                  >
                    Simulated Crashes (c)
                  </label>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--signal)]">
                    c = {crashed}
                  </span>
                </div>
                <input
                  id="bench-crashed"
                  type="range"
                  min={0}
                  max={n - 1}
                  step={1}
                  value={crashed}
                  onChange={(e) => setCrashed(Number(e.target.value))}
                  className="w-full accent-[var(--signal)] cursor-pointer"
                />
              </div>

              {/* Per-Node Uptime Selector */}
              <div className="pt-2 border-t border-[var(--rule)]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink)] font-medium">
                    Per-Node Uptime (p)
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--ink-secondary)]">
                    {(nodeAvailability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {UPTIME_OPTIONS.map((opt) => {
                    const active = nodeAvailability === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setNodeAvailability(opt.value)}
                        className={`py-1.5 border font-mono text-xs tabular-nums cursor-pointer transition-colors ${
                          active
                            ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] font-semibold'
                            : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Quorum Verdict Strip */}
            <div
              className={`p-3.5 border ${
                dynamo.stronglyConsistent
                  ? 'bg-[var(--emerald)]/10 border-[var(--emerald)] text-[var(--ink)]'
                  : 'bg-[var(--signal)]/10 border-[var(--signal)] text-[var(--ink)]'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-semibold">
                {dynamo.stronglyConsistent ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[var(--emerald)] flex-shrink-0" />
                    <span className="text-[var(--emerald)]">
                      W + R = {w + r} &gt; {n} · STRICT OVERLAP ({dynamo.minOverlap} NODE
                      {dynamo.minOverlap === 1 ? '' : 'S'})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[var(--signal)] flex-shrink-0" />
                    <span className="text-[var(--signal)]">
                      W + R = {w + r} ≤ {n} · STALE READ WINDOW POSSIBLE
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">
                {dynamo.stronglyConsistent
                  ? `By the pigeonhole principle, any write quorum (${w}) and read quorum (${r}) must share at least ${dynamo.minOverlap} replica${dynamo.minOverlap === 1 ? '' : 's'}, ensuring reads observe the latest committed version.`
                  : `Write set (${w}) and read set (${r}) can be completely disjoint, so a read can return an older version until background anti-entropy or read repair catches up.`}
              </p>
            </div>
          </div>

          {/* Right 7 Columns: Recessed Obsidian Oscilloscope */}
          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
                  WORST-CASE QUORUM INTERSECTION TOPOLOGY
                </div>
                <h2 className="font-editorial text-xl text-[var(--ink)]">
                  N={n} Ring · Write Set ({w}) vs. Read Set ({r})
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
                  Overlap ({dynamo.minOverlap})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                  Write
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
                  Read
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  Crashed ({crashed})
                </span>
              </div>
            </div>

            <div className="scope-viewport flex-1 min-h-[380px] relative">
              <svg
                viewBox="0 0 720 500"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                role="img"
                aria-label={`Quorum ring with ${n} replicas, write quorum ${w}, read quorum ${r}, and ${crashed} crashed nodes`}
              >
                <ScopeDefs idPrefix="bench-scope" />

                {/* Calibrated Reference Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={ringRadius}
                  fill="none"
                  stroke={SCOPE_COLORS.hairline}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Write Set Chord Web (Cobalt) */}
                {writeNodes.map((a, i) =>
                  writeNodes.slice(i + 1).map((b) => (
                    <line
                      key={`w-${a.id}-${b.id}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={SCOPE_COLORS.cobalt}
                      strokeOpacity="0.22"
                      strokeWidth="1.5"
                    />
                  ))
                )}

                {/* Read Set Chord Web (Amber) */}
                {readNodes.map((a, i) =>
                  readNodes.slice(i + 1).map((b) => (
                    <line
                      key={`r-${a.id}-${b.id}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={SCOPE_COLORS.amber}
                      strokeOpacity="0.22"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  ))
                )}

                {/* Center Telemetry Readout */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={66}
                  fill="#141816"
                  stroke={dynamo.stronglyConsistent ? SCOPE_COLORS.emerald : SCOPE_COLORS.signal}
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy - 18}
                  textAnchor="middle"
                  fill={SCOPE_COLORS.inkMuted}
                  fontSize="10"
                  letterSpacing="0.12em"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  W + R vs N
                </text>
                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  fill={dynamo.stronglyConsistent ? SCOPE_COLORS.emerald : SCOPE_COLORS.signal}
                  fontSize="22"
                  fontWeight="700"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  {w + r} {dynamo.stronglyConsistent ? '>' : '≤'} {n}
                </text>
                <text
                  x={cx}
                  y={cy + 30}
                  textAnchor="middle"
                  fill={SCOPE_COLORS.inkLight}
                  fontSize="10"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  {dynamo.stronglyConsistent
                    ? `∩ ≥ ${dynamo.minOverlap} REPLICA${dynamo.minOverlap === 1 ? '' : 'S'}`
                    : 'ZERO OVERLAP'}
                </text>

                {/* Replica Nodes */}
                {positionedNodes.map((node) => {
                  const accent =
                    node.role === 'failed'
                      ? SCOPE_COLORS.danger
                      : node.role === 'overlap'
                      ? SCOPE_COLORS.emerald
                      : node.role === 'write-only'
                      ? SCOPE_COLORS.cobalt
                      : node.role === 'read-only'
                      ? SCOPE_COLORS.amber
                      : SCOPE_COLORS.inkMuted;

                  const sublabel =
                    node.role === 'failed'
                      ? 'DOWN'
                      : node.role === 'overlap'
                      ? 'W ∩ R'
                      : node.role === 'write-only'
                      ? 'WRITE'
                      : node.role === 'read-only'
                      ? 'READ'
                      : 'IDLE';

                  const topTag =
                    node.role === 'failed'
                      ? 'CRASHED'
                      : node.role === 'overlap'
                      ? 'OVERLAP'
                      : undefined;

                  return (
                    <ScopeNode
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      radius={n >= 9 ? 26 : 31}
                      label={node.id}
                      sublabel={sublabel}
                      topTag={topTag}
                      accentColor={accent}
                      failed={node.failed}
                      highlighted={node.role === 'overlap'}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="px-4 py-3 border-t border-[var(--rule)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[var(--ink-secondary)]">
              <span>
                Write status ({dynamo.healthy} up vs W={w}):{' '}
                <strong className={dynamo.canWriteNow ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'}>
                  {dynamo.canWriteNow ? 'WRITABLE' : 'BLOCKED'}
                </strong>
              </span>
              <span>
                Read status ({dynamo.healthy} up vs R={r}):{' '}
                <strong className={dynamo.canReadNow ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'}>
                  {dynamo.canReadNow ? 'READABLE' : 'BLOCKED'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Column Protocol Engineering Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Dynamo Tunable Quorum */}
          <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
                  MODEL 01 · LEADERLESS STORAGE
                </div>
                <h3 className="font-editorial text-2xl text-[var(--ink)]">Dynamo Quorum</h3>
              </div>
              <Link
                href="/quorum-replication"
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
              >
                Plate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 font-mono text-xs">
              <MetricRow
                label="Consistency Rule"
                value={dynamo.stronglyConsistent ? 'W + R > N (Strong)' : 'W + R ≤ N (Eventual)'}
                ok={dynamo.stronglyConsistent}
              />
              <MetricRow
                label="Guaranteed Overlap"
                value={`${dynamo.minOverlap} replica${dynamo.minOverlap === 1 ? '' : 's'}`}
              />
              <MetricRow
                label="Write Fault Tolerance"
                value={`N - W = ${dynamo.writeFaultTolerance} crashes`}
              />
              <MetricRow
                label="Read Fault Tolerance"
                value={`N - R = ${dynamo.readFaultTolerance} crashes`}
              />
              <MetricRow
                label={`Write Avail (p=${(nodeAvailability * 100).toFixed(1)}%)`}
                value={formatAvailabilityPercent(dynamo.writeAvailability)}
                ok={dynamo.canWriteNow}
              />
              <MetricRow
                label={`Read Avail (p=${(nodeAvailability * 100).toFixed(1)}%)`}
                value={formatAvailabilityPercent(dynamo.readAvailability)}
                ok={dynamo.canReadNow}
              />
            </div>
          </section>

          {/* Card 2: Crash Fault Tolerance (Raft / Paxos) */}
          <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
                  MODEL 02 · CRASH CONSENSUS (CFT)
                </div>
                <h3 className="font-editorial text-2xl text-[var(--ink)]">Raft &amp; Paxos</h3>
              </div>
              <Link
                href="/raft"
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
              >
                Plate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 font-mono text-xs">
              <MetricRow
                label="Majority Quorum"
                value={`⌊${n}/2⌋ + 1 = ${cft.majorityQuorum} nodes`}
              />
              <MetricRow
                label="Max Crash Faults (f)"
                value={`f = ${cft.maxFaults} (2f + 1 ≤ N)`}
              />
              <MetricRow
                label="Live Quorum Status"
                value={
                  cft.hasQuorumNow
                    ? `ONLINE (${cft.healthy}/${cft.majorityQuorum} req)`
                    : `STALLED (${cft.healthy}/${cft.majorityQuorum} req)`
                }
                ok={cft.hasQuorumNow}
              />
              <MetricRow
                label={`Cluster Avail (p=${(nodeAvailability * 100).toFixed(1)}%)`}
                value={formatAvailabilityPercent(cft.clusterAvailability)}
              />

              {cft.wastedEvenNode ? (
                <div className="p-2.5 bg-[var(--signal)]/10 border border-[var(--signal)] text-[11px] font-sans text-[var(--ink-secondary)] leading-relaxed">
                  <strong className="font-mono text-[10px] uppercase text-[var(--signal)] block mb-0.5">
                    Even-Node Penalty (N={n})
                  </strong>
                  Adding a {n}th node does NOT increase fault tolerance beyond f={cft.maxFaults}, yet
                  raises quorum to {cft.majorityQuorum} and lowers overall availability compared to
                  N={n - 1}.
                </div>
              ) : (
                <div className="p-2.5 bg-[var(--emerald)]/10 border border-[var(--emerald)] text-[11px] font-sans text-[var(--ink-secondary)] leading-relaxed">
                  <strong className="font-mono text-[10px] uppercase text-[var(--emerald)] block mb-0.5">
                    Optimal Odd Sizing (N={n})
                  </strong>
                  Every node contributes to fault tolerance: survives up to f={cft.maxFaults} crash
                  {cft.maxFaults === 1 ? '' : 'es'} while maintaining a strict leader majority.
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Byzantine Fault Tolerance (PBFT) */}
          <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--emerald)] font-semibold">
                  MODEL 03 · BYZANTINE CONSENSUS (BFT)
                </div>
                <h3 className="font-editorial text-2xl text-[var(--ink)]">PBFT (3f + 1)</h3>
              </div>
              <Link
                href="/pbft"
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
              >
                Plate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 font-mono text-xs">
              <MetricRow
                label="Max Malicious Faults"
                value={`f = ${bft.maxByzantineFaults} (⌊(N-1)/3⌋)`}
                ok={bft.maxByzantineFaults >= 1}
              />
              <MetricRow
                label="BFT Quorum Size"
                value={`Q = ${bft.quorumSize} (N - f)`}
              />
              <MetricRow
                label="Quorum Intersection"
                value={`2Q - N = ${bft.intersectionSize} (≥ ${bft.honestOverlap} honest)`}
              />
              <MetricRow
                label="Live BFT Liveness"
                value={
                  bft.hasQuorumNow
                    ? `ONLINE (${bft.healthy}/${bft.quorumSize} req)`
                    : `HALTED (${bft.healthy}/${bft.quorumSize} req)`
                }
                ok={bft.hasQuorumNow}
              />
              <MetricRow
                label={`Cluster Avail (p=${(nodeAvailability * 100).toFixed(1)}%)`}
                value={formatAvailabilityPercent(bft.clusterAvailability)}
              />
              <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)] text-[11px] font-sans text-[var(--ink-secondary)] leading-relaxed">
                {bft.maxByzantineFaults === 0 ? (
                  <>
                    With N={n}, Byzantine safety cannot tolerate any liar (f=0). Add{' '}
                    {bft.minNodesForNextF - n} node{bft.minNodesForNextF - n === 1 ? '' : 's'} to
                    reach N=4 (f=1).
                  </>
                ) : (
                  <>
                    Any two BFT quorums intersect in {bft.intersectionSize} nodes — even if all f=
                    {bft.maxByzantineFaults} Byzantine nodes equivocate, at least{' '}
                    <strong>{bft.honestOverlap} honest</strong> replica{bft.honestOverlap === 1 ? '' : 's'}{' '}
                    preserve safety. Next tier (f={bft.maxByzantineFaults + 1}) requires N=
                    {bft.minNodesForNextF}.
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--rule)] last:border-b-0">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-[var(--ink)]">
        {ok === true && <Check className="w-3.5 h-3.5 text-[var(--emerald)]" />}
        {ok === false && <X className="w-3.5 h-3.5 text-[var(--signal)]" />}
        {value}
      </span>
    </div>
  );
}
