'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowUpRight,
  Check,
  X,
  Scale,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  AdvisorConstraints,
  DEFAULT_ADVISOR_CONSTRAINTS,
  ADVISOR_PRESETS,
  evaluateProtocolRecommendations,
  FaultModelReq,
  ConsistencyReq,
  PartitionStanceReq,
  WriteLatencyReq,
  WorkloadReq,
} from '@/lib/advisor';

export default function ProtocolAdvisorPage() {
  const [constraints, setConstraints] = useState<AdvisorConstraints>(DEFAULT_ADVISOR_CONSTRAINTS);

  const ranked = useMemo(
    () => evaluateProtocolRecommendations(constraints),
    [constraints]
  );

  const winner = ranked[0];

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--cobalt)] font-semibold">
            <Compass className="w-3.5 h-3.5" />
            ARCHITECTURE DECISION MATRIX · PROTOCOL SELECTOR
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        {/* Heading + Presets */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
              Which <em className="italic text-[var(--signal)] font-normal">Protocol</em> Fits Your
              System?
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
              Dial in your failure model, consistency semantics, partition stance, write latency
              budget, and access pattern to see which protocols satisfy your formal invariants—and
              which ones are disqualified.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {ADVISOR_PRESETS.map((preset) => {
              const active =
                preset.constraints.faultModel === constraints.faultModel &&
                preset.constraints.consistency === constraints.consistency &&
                preset.constraints.partitionStance === constraints.partitionStance &&
                preset.constraints.writeLatency === constraints.writeLatency &&
                preset.constraints.workload === constraints.workload;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setConstraints(preset.constraints)}
                  className={`p-2.5 border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                    {preset.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 line-clamp-1 ${
                      active ? 'text-[#C8C3B8]' : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {preset.summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split: Constraint Deck + Top Recommendation & Full Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 Columns: Calibrated Engineering Constraint Switches */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--chassis)] p-5 space-y-5 h-fit">
            <div className="pb-2.5 border-b border-[var(--ink)]/20 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ink)]">
              System Requirements Deck
            </div>

            <ConstraintGroup<FaultModelReq>
              label="01 · Fault Model"
              value={constraints.faultModel}
              onChange={(faultModel) => setConstraints((c) => ({ ...c, faultModel }))}
              options={[
                { value: 'crash', label: 'Crash (Fail-Stop)', hint: '2f + 1 · Honest nodes' },
                { value: 'byzantine', label: 'Byzantine', hint: '3f + 1 · Adversarial' },
              ]}
            />

            <ConstraintGroup<ConsistencyReq>
              label="02 · Consistency Guarantee"
              value={constraints.consistency}
              onChange={(consistency) => setConstraints((c) => ({ ...c, consistency }))}
              options={[
                { value: 'linearizable', label: 'Linearizable', hint: 'Strict global order' },
                { value: 'causal', label: 'Causal', hint: 'Happens-before order' },
                { value: 'eventual', label: 'Eventual / SEC', hint: 'Async convergence' },
              ]}
            />

            <ConstraintGroup<PartitionStanceReq>
              label="03 · Partition Stance (CAP)"
              value={constraints.partitionStance}
              onChange={(partitionStance) => setConstraints((c) => ({ ...c, partitionStance }))}
              options={[
                { value: 'cp', label: 'CP (Safety First)', hint: 'Stall minority side' },
                { value: 'ap', label: 'AP (Always Writable)', hint: 'Reconcile on heal' },
              ]}
            />

            <ConstraintGroup<WriteLatencyReq>
              label="04 · Write Latency Budget"
              value={constraints.writeLatency}
              onChange={(writeLatency) => setConstraints((c) => ({ ...c, writeLatency }))}
              options={[
                { value: 'local-0rtt', label: '0-RTT Local', hint: 'No wire wait' },
                { value: 'single-rtt', label: '1-RTT', hint: 'Leader / Quorum' },
                { value: 'multi-rtt', label: 'Multi-RTT', hint: '2PC / Paxos / BFT' },
              ]}
            />

            <ConstraintGroup<WorkloadReq>
              label="05 · Primary Workload"
              value={constraints.workload}
              onChange={(workload) => setConstraints((c) => ({ ...c, workload }))}
              options={[
                { value: 'state-machine', label: 'State Machine', hint: 'Config / Locks / Log' },
                { value: 'kv-storage', label: 'Key-Value Store', hint: 'Point GET / PUT' },
                { value: 'range-scan', label: 'Range Scans', hint: 'Ordered BETWEEN' },
                { value: 'cross-service-txn', label: 'Multi-Service Txn', hint: 'Orders / Payments' },
                { value: 'shared-collab', label: 'Collaborative State', hint: 'Multi-region merge' },
              ]}
            />
          </div>

          {/* Right 8 Columns: Winner Spotlight + Full Ranked Suitability Matrix */}
          <div className="lg:col-span-8 space-y-6">
            {/* Winner Spotlight */}
            <section className="border-2 border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[6px_6px_0_0_var(--ink)]">
              <div className="px-5 py-3 border-b border-[var(--ink)] bg-[#111413] text-[#F4F0E8] flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em]">
                <span className="inline-flex items-center gap-2 text-[#34D399] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  PRIMARY RECOMMENDATION · {winner.fitTier.toUpperCase()} FIT
                </span>
                <span className="tabular-nums text-[#FB923C] font-semibold">
                  SCORE {winner.score} / 100
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-editorial text-3xl text-[var(--ink)]">
                      {winner.profile.name}
                    </h2>
                    <div className="font-mono text-[11px] text-[var(--ink-muted)] mt-0.5">
                      {winner.profile.citation} · {winner.profile.quorumFormula}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                  {winner.profile.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 border border-[var(--emerald)]/40 bg-[var(--emerald)]/8 space-y-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--emerald)] font-semibold">
                      Satisfied Requirements
                    </div>
                    {winner.matchedReasons.map((reason) => (
                      <div key={reason} className="flex items-start gap-2 text-xs text-[var(--ink)]">
                        <Check className="w-3.5 h-3.5 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 border border-[var(--rule)] bg-[var(--paper)] space-y-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--signal)] font-semibold">
                      Operational Trade-off to Plan For
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                      {winner.profile.tradeoffNote}
                    </p>
                    {winner.disqualifiers.map((d) => (
                      <div
                        key={d}
                        className="flex items-start gap-1.5 text-xs text-[var(--signal)] pt-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <Link
                    href={winner.profile.platePath}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <span>Open Live Plate</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  {winner.profile.duelId && (
                    <Link
                      href={`/duel?duel=${winner.profile.duelId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      <Scale className="w-3.5 h-3.5 text-[var(--signal)]" />
                      <span>Run Protocol Duel</span>
                    </Link>
                  )}
                  {winner.profile.showBenchLink && (
                    <Link
                      href="/bench"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[var(--emerald)]" />
                      <span>Size Quorum in Bench</span>
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Full 9-Protocol Ranked Suitability Matrix */}
            <section className="border border-[var(--ink)] bg-[var(--paper-elevated)]">
              <div className="px-4 py-2.5 border-b border-[var(--ink)] bg-[var(--chassis)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-secondary)]">
                Complete Candidate Ranking · {ranked.length} Evaluated Protocols
              </div>

              <div className="divide-y divide-[var(--rule)]">
                {ranked.map((rec, index) => {
                  const tierBadge =
                    rec.fitTier === 'optimal'
                      ? 'bg-[var(--emerald)] text-[#FAF7F1]'
                      : rec.fitTier === 'viable'
                      ? 'bg-[var(--cobalt)] text-[#FAF7F1]'
                      : rec.fitTier === 'tradeoff'
                      ? 'bg-[var(--ochre)] text-[#FAF7F1]'
                      : 'bg-[var(--chassis)] text-[var(--ink-muted)] border border-[var(--rule)]';

                  return (
                    <div
                      key={rec.profile.conceptId}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        rec.fitTier === 'disqualified' ? 'opacity-65 bg-[var(--paper)]/60' : ''
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                            #{String(index + 1).padStart(2, '0')}
                          </span>
                          <Link
                            href={rec.profile.platePath}
                            className="font-editorial text-xl text-[var(--ink)] hover:text-[var(--signal)] transition-colors"
                          >
                            {rec.profile.name}
                          </Link>
                          <span
                            className={`px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${tierBadge}`}
                          >
                            {rec.fitTier}
                          </span>
                        </div>

                        <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                          {rec.profile.quorumFormula}
                        </div>

                        {rec.disqualifiers.length > 0 ? (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                            {rec.disqualifiers.map((dq) => (
                              <span
                                key={dq}
                                className="inline-flex items-center gap-1 text-xs text-[var(--signal)]"
                              >
                                <X className="w-3 h-3 flex-shrink-0" />
                                {dq}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--ink-secondary)]">
                            {rec.matchedReasons[0]}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="w-24">
                          <div className="flex justify-between font-mono text-[10px] tabular-nums mb-1">
                            <span className="text-[var(--ink-muted)]">FIT</span>
                            <span className="font-semibold text-[var(--ink)]">{rec.score}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--chassis)] border border-[var(--rule)]">
                            <div
                              className={`h-full ${
                                rec.fitTier === 'optimal'
                                  ? 'bg-[var(--emerald)]'
                                  : rec.fitTier === 'viable'
                                  ? 'bg-[var(--cobalt)]'
                                  : rec.fitTier === 'tradeoff'
                                  ? 'bg-[var(--ochre)]'
                                  : 'bg-[var(--ink-muted)]'
                              }`}
                              style={{ width: `${rec.score}%` }}
                            />
                          </div>
                        </div>

                        <Link
                          href={rec.profile.platePath}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
                        >
                          Plate
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstraintGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; hint: string }>;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-secondary)] font-semibold mb-2">
        {label}
      </div>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full px-3 py-2 border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              <span className="font-mono text-xs font-medium">{opt.label}</span>
              <span
                className={`font-mono text-[10px] ${
                  active ? 'text-[#FB923C]' : 'text-[var(--ink-muted)]'
                }`}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
