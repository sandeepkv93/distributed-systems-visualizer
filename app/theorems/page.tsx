'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  DEFAULT_ASSUMPTIONS,
  FaultModel,
  PACELC_SYSTEMS,
  PacelcClass,
  SynchronyModel,
  SystemAssumptions,
  THEOREMS,
  TheoremId,
  evaluateSystemAssumptions,
} from '@/lib/theorems';

export default function TheoremsLabPage() {
  const [assumptions, setAssumptions] = useState<SystemAssumptions>(DEFAULT_ASSUMPTIONS);
  const [selectedTheoremId, setSelectedTheoremId] = useState<TheoremId>('flp');
  const [pacelcFilter, setPacelcFilter] = useState<PacelcClass | 'ALL'>('ALL');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const thmParam = new URLSearchParams(window.location.search).get('theorem');
    if (thmParam && THEOREMS.some((t) => t.id === thmParam)) {
      const timer = setTimeout(() => setSelectedTheoremId(thmParam as TheoremId), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const summary = useMemo(() => evaluateSystemAssumptions(assumptions), [assumptions]);
  const activeTheorem = useMemo(
    () => THEOREMS.find((t) => t.id === selectedTheoremId) ?? THEOREMS[0],
    [selectedTheoremId]
  );
  const activeEval = useMemo(
    () => summary.evaluations.find((e) => e.theoremId === activeTheorem.id)!,
    [summary, activeTheorem]
  );

  const filteredPacelc = useMemo(
    () =>
      pacelcFilter === 'ALL'
        ? PACELC_SYSTEMS
        : PACELC_SYSTEMS.filter((s) => s.classification === pacelcFilter),
    [pacelcFilter]
  );

  const triggeredCount = summary.evaluations.filter((e) => e.status === 'triggered').length;

  const applyPreset = (preset: 'flp-trap' | 'raft-prod' | 'bft-under' | 'crdt-calm') => {
    if (preset === 'flp-trap') {
      setAssumptions({
        synchrony: 'asynchronous',
        faultModel: 'crash',
        partitioned: true,
        monotonic: false,
        nodes: 5,
        faults: 1,
      });
      setSelectedTheoremId('flp');
    } else if (preset === 'raft-prod') {
      setAssumptions({
        synchrony: 'partial-sync',
        faultModel: 'crash',
        partitioned: false,
        monotonic: false,
        nodes: 5,
        faults: 2,
      });
      setSelectedTheoremId('cft-2f1');
    } else if (preset === 'bft-under') {
      setAssumptions({
        synchrony: 'partial-sync',
        faultModel: 'byzantine',
        partitioned: false,
        monotonic: false,
        nodes: 6,
        faults: 2,
      });
      setSelectedTheoremId('bft-3f1');
    } else {
      setAssumptions({
        synchrony: 'asynchronous',
        faultModel: 'crash',
        partitioned: true,
        monotonic: true,
        nodes: 5,
        faults: 2,
      });
      setSelectedTheoremId('calm');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · FOUNDATIONAL IMPOSSIBILITY &amp; PACELC LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/cap-theorem" className="text-[var(--signal)] hover:underline">
              Plate 01 · CAP Theorem →
            </Link>
            <Link href="/consistency" className="text-[var(--cobalt)] hover:underline">
              Consistency Anomalies →
            </Link>
            <Link href="/bench" className="text-[var(--emerald)] hover:underline">
              Quorum Workbench →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Impossibility Theorems &amp; PACELC Bounds
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Toggle formal network and fault assumptions to test when{' '}
              <strong className="text-[var(--ink)]">FLP</strong>,{' '}
              <strong className="text-[var(--ink)]">CAP / PACELC</strong>,{' '}
              <strong className="text-[var(--ink)]">2f+1 / 3f+1 quorum bounds</strong>,{' '}
              <strong className="text-[var(--ink)]">CALM monotonicity</strong>, and{' '}
              <strong className="text-[var(--ink)]">clock-sync bounds</strong> forbid a design—and
              inspect the exact escape hatch used by production protocols.
            </p>
          </div>

          {/* Live Feasibility Readout */}
          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Consensus
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  summary.deterministicConsensusPossible
                    ? 'text-[var(--emerald)]'
                    : 'text-[var(--signal)]'
                }`}
              >
                {summary.deterministicConsensusPossible ? 'FEASIBLE' : 'BLOCKED'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Min Nodes
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  summary.quorumSafetyHolds ? 'text-[var(--cobalt)]' : 'text-[var(--signal)]'
                }`}
              >
                N ≥ {summary.minNodesRequired}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Triggered
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--ink)]">
                {triggeredCount} / {THEOREMS.length}
              </div>
            </div>
          </div>
        </header>

        {/* Interactive Assumption Control Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Formal System Model Assumptions</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className="text-[var(--ink-muted)] uppercase">Presets:</span>
              {[
                { id: 'flp-trap', label: 'FLP Async Trap' },
                { id: 'raft-prod', label: 'Raft 5-Node CFT' },
                { id: 'bft-under', label: 'Under-Sized BFT' },
                { id: 'crdt-calm', label: 'CALM Monotonic CRDT' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    applyPreset(p.id as 'flp-trap' | 'raft-prod' | 'bft-under' | 'crdt-calm')
                  }
                  className="px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] text-[var(--ink)] uppercase tracking-wider transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Synchrony */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Timing / Synchrony Model
              </label>
              <div className="grid grid-cols-3 border border-[var(--rule)] divide-x divide-[var(--rule)]">
                {(
                  [
                    { id: 'asynchronous', label: 'Async' },
                    { id: 'partial-sync', label: 'Partial' },
                    { id: 'synchronous', label: 'Sync Δ' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setAssumptions((prev) => ({
                        ...prev,
                        synchrony: opt.id as SynchronyModel,
                      }))
                    }
                    className={`py-2 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      assumptions.synchrony === opt.id
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'bg-[var(--paper)] text-[var(--ink-secondary)] hover:bg-[var(--paper-elevated)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fault Model */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Adversary / Fault Model
              </label>
              <div className="grid grid-cols-3 border border-[var(--rule)] divide-x divide-[var(--rule)]">
                {(
                  [
                    { id: 'none', label: 'Fault-Free' },
                    { id: 'crash', label: 'Crash' },
                    { id: 'byzantine', label: 'Byzantine' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setAssumptions((prev) => ({
                        ...prev,
                        faultModel: opt.id as FaultModel,
                      }))
                    }
                    className={`py-2 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      assumptions.faultModel === opt.id
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'bg-[var(--paper)] text-[var(--ink-secondary)] hover:bg-[var(--paper-elevated)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Partition & Monotonicity toggles */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Network State
              </label>
              <button
                onClick={() =>
                  setAssumptions((prev) => ({ ...prev, partitioned: !prev.partitioned }))
                }
                className={`w-full py-2 px-3 border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  assumptions.partitioned
                    ? 'border-[var(--signal)] bg-[var(--signal)] text-[var(--paper)] font-semibold'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)]'
                }`}
              >
                {assumptions.partitioned ? 'Partition Active (P)' : 'Healthy Network (E)'}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Program Logic
              </label>
              <button
                onClick={() =>
                  setAssumptions((prev) => ({ ...prev, monotonic: !prev.monotonic }))
                }
                className={`w-full py-2 px-3 border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  assumptions.monotonic
                    ? 'border-[var(--emerald)] bg-[var(--emerald)] text-[var(--paper)] font-semibold'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)]'
                }`}
              >
                {assumptions.monotonic ? 'Monotonic (CALM)' : 'Non-Monotonic'}
              </button>
            </div>
          </div>

          {/* Cluster N and Faults f sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4 pt-4 border-t border-[var(--rule)]">
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Cluster Size (N)</span>
                <span className="font-semibold text-[var(--ink)]">{assumptions.nodes} nodes</span>
              </div>
              <input
                type="range"
                aria-label="Cluster Size (N nodes)"
                min={3}
                max={10}
                value={assumptions.nodes}
                onChange={(e) =>
                  setAssumptions((prev) => ({ ...prev, nodes: Number(e.target.value) }))
                }
                className="w-full accent-[#D9441E]"
              />
            </div>
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Tolerated Faults (f)</span>
                <span className="font-semibold text-[var(--ink)]">f = {assumptions.faults}</span>
              </div>
              <input
                type="range"
                aria-label="Tolerated Faults (f)"
                min={0}
                max={3}
                value={assumptions.faults}
                onChange={(e) =>
                  setAssumptions((prev) => ({ ...prev, faults: Number(e.target.value) }))
                }
                className="w-full accent-[#1D4B8F]"
              />
            </div>
          </div>
        </section>

        {/* Main 12-Col Theorem Explorer & Interactive Proof Oscilloscope */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Left 5-col: 6 Theorem Trigger Cards */}
          <div className="lg:col-span-5 space-y-2.5">
            {THEOREMS.map((thm) => {
              const ev = summary.evaluations.find((e) => e.theoremId === thm.id)!;
              const isSelected = thm.id === activeTheorem.id;
              return (
                <button
                  key={thm.id}
                  onClick={() => setSelectedTheoremId(thm.id)}
                  className={`w-full text-left p-4 border transition-colors ${
                    isSelected
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider mb-1">
                    <span className={isSelected ? 'text-[#F4F0E8]/70' : 'text-[var(--ink-muted)]'}>
                      {thm.code} · {thm.year}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 font-semibold ${
                        ev.status === 'triggered'
                          ? 'bg-[#D9441E] text-[#F4F0E8]'
                          : ev.status === 'circumvented'
                          ? 'bg-[#1D4B8F] text-[#F4F0E8]'
                          : 'bg-[#0F6B50] text-[#F4F0E8]'
                      }`}
                    >
                      {ev.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-editorial text-lg leading-tight mb-1">{thm.name}</div>
                  <div
                    className={`font-mono text-[10px] leading-snug ${
                      isSelected ? 'text-[#F4F0E8]/80' : 'text-[var(--ink-secondary)]'
                    }`}
                  >
                    {ev.headline}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 7-col: Deep Theorem Proof Oscilloscope & Details */}
          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="p-5 border-b border-[var(--rule)]">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
                <span>
                  {activeTheorem.code} · {activeTheorem.authors} ({activeTheorem.year})
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    activeEval.status === 'triggered'
                      ? 'text-[var(--signal)]'
                      : activeEval.status === 'circumvented'
                      ? 'text-[var(--cobalt)]'
                      : 'text-[var(--emerald)]'
                  }`}
                >
                  {activeEval.status === 'triggered' ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {activeEval.headline}
                </span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl mb-2">{activeTheorem.name}</h2>
              <p className="font-mono text-xs leading-relaxed p-3 bg-[var(--paper)] border-l-2 border-[var(--signal)] text-[var(--ink)]">
                {activeTheorem.formalStatement}
              </p>
            </div>

            {/* Dark Obsidian SVG Proof / Counterexample Plate */}
            <div className="bg-[#111413] p-4 border-b border-[var(--rule)]">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-2">
                <span>COUNTEREXAMPLE &amp; BOUND SCHEMATIC</span>
                <span>
                  N={assumptions.nodes} · f={assumptions.faults} · {assumptions.synchrony.toUpperCase()}
                </span>
              </div>

              {activeTheorem.visualMode === 'flp-tree' && (
                <svg viewBox="0 0 680 230" className="w-full h-auto">
                  <rect x="0" y="0" width="680" height="230" fill="#111413" />
                  {/* Bivalent path */}
                  <line x1="110" y1="115" x2="270" y2="65" stroke="#60A5FA" strokeWidth="2" />
                  <line x1="110" y1="115" x2="270" y2="165" stroke="#D9441E" strokeWidth="2.5" />
                  <line x1="270" y1="165" x2="450" y2="115" stroke="#D9441E" strokeWidth="2.5" strokeDasharray="5 4" />
                  <line x1="270" y1="165" x2="450" y2="195" stroke="#34D399" strokeWidth="2" />
                  <line x1="450" y1="115" x2="600" y2="115" stroke="#D9441E" strokeWidth="2.5" strokeDasharray="4 4" />

                  <circle cx="110" cy="115" r="24" fill="#181C1B" stroke="#FBBF24" strokeWidth="2" />
                  <text x="110" y="113" textAnchor="middle" fill="#F4F0E8" fontSize="11" fontFamily="monospace">C₀</text>
                  <text x="110" y="126" textAnchor="middle" fill="#FBBF24" fontSize="8" fontFamily="monospace">BIVALENT</text>

                  <circle cx="270" cy="65" r="20" fill="#181C1B" stroke="#60A5FA" strokeWidth="1.8" />
                  <text x="270" y="69" textAnchor="middle" fill="#60A5FA" fontSize="10" fontFamily="monospace">0-VAL</text>

                  <circle cx="270" cy="165" r="24" fill="#181C1B" stroke="#D9441E" strokeWidth="2" />
                  <text x="270" y="163" textAnchor="middle" fill="#F4F0E8" fontSize="11" fontFamily="monospace">C₁</text>
                  <text x="270" y="176" textAnchor="middle" fill="#D9441E" fontSize="8" fontFamily="monospace">BIVALENT</text>

                  <circle cx="450" cy="115" r="24" fill="#181C1B" stroke="#D9441E" strokeWidth="2" />
                  <text x="450" y="113" textAnchor="middle" fill="#F4F0E8" fontSize="11" fontFamily="monospace">C₂</text>
                  <text x="450" y="126" textAnchor="middle" fill="#D9441E" fontSize="8" fontFamily="monospace">BIVALENT</text>

                  <circle cx="450" cy="195" r="20" fill="#181C1B" stroke="#34D399" strokeWidth="1.8" />
                  <text x="450" y="199" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace">1-VAL</text>

                  <rect x="556" y="95" width="108" height="40" fill="#1E1816" stroke="#D9441E" strokeWidth="1.5" />
                  <text x="610" y="113" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">C∞ (NO DECIDE)</text>
                  <text x="610" y="126" textAnchor="middle" fill="#D9441E" fontSize="8" fontFamily="monospace">DELAYED MSG e</text>

                  <text x="190" y="156" textAnchor="middle" fill="#FBBF24" fontSize="9" fontFamily="monospace">delay e</text>
                  <text x="360" y="128" textAnchor="middle" fill="#FBBF24" fontSize="9" fontFamily="monospace">adversary schedule</text>
                  <text x="340" y="24" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">
                    {assumptions.synchrony === 'asynchronous'
                      ? 'ASYNC ADVERSARY KEEPS EXECUTION BIVALENT FOREVER'
                      : 'TIMEOUT / GST BREAKS BIVALENT DELAY SCHEDULE'}
                  </text>
                </svg>
              )}

              {activeTheorem.visualMode === 'pacelc-matrix' && (
                <svg viewBox="0 0 680 230" className="w-full h-auto">
                  <rect x="0" y="0" width="680" height="230" fill="#111413" />
                  {/* 2x2 PACELC Quadrant Grid */}
                  <rect x="110" y="34" width="250" height="82" fill="#181D1C" stroke="#34D399" strokeWidth="1.2" />
                  <rect x="360" y="34" width="250" height="82" fill="#181B20" stroke="#60A5FA" strokeWidth="1.2" />
                  <rect x="110" y="116" width="250" height="82" fill="#1C1917" stroke="#FBBF24" strokeWidth="1.2" />
                  <rect x="360" y="116" width="250" height="82" fill="#211614" stroke="#D9441E" strokeWidth="1.5" />

                  <text x="235" y="24" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">ELSE: LOW LATENCY (EL)</text>
                  <text x="485" y="24" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">ELSE: CONSISTENCY (EC)</text>
                  <text x="58" y="79" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">PARTITION: A</text>
                  <text x="58" y="161" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">PARTITION: C</text>

                  <text x="235" y="64" textAnchor="middle" fill="#34D399" fontSize="12" fontFamily="monospace" fontWeight="bold">PA / EL</text>
                  <text x="235" y="84" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">DynamoDB · Cassandra · CRDTs</text>

                  <text x="485" y="64" textAnchor="middle" fill="#60A5FA" fontSize="12" fontFamily="monospace" fontWeight="bold">PA / EC</text>
                  <text x="485" y="84" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">MongoDB (Secondary Read)</text>

                  <text x="235" y="146" textAnchor="middle" fill="#FBBF24" fontSize="12" fontFamily="monospace" fontWeight="bold">PC / EL</text>
                  <text x="235" y="166" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">Yahoo! PNUTS</text>

                  <text x="485" y="146" textAnchor="middle" fill="#D9441E" fontSize="12" fontFamily="monospace" fontWeight="bold">PC / EC</text>
                  <text x="485" y="166" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">Spanner · CockroachDB · etcd</text>

                  <text x="360" y="218" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">
                    {assumptions.partitioned
                      ? 'ACTIVE REGIME: PARTITION (P) → CHOOSE TOP ROW (PA) OR BOTTOM ROW (PC)'
                      : 'ACTIVE REGIME: NORMAL (E) → CHOOSE LEFT COL (EL) OR RIGHT COL (EC)'}
                  </text>
                </svg>
              )}

              {activeTheorem.visualMode === 'quorum-bounds' && (
                <svg viewBox="0 0 680 230" className="w-full h-auto">
                  <rect x="0" y="0" width="680" height="230" fill="#111413" />
                  {/* Quorum Venn intersection diagram */}
                  <circle cx="255" cy="115" r="76" fill="#1D4B8F" fillOpacity="0.22" stroke="#60A5FA" strokeWidth="2" />
                  <circle cx="425" cy="115" r="76" fill="#0F6B50" fillOpacity="0.22" stroke="#34D399" strokeWidth="2" />
                  <text x="210" y="110" textAnchor="middle" fill="#60A5FA" fontSize="11" fontFamily="monospace">QUORUM Q₁</text>
                  <text x="210" y="126" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">
                    size {assumptions.faultModel === 'byzantine' ? 2 * assumptions.faults + 1 : assumptions.faults + 1}
                  </text>
                  <text x="470" y="110" textAnchor="middle" fill="#34D399" fontSize="11" fontFamily="monospace">QUORUM Q₂</text>
                  <text x="470" y="126" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">
                    size {assumptions.faultModel === 'byzantine' ? 2 * assumptions.faults + 1 : assumptions.faults + 1}
                  </text>

                  <text x="340" y="106" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    OVERLAP
                  </text>
                  <text x="340" y="124" textAnchor="middle" fill={summary.quorumSafetyHolds ? '#34D399' : '#D9441E'} fontSize="11" fontFamily="monospace">
                    {summary.quorumSafetyHolds ? '≥ 1 HONEST' : 'UNSAFE SPLIT'}
                  </text>
                  <text x="340" y="212" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">
                    CURRENT N={assumptions.nodes} vs REQUIRED N ≥ {summary.minNodesRequired} ({assumptions.faultModel.toUpperCase()}, f={assumptions.faults})
                  </text>
                </svg>
              )}

              {activeTheorem.visualMode === 'calm-lattice' && (
                <svg viewBox="0 0 680 230" className="w-full h-auto">
                  <rect x="0" y="0" width="680" height="230" fill="#111413" />
                  {/* Join-semilattice diagram */}
                  <line x1="340" y1="184" x2="210" y2="124" stroke="#34D399" strokeWidth="2" />
                  <line x1="340" y1="184" x2="470" y2="124" stroke="#34D399" strokeWidth="2" />
                  <line x1="210" y1="124" x2="340" y2="58" stroke="#60A5FA" strokeWidth="2" />
                  <line x1="470" y1="124" x2="340" y2="58" stroke="#60A5FA" strokeWidth="2" />

                  <rect x="285" y="168" width="110" height="30" fill="#181C1B" stroke="#9A968E" />
                  <text x="340" y="187" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">⊥ = {'{}'}</text>

                  <rect x="145" y="108" width="130" height="32" fill="#181C1B" stroke="#34D399" />
                  <text x="210" y="128" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace">Replica A: {'{x}'}</text>

                  <rect x="405" y="108" width="130" height="32" fill="#181C1B" stroke="#34D399" />
                  <text x="470" y="128" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace">Replica B: {'{y}'}</text>

                  <rect x="250" y="40" width="180" height="34" fill="#181C1B" stroke={assumptions.monotonic ? '#60A5FA' : '#D9441E'} strokeWidth="2" />
                  <text x="340" y="61" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">
                    {assumptions.monotonic ? 'A ⊔ B = {x, y} (NO LOCK)' : 'NON-MONOTONIC → BARRIER'}
                  </text>
                  <text x="340" y="220" textAnchor="middle" fill="#9A968E" fontSize="10" fontFamily="monospace">
                    {assumptions.monotonic
                      ? 'CALM: ASSOCIATIVE · COMMUTATIVE · IDEMPOTENT MERGE CONVERGES WITHOUT CONSENSUS'
                      : 'NEGATION / UNIQUENESS / DEBIT REQUIRES COORDINATION ACROSS REPLICAS'}
                  </text>
                </svg>
              )}
            </div>

            {/* Proof Sketch + Plain English + Escape Hatch */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 border border-[var(--rule)] bg-[var(--paper)]">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                    Intuition
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                    {activeTheorem.plainEnglish}
                  </p>
                </div>
                <div className="p-3.5 border border-[var(--rule)] bg-[var(--paper)]">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--emerald)] mb-1">
                    Production Escape Hatch
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                    {activeTheorem.escapeHatch}
                  </p>
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  4-Step Proof / Counterexample Outline
                </div>
                <ol className="space-y-1.5">
                  {activeTheorem.proofSketch.map((step, idx) => (
                    <li
                      key={step}
                      className="flex items-start gap-2.5 text-xs text-[var(--ink-secondary)] leading-relaxed"
                    >
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--rule)] text-[var(--ink)]">
                        0{idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Linked Atlas Plates */}
              <div className="pt-3 border-t border-[var(--rule)] flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mr-1">
                  Inspect Live Plates:
                </span>
                {activeTheorem.conceptIds.map((cid) => {
                  const concept = CONCEPTS_CATALOG.find((c) => c.id === cid);
                  if (!concept) return null;
                  return (
                    <Link
                      key={cid}
                      href={concept.path}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--ink)] hover:text-[var(--paper)] font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <span>{concept.name}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* PACELC Production Systems Classification Matrix */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[var(--cobalt)]" />
              <h2 className="font-editorial text-2xl">PACELC Real-World Systems Matrix</h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
              {(['ALL', 'PA/EL', 'PA/EC', 'PC/EL', 'PC/EC'] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setPacelcFilter(cls)}
                  className={`px-2.5 py-1 border uppercase tracking-wider transition-colors ${
                    pacelcFilter === cls
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPacelc.map((sys) => {
              const concept = CONCEPTS_CATALOG.find((c) => c.id === sys.conceptId);
              return (
                <div
                  key={sys.id}
                  className="p-4 border border-[var(--rule)] bg-[var(--paper)] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 ${
                          sys.classification === 'PC/EC'
                            ? 'bg-[#D9441E] text-[#F4F0E8]'
                            : sys.classification === 'PA/EL'
                            ? 'bg-[#0F6B50] text-[#F4F0E8]'
                            : 'bg-[#1D4B8F] text-[#F4F0E8]'
                        }`}
                      >
                        {sys.classification}
                      </span>
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                    </div>
                    <h3 className="font-editorial text-lg leading-snug mb-1">{sys.name}</h3>
                    <div className="font-mono text-[10px] text-[var(--ink-muted)] mb-2">
                      {sys.partitionChoice} · {sys.normalChoice}
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                      {sys.notes}
                    </p>
                  </div>
                  {concept && (
                    <Link
                      href={concept.path}
                      className="inline-flex items-center justify-between pt-2 border-t border-[var(--rule)] font-mono text-[10px] uppercase tracking-wider text-[var(--cobalt)] hover:underline"
                    >
                      <span>Simulate {concept.name}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
