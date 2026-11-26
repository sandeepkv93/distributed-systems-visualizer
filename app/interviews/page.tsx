'use client';

import { useState, useMemo, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  INTERVIEW_PROMPTS,
  InterviewPromptId,
  evaluateInterview,
  getInterviewPrompt,
  getServerInterviewScoresSnapshot,
  loadInterviewBestScores,
  saveInterviewBestScore,
  subscribeInterviewScores,
} from '@/lib/interviews';

export default function InterviewsStudioPage() {
  const [selectedPromptId, setSelectedPromptId] = useState<InterviewPromptId>('payment-ledger');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const caseParam = new URLSearchParams(window.location.search).get('case');
    if (caseParam && INTERVIEW_PROMPTS.some((p) => p.id === caseParam)) {
      const timer = setTimeout(() => setSelectedPromptId(caseParam as InterviewPromptId), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const bestScores = useSyncExternalStore(
    subscribeInterviewScores,
    loadInterviewBestScores,
    getServerInterviewScoresSnapshot
  );

  const prompt = useMemo(() => getInterviewPrompt(selectedPromptId), [selectedPromptId]);

  // Deterministically interleave option order per stage so the optimal choice is not always first
  const orderedStages = useMemo(() => {
    return prompt.stages.map((stage, sIdx) => {
      const shift = (selectedPromptId.length + sIdx) % 3;
      const opts = [
        stage.options[shift % 3],
        stage.options[(shift + 1) % 3],
        stage.options[(shift + 2) % 3],
      ];
      return { stage, opts };
    });
  }, [prompt, selectedPromptId]);

  const answeredCount = prompt.stages.filter((s) => Boolean(selections[s.id])).length;
  const allAnswered = answeredCount === prompt.stages.length;

  const evaluation = useMemo(
    () => (submitted ? evaluateInterview(prompt, selections) : null),
    [submitted, prompt, selections]
  );

  const selectPrompt = (id: InterviewPromptId) => {
    setSelectedPromptId(id);
    setSelections({});
    setSubmitted(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('case', id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    const result = evaluateInterview(prompt, selections);
    setSubmitted(true);
    saveInterviewBestScore(prompt.id, result.score);
  };

  const completedCount = INTERVIEW_PROMPTS.filter((p) => (bestScores[p.id] ?? 0) >= 88).length;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME V · STAFF &amp; PRINCIPAL SYSTEM DESIGN INTERVIEW SIMULATOR</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/studio" className="text-[var(--signal)] hover:underline">
              Stack Composer →
            </Link>
            <Link href="/exam" className="text-[var(--emerald)] hover:underline">
              Mastery Exam →
            </Link>
            <Link href="/drills" className="text-[var(--cobalt)] hover:underline">
              Flashcards →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              System Design Interview Simulator
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Step into a 5-stage <strong className="text-[var(--ink)]">Staff / Principal</strong>{' '}
              architecture review across partitioning, replication, consistency, failure handling,
              and overload control. Submit your design to receive a scored critique with invariant
              warnings and review plates.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Cases
              </div>
              <div className="font-mono text-base font-semibold mt-1">{INTERVIEW_PROMPTS.length}</div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Principal Pass
              </div>
              <div className="font-mono text-base font-semibold mt-1 text-[var(--emerald)]">
                {completedCount} / {INTERVIEW_PROMPTS.length}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Progress
              </div>
              <div className="font-mono text-base font-semibold mt-1 text-[var(--cobalt)]">
                {answeredCount} / 5
              </div>
            </div>
          </div>
        </header>

        {/* Case Selector Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {INTERVIEW_PROMPTS.map((item) => {
            const isSelected = item.id === prompt.id;
            const best = bestScores[item.id];
            return (
              <button
                key={item.id}
                onClick={() => selectPrompt(item.id)}
                className={`text-left p-4 border transition-colors ${
                  isSelected
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] text-[var(--ink)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider mb-1">
                  <span className={isSelected ? 'text-[#F4F0E8]/70' : 'text-[var(--ink-muted)]'}>
                    {item.code} · {item.level}
                  </span>
                  {best !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 font-semibold ${
                        best >= 88
                          ? 'bg-[#0F6B50] text-[#F4F0E8]'
                          : 'bg-[#1D4B8F] text-[#F4F0E8]'
                      }`}
                    >
                      BEST {best}/100
                    </span>
                  )}
                </div>
                <div className="font-editorial text-lg leading-snug mb-1">{item.title}</div>
                <div
                  className={`font-mono text-[10px] ${
                    isSelected ? 'text-[#F4F0E8]/75' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {item.scale}
                </div>
              </button>
            );
          })}
        </section>

        {/* Active Prompt Brief */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-6 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
                <Briefcase className="w-3.5 h-3.5" />
                <span>
                  {prompt.code} · {prompt.level} · {prompt.scale}
                </span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl">{prompt.title}</h2>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">{prompt.brief}</p>
            </div>
            <Link
              href={prompt.relatedLabHref}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--ink)] hover:text-[var(--paper)] font-mono text-[10px] uppercase tracking-wider transition-colors"
            >
              <span>{prompt.relatedLabLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {prompt.hardConstraints.map((c, idx) => (
              <div
                key={c}
                className="p-3 bg-[var(--paper)] border border-[var(--rule)] text-xs text-[var(--ink-secondary)] flex items-start gap-2"
              >
                <span className="font-mono text-[10px] font-semibold text-[var(--signal)]">
                  REQ 0{idx + 1}
                </span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 5 Architectural Decision Stages */}
        <section className="space-y-5 mb-8">
          {orderedStages.map(({ stage, opts }) => {
            const chosenId = selections[stage.id];
            return (
              <div
                key={stage.id}
                className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
                    {stage.dimension}
                  </span>
                  {chosenId && (
                    <span className="font-mono text-[10px] uppercase text-[var(--emerald)] font-semibold">
                      SELECTED
                    </span>
                  )}
                </div>
                <h3 className="font-editorial text-xl mb-4">{stage.question}</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {opts.map((opt) => {
                    const isPicked = chosenId === opt.id;
                    const revealTier = submitted;
                    return (
                      <button
                        key={opt.id}
                        disabled={submitted}
                        onClick={() =>
                          setSelections((prev) => ({
                            ...prev,
                            [stage.id]: opt.id,
                          }))
                        }
                        className={`text-left p-4 border transition-colors flex flex-col justify-between gap-3 ${
                          isPicked
                            ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                            : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] text-[var(--ink)]'
                        } ${submitted ? 'cursor-default' : ''}`}
                      >
                        <div>
                          <div className="font-mono text-xs font-semibold leading-snug mb-1.5">
                            {opt.label}
                          </div>
                          <p
                            className={`text-xs leading-relaxed ${
                              isPicked ? 'text-[#F4F0E8]/80' : 'text-[var(--ink-secondary)]'
                            }`}
                          >
                            {opt.summary}
                          </p>
                        </div>

                        {revealTier && (
                          <div className="pt-2 border-t border-[var(--rule)]/40 flex items-center justify-between font-mono text-[10px] uppercase">
                            <span
                              className={`px-1.5 py-0.5 font-semibold ${
                                opt.tier === 'principal'
                                  ? 'bg-[#0F6B50] text-[#F4F0E8]'
                                  : opt.tier === 'viable'
                                  ? 'bg-[#1D4B8F] text-[#F4F0E8]'
                                  : 'bg-[#D9441E] text-[#F4F0E8]'
                              }`}
                            >
                              {opt.tier === 'principal'
                                ? 'PRINCIPAL (+20)'
                                : opt.tier === 'viable'
                                ? 'VIABLE (+12)'
                                : 'ANTI-PATTERN (+4)'}
                            </span>
                            {isPicked && <span className="font-semibold">YOUR PICK</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Submit / Reset Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[var(--ink)] bg-[var(--paper-elevated)] mb-8">
          <div className="font-mono text-xs text-[var(--ink-secondary)]">
            {allAnswered
              ? 'All 5 architectural dimensions selected. Ready for Principal Review Board evaluation.'
              : `Select all 5 dimensions to submit (${answeredCount} / 5 completed).`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelections({});
                setSubmitted(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--rule)] bg-[var(--paper)] font-mono text-[11px] uppercase tracking-wider text-[var(--ink-secondary)] hover:border-[var(--ink)]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Case
            </button>
            <button
              disabled={!allAnswered || submitted}
              onClick={handleSubmit}
              className={`inline-flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-wider font-semibold transition-opacity ${
                allAnswered && !submitted
                  ? 'bg-[var(--signal)] text-[var(--paper)] hover:opacity-90'
                  : 'bg-[var(--rule)] text-[var(--ink-muted)] cursor-not-allowed'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" /> Submit to Review Board
            </button>
          </div>
        </div>

        {/* Principal Engineer Critique Report */}
        {evaluation && (
          <section className="border-2 border-[var(--ink)] bg-[var(--paper-elevated)] p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--rule)]">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--signal)] font-semibold mb-1">
                  PRINCIPAL ENGINEER REVIEW BOARD CRITIQUE
                </div>
                <h2 className="font-editorial text-3xl flex items-center gap-2.5">
                  <Award className="w-6 h-6 text-[var(--emerald)]" />
                  <span>
                    {evaluation.band} — {evaluation.score} / {evaluation.maxScore}
                  </span>
                </h2>
              </div>
              <div
                className={`px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider ${
                  evaluation.band === 'Principal Ready'
                    ? 'bg-[#0F6B50] text-[#F4F0E8]'
                    : evaluation.band === 'Staff Solid'
                    ? 'bg-[#1D4B8F] text-[#F4F0E8]'
                    : 'bg-[#D9441E] text-[#F4F0E8]'
                }`}
              >
                {evaluation.band}
              </div>
            </div>

            {evaluation.warnings.length > 0 && (
              <div className="p-4 border border-[var(--signal)] bg-[var(--paper)] space-y-2">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--signal)]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Critical Invariant &amp; Failure Warnings ({evaluation.warnings.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[var(--ink-secondary)]">
                  {evaluation.warnings.map((w) => (
                    <li key={w} className="font-mono">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stage-by-Stage Critique */}
            <div className="space-y-3">
              {evaluation.stageCritiques.map((item) => (
                <div
                  key={item.stageId}
                  className="p-4 border border-[var(--rule)] bg-[var(--paper)] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                      {item.dimension}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${
                        item.isOptimal ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                      }`}
                    >
                      {item.isOptimal ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> OPTIMAL (+20)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" /> +{item.chosenOption.points} / 20
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[var(--ink)]">
                    Your Pick: {item.chosenOption.label}
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    {item.chosenOption.critique}
                  </p>
                  {!item.isOptimal && (
                    <div className="pt-2 border-t border-[var(--rule)] text-xs text-[var(--emerald)]">
                      <strong>Principal Benchmark:</strong> {item.bestOption.label} —{' '}
                      {item.bestOption.critique}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommended Review Plates */}
            <div className="pt-4 border-t border-[var(--rule)] flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mr-1">
                Review Atlas Plates:
              </span>
              {evaluation.reviewConceptIds.map((cid) => {
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
          </section>
        )}
      </div>
    </div>
  );
}
