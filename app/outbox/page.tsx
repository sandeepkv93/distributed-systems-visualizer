'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  OUTBOX_ARCHITECTURES,
  OUTBOX_FAULTS,
  OutboxArchitectureId,
  OutboxFaultId,
  simulateOutboxScenario,
} from '@/lib/outbox-lab';

export default function OutboxLabPage() {
  const [arch, setArch] = useState<OutboxArchitectureId>('transactional-outbox-cdc');
  const [fault, setFault] = useState<OutboxFaultId>('crash-after-db');
  const [idempotentInbox, setIdempotentInbox] = useState<boolean>(true);

  const sim = useMemo(
    () => simulateOutboxScenario(arch, fault, idempotentInbox),
    [arch, fault, idempotentInbox]
  );

  const activeArch =
    OUTBOX_ARCHITECTURES.find((a) => a.id === arch) ?? OUTBOX_ARCHITECTURES[2];

  const actorX: Record<'APP' | 'DB' | 'CDC' | 'KAFKA' | 'CONSUMER', number> = {
    APP: 75,
    DB: 205,
    CDC: 340,
    KAFKA: 475,
    CONSUMER: 610,
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME V · EVENT-DRIVEN MICROSERVICES · OUTBOX · WAL CDC &amp; IDEMPOTENT INBOX</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/two-phase-commit" className="text-[var(--signal)] hover:underline">
              Plate 16 · Two-Phase Commit →
            </Link>
            <Link href="/distributed-transactions" className="text-[var(--cobalt)] hover:underline">
              Plate 17 · 3PC &amp; Sagas →
            </Link>
            <Link href="/replication-log" className="text-[var(--emerald)] hover:underline">
              Plate 10 · Replication Log →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Transactional Outbox, CDC &amp; Dual-Write Hazards
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Updating a database and publishing to Kafka without coordination is the #1 source of
              silent microservice drift. Inject crashes and redeliveries to compare broken{' '}
              <strong className="text-[var(--signal)]">dual writes</strong> against{' '}
              <strong className="text-[var(--ink)]">
                Transactional Outbox + Debezium WAL CDC + Idempotent Consumer Inbox
              </strong>
              .
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                DB Order
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {sim.dbOrderCommitted ? 'COMMITTED' : 'ABSENT'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Applied
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--ink)]">
                {sim.consumerEffectsApplied}× effect
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                State
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  sim.consistent ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                }`}
              >
                {sim.consistent ? 'CONSISTENT' : 'CORRUPT'}
              </div>
            </div>
          </div>
        </header>

        {/* Architecture & Fault Controls */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Select Pattern, Fault Mode &amp; Consumer Deduplication</span>
            </div>
            <button
              onClick={() => setIdempotentInbox((v) => !v)}
              className={`px-3 py-1.5 border font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                idempotentInbox
                  ? 'border-[var(--emerald)] bg-[var(--emerald)] text-[var(--paper)]'
                  : 'border-[var(--signal)] bg-[var(--paper)] text-[var(--signal)]'
              }`}
            >
              Idempotent Consumer Inbox: {idempotentInbox ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {OUTBOX_ARCHITECTURES.map((item) => (
              <button
                key={item.id}
                onClick={() => setArch(item.id)}
                className={`text-left p-4 border transition-colors ${
                  arch === item.id
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] text-[var(--ink)]'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider mb-1 text-[#FBBF24]">
                  {item.shortName}
                </div>
                <div className="font-editorial text-lg leading-snug mb-1">{item.name}</div>
                <div
                  className={`text-xs leading-relaxed ${
                    arch === item.id ? 'text-[#F4F0E8]/80' : 'text-[var(--ink-secondary)]'
                  }`}
                >
                  {item.summary}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-[var(--rule)]">
            {OUTBOX_FAULTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFault(f.id)}
                className={`text-left p-3 border transition-colors ${
                  fault === f.id
                    ? 'border-[var(--signal)] bg-[#D9441E]/10 text-[var(--ink)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                }`}
              >
                <div className="font-mono text-[10px] uppercase font-semibold text-[var(--ink)] mb-0.5">
                  {f.name}
                </div>
                <div className="text-[11px] leading-snug">{f.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Pipeline Oscilloscope + Step Trace */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
                <span className="text-[#F4F0E8] font-semibold">
                  EXECUTION PIPELINE · {activeArch.shortName.toUpperCase()}
                </span>
                <span
                  className={`px-2 py-0.5 font-semibold ${
                    sim.consistent ? 'bg-[#0F6B50] text-[#F4F0E8]' : 'bg-[#D9441E] text-[#F4F0E8]'
                  }`}
                >
                  {sim.anomalyTag}
                </span>
              </div>

              <svg viewBox="0 0 690 225" className="w-full h-auto">
                {/* Connecting rail */}
                <line x1="75" y1="68" x2="610" y2="68" stroke="#2D3330" strokeWidth="2" strokeDasharray="4 4" />

                {(
                  [
                    { id: 'APP', title: 'ORDER SVC', sub: 'Producer' },
                    { id: 'DB', title: 'POSTGRES', sub: arch === 'transactional-outbox-cdc' ? 'Order + Outbox' : 'Orders Table' },
                    { id: 'CDC', title: 'DEBEZIUM', sub: arch === 'transactional-outbox-cdc' ? 'WAL Slot' : 'Unused' },
                    { id: 'KAFKA', title: 'KAFKA LOG', sub: `${sim.brokerMessagesPublished} msg(s)` },
                    { id: 'CONSUMER', title: 'SHIP SVC', sub: idempotentInbox ? 'Inbox PK' : 'No Dedup' },
                  ] as const
                ).map((node) => {
                  const x = actorX[node.id];
                  const active = node.id !== 'CDC' || arch === 'transactional-outbox-cdc';
                  const stepHit = sim.steps.find((s) => s.actor === node.id);
                  const stroke = !active
                    ? '#2A2F2C'
                    : stepHit?.status === 'crash' || stepHit?.status === 'corrupt'
                    ? '#D9441E'
                    : stepHit?.status === 'dedup'
                    ? '#FBBF24'
                    : '#34D399';
                  return (
                    <g key={node.id} opacity={active ? 1 : 0.35}>
                      <rect x={x - 52} y="40" width="104" height="56" fill="#181C1B" stroke={stroke} strokeWidth="1.8" />
                      <text x={x} y="64" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {node.title}
                      </text>
                      <text x={x} y="82" textAnchor="middle" fill={stroke} fontSize="8.5" fontFamily="monospace">
                        {node.sub}
                      </text>
                    </g>
                  );
                })}

                {/* Step Timeline Badges below nodes */}
                {sim.steps.map((s, idx) => {
                  const x = actorX[s.actor];
                  const y = 124 + (idx % 2) * 38;
                  const color =
                    s.status === 'crash' || s.status === 'corrupt'
                      ? '#D9441E'
                      : s.status === 'dedup'
                      ? '#FBBF24'
                      : '#60A5FA';
                  return (
                    <g key={`${s.step}-${s.actor}`}>
                      <line x1={x} y1="96" x2={x} y2={y - 12} stroke={color} strokeDasharray="3 3" opacity="0.6" />
                      <rect x={x - 56} y={y - 12} width="112" height="26" fill="#181C1B" stroke={color} strokeWidth="1.3" />
                      <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                        0{s.step} · {s.label}
                      </text>
                    </g>
                  );
                })}

                <text x="345" y="214" textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  DB COMMITTED: {sim.dbOrderCommitted ? 'YES' : 'NO'} · KAFKA PUBLISHED: {sim.brokerMessagesPublished} · CONSUMER APPLIED: {sim.consumerEffectsApplied}×
                </text>
              </svg>
            </div>

            <div className="mt-4 pt-3 border-t border-[#262B29] text-xs text-[#D6D2C7] leading-relaxed">
              {sim.verdict}
            </div>
          </div>

          {/* Right 4-Col: Step-by-Step Execution Log */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
                <Database className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>Step-by-Step Failure Trace</span>
              </div>
              <div className="space-y-2.5">
                {sim.steps.map((s) => (
                  <div
                    key={`${s.step}-${s.label}`}
                    className="p-3 bg-[var(--paper)] border border-[var(--rule)] text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase mb-1">
                      <span className="font-semibold text-[var(--ink)]">
                        0{s.step} · {s.actor} — {s.label}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 font-semibold ${
                          s.status === 'crash' || s.status === 'corrupt'
                            ? 'bg-[#D9441E] text-[#F4F0E8]'
                            : s.status === 'dedup'
                            ? 'bg-[#1D4B8F] text-[#F4F0E8]'
                            : 'bg-[#0F6B50] text-[#F4F0E8]'
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[var(--ink-secondary)]">{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--rule)] flex flex-wrap gap-2">
              {activeArch.conceptIds.map((cid) => {
                const concept = CONCEPTS_CATALOG.find((c) => c.id === cid);
                if (!concept) return null;
                return (
                  <Link
                    key={cid}
                    href={concept.path}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--ink)] font-mono text-[10px] uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  >
                    {concept.name} <ArrowUpRight className="w-3 h-3" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Full 3 x 4 Consistency Verification Matrix */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 overflow-x-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
            Consistency Comparison Matrix (Inbox Dedup: {idempotentInbox ? 'ON' : 'OFF'})
          </div>
          <h2 className="font-editorial text-2xl mb-4">
            Dual-Write vs. Transactional Outbox Across Every Fault
          </h2>
          <table className="w-full text-left border-collapse font-mono text-xs min-w-[680px]">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                <th className="py-2.5 pr-4">Architecture</th>
                {OUTBOX_FAULTS.map((f) => (
                  <th key={f.id} className="py-2.5 px-2 text-center">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)]">
              {OUTBOX_ARCHITECTURES.map((a) => (
                <tr key={a.id} className={a.id === arch ? 'bg-[var(--paper)]' : ''}>
                  <td className="py-2.5 pr-4 font-semibold text-[var(--ink)]">{a.name}</td>
                  {OUTBOX_FAULTS.map((f) => {
                    const cell = simulateOutboxScenario(a.id, f.id, idempotentInbox);
                    return (
                      <td key={f.id} className="py-2 px-1.5 text-center">
                        <button
                          onClick={() => {
                            setArch(a.id);
                            setFault(f.id);
                          }}
                          className={`w-full py-1.5 px-2 border text-[10px] font-semibold uppercase inline-flex items-center justify-center gap-1 ${
                            cell.consistent
                              ? 'border-[#0F6B50] bg-[#0F6B50]/12 text-[#0F6B50]'
                              : 'border-[#D9441E] bg-[#D9441E]/12 text-[#D9441E]'
                          }`}
                        >
                          {cell.consistent ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Safe
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> Drift
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

          <div className="mt-4 p-3 bg-[var(--paper)] border border-[var(--rule)] flex items-center gap-2 text-xs text-[var(--ink-secondary)]">
            {sim.consistent ? (
              <ShieldCheck className="w-4 h-4 text-[var(--emerald)] flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[var(--signal)] flex-shrink-0" />
            )}
            <span>
              <strong>Rule of Thumb:</strong> Never dual-write across two independent systems (DB +
              Kafka) without either distributed 2PC or a local Transactional Outbox + WAL CDC +
              Idempotent Consumer Inbox.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
