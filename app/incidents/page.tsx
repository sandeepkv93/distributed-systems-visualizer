'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  X,
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { INCIDENTS, getIncidentById } from '@/lib/incidents';
import { markIncidentSolved } from '@/lib/progress';
import { useProgress } from '@/hooks/useProgress';
import { showToast } from '@/lib/toast';
import SpaceTimeScope from '@/components/SpaceTimeScope';

interface IncidentAnswerState {
  rootChoice: number | null;
  mitigationChoice: number | null;
}

export default function IncidentPostmortemPage() {
  const { progress } = useProgress();
  const [selectedId, setSelectedId] = useState<string>(INCIDENTS[0].id);
  const [answers, setAnswers] = useState<Record<string, IncidentAnswerState>>({});
  const hasHydratedRef = useRef(false);

  // Hydrate optional ?incident=<id> query parameter safely on mount
  useEffect(() => {
    if (hasHydratedRef.current || typeof window === 'undefined') return;
    hasHydratedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('incident');
    if (!paramId) return;
    const matched = INCIDENTS.find((inc) => inc.id === paramId);
    if (!matched) return;

    const timer = setTimeout(() => {
      setSelectedId(matched.id);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const activeIncident = getIncidentById(selectedId);
  const solvedSet = new Set(progress.incidentsSolved ?? []);
  const currentAnswer: IncidentAnswerState = answers[activeIncident.id] ?? {
    rootChoice: null,
    mitigationChoice: null,
  };

  const rootCorrect = currentAnswer.rootChoice === activeIncident.correctRootCauseIndex;
  const mitigationCorrect =
    currentAnswer.mitigationChoice === activeIncident.correctMitigationIndex;
  const isResolvedNow = rootCorrect && mitigationCorrect;
  const isAlreadyRecorded = solvedSet.has(activeIncident.id);

  const selectIncident = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('incident', id);
        window.history.replaceState(null, '', url.toString());
      } catch {
        // Ignore history restrictions
      }
    }
  };

  const chooseRootCause = (idx: number) => {
    setAnswers((prev) => {
      const existing = prev[activeIncident.id] ?? { rootChoice: null, mitigationChoice: null };
      const next = { ...existing, rootChoice: idx };
      if (
        idx === activeIncident.correctRootCauseIndex &&
        next.mitigationChoice === activeIncident.correctMitigationIndex
      ) {
        markIncidentSolved(activeIncident.id);
        showToast(`${activeIncident.code} postmortem verified & recorded.`, 'success');
      }
      return { ...prev, [activeIncident.id]: next };
    });
  };

  const chooseMitigation = (idx: number) => {
    setAnswers((prev) => {
      const existing = prev[activeIncident.id] ?? { rootChoice: null, mitigationChoice: null };
      const next = { ...existing, mitigationChoice: idx };
      if (
        next.rootChoice === activeIncident.correctRootCauseIndex &&
        idx === activeIncident.correctMitigationIndex
      ) {
        markIncidentSolved(activeIncident.id);
        showToast(`${activeIncident.code} postmortem verified & recorded.`, 'success');
      }
      return { ...prev, [activeIncident.id]: next };
    });
  };

  const resetCurrentAttempt = () => {
    setAnswers((prev) => ({
      ...prev,
      [activeIncident.id]: { rootChoice: null, mitigationChoice: null },
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--signal)] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            INCIDENT POSTMORTEM LAB · {solvedSet.size} / {INCIDENTS.length} RESOLVED
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        {/* Heading + Case Selector Grid */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
              Diagnose the <em className="italic text-[var(--signal)] font-normal">Outage</em>
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
              Inspect live wire traces, production logs, and broken invariants from 6 canonical
              distributed systems failures. Identify the root cause and select the architectural
              mitigation to close each postmortem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {INCIDENTS.map((inc) => {
              const active = inc.id === activeIncident.id;
              const solved = solvedSet.has(inc.id);
              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => selectIncident(inc.id)}
                  className={`px-3.5 py-2.5 border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={
                          active ? 'text-[#FB923C] font-semibold' : 'text-[var(--signal)] font-semibold'
                        }
                      >
                        {inc.code}
                      </span>
                      <span
                        className={`px-1 py-0.25 text-[9px] border ${
                          inc.severity === 'SEV-1'
                            ? active
                              ? 'border-[#FB923C]/50 text-[#FB923C]'
                              : 'border-[var(--signal)]/40 text-[var(--signal)]'
                            : active
                            ? 'border-[#F4F0E8]/30 text-[#C8C3B8]'
                            : 'border-[var(--rule)] text-[var(--ink-muted)]'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </span>
                    {solved && (
                      <span className="inline-flex items-center gap-1 text-[#34D399] font-semibold">
                        <Check className="w-3 h-3" />
                        CLOSED
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium leading-snug line-clamp-1">{inc.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Incident Briefing Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] mb-6">
          <div className="px-5 py-3.5 border-b border-[var(--ink)] bg-[var(--chassis)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
              <span className="px-2 py-0.5 bg-[var(--signal)] text-[#FAF7F1] font-semibold">
                {activeIncident.code} · {activeIncident.severity}
              </span>
              <span className="text-[var(--ink-secondary)]">SERVICE: {activeIncident.service}</span>
            </div>
            {(isResolvedNow || isAlreadyRecorded) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--emerald)] text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                POSTMORTEM VERIFIED
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[var(--ink)]">
                {activeIncident.title}
              </h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-1.5 leading-relaxed max-w-4xl">
                {activeIncident.summary}
              </p>
            </div>

            {/* 4 Live Telemetry Readouts */}
            <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--rule)] divide-y md:divide-y-0 md:divide-x divide-[var(--rule)] bg-[var(--paper)]">
              {activeIncident.telemetry.map((metric) => (
                <div key={metric.label} className="p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                    {metric.label}
                  </div>
                  <div
                    className={`font-mono text-sm font-semibold mt-1 tabular-nums ${
                      metric.alert ? 'text-[var(--signal)]' : 'text-[var(--ink)]'
                    }`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Evidence & Diagnosis Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Space-Time Wire Capture + Production Logs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Wire Capture Oscilloscope */}
            <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
              <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-secondary)]">
                <span>CAPTURED WIRE TRACE · SPACE-TIME DIAGRAM</span>
                <span>CLICK ANY ARROW TO INSPECT</span>
              </div>
              <div className="scope-viewport h-[370px] relative">
                <SpaceTimeScope
                  title={`${activeIncident.code} WIRE CAPTURE`}
                  actors={activeIncident.actors}
                  frames={activeIncident.frames}
                  idPrefix={`inc-${activeIncident.id}`}
                />
              </div>
            </div>

            {/* Timestamped Production Log Terminal */}
            <div className="border border-[var(--ink)] bg-[#111413] text-[#F4F0E8]">
              <div className="px-4 py-2 border-b border-[#F4F0E8]/15 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9E9B90]">
                <Terminal className="w-3.5 h-3.5 text-[#FB923C]" />
                <span>COLLECTOR LOG STREAM · {activeIncident.service}</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-2 overflow-x-auto">
                {activeIncident.logLines.map((line) => {
                  const isError =
                    line.includes('ERROR') || line.includes('FATAL') || line.includes('ALERT');
                  const isWarn = line.includes('WARN');
                  return (
                    <div
                      key={line}
                      className={`whitespace-pre-wrap leading-relaxed ${
                        isError
                          ? 'text-[#F87171]'
                          : isWarn
                          ? 'text-[#FBBF24]'
                          : 'text-[#D6D2C7]'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Two-Stage Interactive Postmortem Diagnosis */}
          <div className="lg:col-span-5 space-y-5">
            {/* Step 1: Root Cause Diagnosis */}
            <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--rule)]">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
                  STAGE 01 · ROOT CAUSE ANALYSIS
                </span>
                {currentAnswer.rootChoice !== null && (
                  <button
                    type="button"
                    onClick={resetCurrentAttempt}
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <p className="text-sm font-medium text-[var(--ink)] mb-3 leading-snug">
                {activeIncident.rootCauseQuestion}
              </p>

              <div className="space-y-2">
                {activeIncident.rootCauseOptions.map((option, idx) => {
                  const chosen = currentAnswer.rootChoice === idx;
                  const isRight = idx === activeIncident.correctRootCauseIndex;
                  const showWrong = chosen && !isRight;
                  const showRight = chosen && isRight;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseRootCause(idx)}
                      className={`w-full text-left p-3 border text-xs leading-relaxed transition-colors cursor-pointer flex items-start gap-2.5 ${
                        showRight
                          ? 'bg-[var(--emerald)]/12 border-[var(--emerald)] text-[var(--ink)] font-medium'
                          : showWrong
                          ? 'bg-[var(--signal)]/10 border-[var(--signal)] text-[var(--ink)]'
                          : 'bg-[var(--paper)] border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 border flex items-center justify-center font-mono text-[10px] ${
                          showRight
                            ? 'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]'
                            : showWrong
                            ? 'bg-[var(--signal)] border-[var(--signal)] text-[#FAF7F1]'
                            : 'border-[var(--ink)]/30 text-[var(--ink-muted)]'
                        }`}
                      >
                        {showRight ? (
                          <Check className="w-3 h-3" />
                        ) : showWrong ? (
                          <X className="w-3 h-3" />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Architectural Mitigation */}
            <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="pb-2.5 mb-3 border-b border-[var(--rule)]">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
                  STAGE 02 · ARCHITECTURAL MITIGATION
                </span>
              </div>

              <p className="text-sm font-medium text-[var(--ink)] mb-3 leading-snug">
                {activeIncident.mitigationQuestion}
              </p>

              <div className="space-y-2">
                {activeIncident.mitigationOptions.map((option, idx) => {
                  const chosen = currentAnswer.mitigationChoice === idx;
                  const isRight = idx === activeIncident.correctMitigationIndex;
                  const showWrong = chosen && !isRight;
                  const showRight = chosen && isRight;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseMitigation(idx)}
                      className={`w-full text-left p-3 border text-xs leading-relaxed transition-colors cursor-pointer flex items-start gap-2.5 ${
                        showRight
                          ? 'bg-[var(--emerald)]/12 border-[var(--emerald)] text-[var(--ink)] font-medium'
                          : showWrong
                          ? 'bg-[var(--signal)]/10 border-[var(--signal)] text-[var(--ink)]'
                          : 'bg-[var(--paper)] border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 border flex items-center justify-center font-mono text-[10px] ${
                          showRight
                            ? 'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]'
                            : showWrong
                            ? 'bg-[var(--signal)] border-[var(--signal)] text-[#FAF7F1]'
                            : 'border-[var(--ink)]/30 text-[var(--ink-muted)]'
                        }`}
                      >
                        {showRight ? (
                          <Check className="w-3 h-3" />
                        ) : showWrong ? (
                          <X className="w-3 h-3" />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Unlocked Formal Postmortem Verdict */}
            {(isResolvedNow || isAlreadyRecorded) && (
              <section className="border border-[var(--emerald)] bg-[var(--emerald)]/10 p-5 space-y-3">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--emerald)] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>FORMAL POSTMORTEM VERDICT</span>
                </div>
                <p className="text-sm text-[var(--ink)] leading-relaxed">
                  {activeIncident.postmortemVerdict}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href={activeIncident.relatedPlatePath}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>{activeIncident.relatedPlateLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={activeIncident.secondaryLabPath}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper-elevated)] border border-[var(--ink)] hover:bg-[var(--chassis)] text-[var(--ink)] font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>{activeIncident.secondaryLabLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
