'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  GitBranch,
  Layers,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  ISOLATION_ANOMALIES,
  ISOLATION_LEVELS,
  IsolationAnomalyId,
  IsolationLevelId,
  evaluateIsolationLevel,
  isAnomalyPrevented,
} from '@/lib/isolation-lab';

export default function IsolationLabPage() {
  const [selectedLevel, setSelectedLevel] = useState<IsolationLevelId>('snapshot-isolation');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<IsolationAnomalyId>('write-skew');
  const [visibleSteps, setVisibleSteps] = useState<number>(5);

  const levelEval = useMemo(() => evaluateIsolationLevel(selectedLevel), [selectedLevel]);
  const activeAnomaly = useMemo(
    () => ISOLATION_ANOMALIES.find((a) => a.id === selectedAnomalyId) ?? ISOLATION_ANOMALIES[5],
    [selectedAnomalyId]
  );
  const prevented = useMemo(
    () => isAnomalyPrevented(selectedLevel, activeAnomaly.id),
    [selectedLevel, activeAnomaly.id]
  );

  const shownSteps = activeAnomaly.steps.slice(0, visibleSteps);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME V · TRANSACTION ISOLATION LEVELS · MVCC &amp; WRITE-SKEW LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/consistency" className="text-[var(--cobalt)] hover:underline">
              Replication Consistency →
            </Link>
            <Link href="/two-phase-commit" className="text-[var(--signal)] hover:underline">
              Plate 16 · Two-Phase Commit →
            </Link>
            <Link href="/distributed-transactions" className="text-[var(--emerald)] hover:underline">
              Plate 17 · 3PC &amp; Sagas →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Transaction Isolation Levels &amp; MVCC Write Skew
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Step through six interleaved two-transaction histories across{' '}
              <strong className="text-[var(--ink)]">Read Uncommitted</strong> through{' '}
              <strong className="text-[var(--ink)]">Serializable (SSI)</strong>. Inspect MVCC
              version chains, see why{' '}
              <strong className="text-[var(--signal)]">Snapshot Isolation still permits Write Skew</strong>
              , and trace the Adya <span className="font-mono">rw</span>-antidependency cycles.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Active Level
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {levelEval.level.shortName}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Blocked
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--emerald)]">
                {levelEval.preventedCount} / {levelEval.totalAnomalies}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Active Trace
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  prevented ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                }`}
              >
                {prevented ? 'SAFE' : 'VULNERABLE'}
              </div>
            </div>
          </div>
        </header>

        {/* Isolation Level Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-3">
            Select Database Isolation Level (Weakest → Strongest)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
            {ISOLATION_LEVELS.map((lvl) => {
              const isSelected = lvl.id === selectedLevel;
              const ev = evaluateIsolationLevel(lvl.id);
              return (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`text-left p-3.5 border transition-colors ${
                    isSelected
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase mb-1">
                    <span className={isSelected ? 'text-[#FBBF24]' : 'text-[var(--cobalt)] font-semibold'}>
                      LVL 0{lvl.rank + 1} · {lvl.shortName}
                    </span>
                    <span className={isSelected ? 'text-[#34D399]' : 'text-[var(--ink-muted)]'}>
                      {ev.preventedCount}/6
                    </span>
                  </div>
                  <div className="font-editorial text-base leading-snug">{lvl.name}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[var(--rule)] text-xs">
            <div>
              <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)] block">
                Enforcement Mechanism
              </span>
              <span className="text-[var(--ink)]">{levelEval.level.mechanism}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)] block">
                Real-World Systems
              </span>
              <span className="text-[var(--cobalt)] font-mono">{levelEval.level.databases}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)] block">
                Guarantee Summary
              </span>
              <span className="text-[var(--ink-secondary)]">{levelEval.level.summary}</span>
            </div>
          </div>
        </section>

        {/* Main 12-Col Anomaly Explorer + MVCC Timeline & Adya Graph */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left 4-col: 6 Anomalies */}
          <div className="lg:col-span-4 space-y-2.5">
            {ISOLATION_ANOMALIES.map((anomaly) => {
              const isSelected = anomaly.id === activeAnomaly.id;
              const isSafe = isAnomalyPrevented(selectedLevel, anomaly.id);
              return (
                <button
                  key={anomaly.id}
                  onClick={() => {
                    setSelectedAnomalyId(anomaly.id);
                    setVisibleSteps(5);
                  }}
                  className={`w-full text-left p-3.5 border transition-colors ${
                    isSelected
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider mb-1">
                    <span className={isSelected ? 'text-[#F4F0E8]/70' : 'text-[var(--ink-muted)]'}>
                      ADYA {anomaly.adyaCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 font-semibold ${
                        isSafe
                          ? 'bg-[#0F6B50] text-[#F4F0E8]'
                          : 'bg-[#D9441E] text-[#F4F0E8]'
                      }`}
                    >
                      {isSafe ? 'PREVENTED' : 'PERMITTED'}
                    </span>
                  </div>
                  <div className="font-editorial text-lg leading-tight mb-1">{anomaly.name}</div>
                  <div
                    className={`text-[11px] leading-snug ${
                      isSelected ? 'text-[#F4F0E8]/75' : 'text-[var(--ink-secondary)]'
                    }`}
                  >
                    {anomaly.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 8-col: Interleaving Oscilloscope + MVCC + Adya Graph */}
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="p-5 border-b border-[var(--rule)] flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
                  ADYA {activeAnomaly.adyaCode} · INTERLEAVED SCHEDULE TRACE
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl">{activeAnomaly.name}</h2>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase font-semibold ${
                  prevented
                    ? 'bg-[#0F6B50] text-[#F4F0E8]'
                    : 'bg-[#D9441E] text-[#F4F0E8]'
                }`}
              >
                {prevented ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> BLOCKED AT {levelEval.level.shortName}
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" /> PERMITTED AT {levelEval.level.shortName}
                  </>
                )}
              </div>
            </div>

            {/* Step Scrubber */}
            <div className="px-5 py-3 bg-[var(--paper)] border-b border-[var(--rule)] flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
              <span className="uppercase text-[var(--ink-muted)]">
                Interleaving Step: {visibleSteps} / {activeAnomaly.steps.length}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setVisibleSteps(n)}
                    className={`w-7 h-7 border text-[11px] transition-colors ${
                      visibleSteps === n
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'border-[var(--rule)] bg-[var(--paper-elevated)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Obsidian Timeline SVG */}
            <div className="bg-[#111413] p-5 border-b border-[var(--rule)]">
              <svg viewBox="0 0 740 215" className="w-full h-auto">
                {/* Swimlanes T1 and T2 */}
                <line x1="72" y1="68" x2="710" y2="68" stroke="#2D3330" strokeWidth="2" />
                <line x1="72" y1="152" x2="710" y2="152" stroke="#2D3330" strokeWidth="2" />

                <rect x="16" y="50" width="44" height="36" fill="#171E26" stroke="#60A5FA" strokeWidth="1.5" />
                <text x="38" y="72" textAnchor="middle" fill="#60A5FA" fontSize="12" fontFamily="monospace" fontWeight="bold">T1</text>

                <rect x="16" y="134" width="44" height="36" fill="#1E1B16" stroke="#FBBF24" strokeWidth="1.5" />
                <text x="38" y="156" textAnchor="middle" fill="#FBBF24" fontSize="12" fontFamily="monospace" fontWeight="bold">T2</text>

                {shownSteps.map((step, idx) => {
                  const x = 128 + idx * 124;
                  const y = step.tx === 'T1' ? 68 : 152;
                  const color =
                    step.kind === 'conflict'
                      ? prevented
                        ? '#34D399'
                        : '#D9441E'
                      : step.kind === 'abort'
                      ? '#D9441E'
                      : step.kind === 'commit'
                      ? '#34D399'
                      : step.kind === 'write'
                      ? '#FBBF24'
                      : '#60A5FA';
                  return (
                    <g key={`${step.tx}-${step.t}`}>
                      <line x1={x} y1="22" x2={x} y2="192" stroke="#1E2321" strokeDasharray="3 3" />
                      <text x={x} y="16" textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                        t={step.t}
                      </text>
                      <rect
                        x={x - 55}
                        y={y - 22}
                        width="110"
                        height="44"
                        fill="#181C1B"
                        stroke={color}
                        strokeWidth={step.kind === 'conflict' ? '2.2' : '1.4'}
                      />
                      <text
                        x={x}
                        y={y - 4}
                        textAnchor="middle"
                        fill="#F4F0E8"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {step.op.length > 17 ? `${step.op.slice(0, 16)}…` : step.op}
                      </text>
                      <text
                        x={x}
                        y={y + 12}
                        textAnchor="middle"
                        fill={color}
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {step.kind === 'conflict' && prevented
                          ? 'ABORT / LOCKED'
                          : step.kind.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* MVCC Version Chain + Adya Dependency Graph */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-b border-[var(--rule)]">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  <Layers className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                  <span>MVCC Tuple Version Chain</span>
                </div>
                <div className="space-y-2">
                  {activeAnomaly.mvccVersions.map((v) => (
                    <div
                      key={`${v.key}-${v.version}`}
                      className="p-2.5 bg-[var(--paper)] border border-[var(--rule)] flex items-center justify-between font-mono text-xs"
                    >
                      <span>
                        <strong className="text-[var(--ink)]">{v.key}</strong>{' '}
                        <span className="text-[var(--ink-muted)]">({v.version})</span> ={' '}
                        <span className="text-[var(--cobalt)]">{v.value}</span>
                      </span>
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.5 ${
                          v.state === 'aborted'
                            ? 'bg-[#D9441E] text-[#F4F0E8]'
                            : 'bg-[var(--ink)] text-[var(--paper)]'
                        }`}
                      >
                        {v.tx} · {v.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  <GitBranch className="w-3.5 h-3.5 text-[var(--signal)]" />
                  <span>Adya Serialization Graph ({activeAnomaly.hasCycle ? 'CYCLE DETECTED' : 'ACYCLIC'})</span>
                </div>
                <div className="space-y-2">
                  {activeAnomaly.adyaEdges.map((edge) => (
                    <div
                      key={`${edge.from}-${edge.to}-${edge.label}`}
                      className="p-2.5 bg-[var(--paper)] border border-[var(--rule)] text-xs"
                    >
                      <div className="font-mono text-[11px] font-semibold text-[var(--signal)]">
                        {edge.from} ──[{edge.dep}]──▶ {edge.to}
                      </div>
                      <div className="text-[var(--ink-secondary)] mt-0.5">{edge.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mitigation + Plate Links */}
            <div className="p-5 space-y-3">
              <div className="p-3.5 bg-[var(--paper)] border-l-2 border-[var(--emerald)] text-xs text-[var(--ink-secondary)] leading-relaxed">
                <strong className="font-mono text-[10px] uppercase text-[var(--emerald)] block mb-1">
                  Production Mitigation
                </strong>
                {activeAnomaly.mitigation}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Related Plates:
                </span>
                {activeAnomaly.conceptIds.map((cid) => {
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

        {/* Full 5 x 6 Isolation Matrix Table */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 overflow-x-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
            Interactive Reference Matrix
          </div>
          <h2 className="font-editorial text-2xl mb-4">
            Isolation Levels × Concurrency Anomalies (Click Any Cell)
          </h2>
          <table className="w-full text-left border-collapse font-mono text-xs min-w-[720px]">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                <th className="py-2.5 pr-4">Isolation Level</th>
                {ISOLATION_ANOMALIES.map((a) => (
                  <th key={a.id} className="py-2.5 px-2 text-center">
                    {a.adyaCode}
                    <div className="text-[9px] font-normal truncate max-w-[110px] mx-auto">
                      {a.name.split(' (')[0]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)]">
              {ISOLATION_LEVELS.map((lvl) => (
                <tr key={lvl.id} className={lvl.id === selectedLevel ? 'bg-[var(--paper)]' : ''}>
                  <td className="py-2.5 pr-4 font-semibold text-[var(--ink)]">{lvl.name}</td>
                  {ISOLATION_ANOMALIES.map((a) => {
                    const safe = isAnomalyPrevented(lvl.id, a.id);
                    const activeCell = lvl.id === selectedLevel && a.id === activeAnomaly.id;
                    return (
                      <td key={a.id} className="py-2 px-1.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedLevel(lvl.id);
                            setSelectedAnomalyId(a.id);
                            setVisibleSteps(5);
                          }}
                          className={`w-full py-1.5 px-2 border text-[10px] font-semibold uppercase transition-colors inline-flex items-center justify-center gap-1 ${
                            activeCell ? 'ring-2 ring-[var(--ink)] ' : ''
                          }${
                            safe
                              ? 'border-[#0F6B50] bg-[#0F6B50]/12 text-[#0F6B50]'
                              : 'border-[#D9441E] bg-[#D9441E]/12 text-[#D9441E]'
                          }`}
                        >
                          {safe ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Safe
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> Risk
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
