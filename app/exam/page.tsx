'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListChecks,
  SquareCheck,
} from 'lucide-react';
import {
  EXAM_QUESTIONS,
  EXAM_PASS_THRESHOLD,
  TOTAL_EXAM_QUESTIONS,
  gradeExam,
} from '@/lib/exam';
import { CONCEPTS_BY_ID, CONCEPT_DOMAINS_BY_ID } from '@/lib/catalog';
import { recordExamScore } from '@/lib/progress';
import { useProgress } from '@/hooks/useProgress';
import { generateFieldSheetSvg } from '@/lib/field-sheet';
import { showToast } from '@/lib/toast';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function ExamPage() {
  const { progress, stats } = useProgress();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'booklet'>('focus');
  const [activeIndex, setActiveIndex] = useState(0);

  const result = useMemo(() => gradeExam(answers), [answers]);
  const answeredCount = result.answeredCount;
  const isAlreadyFellow = stats.examBestScore >= EXAM_PASS_THRESHOLD;

  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    },
    [submitted]
  );

  // Focus Mode keyboard flow: 1-4 / A-D select option, Left/Right navigate questions
  useEffect(() => {
    if (submitted || viewMode !== 'focus') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      const activeQuestion = EXAM_QUESTIONS[activeIndex];
      if (!activeQuestion) return;

      const key = event.key.toLowerCase();
      const optionIdx =
        key === '1' || key === 'a'
          ? 0
          : key === '2' || key === 'b'
          ? 1
          : key === '3' || key === 'c'
          ? 2
          : key === '4' || key === 'd'
          ? 3
          : -1;

      if (optionIdx >= 0 && optionIdx < activeQuestion.options.length) {
        event.preventDefault();
        handleSelectOption(activeQuestion.id, optionIdx);
      } else if (event.key === 'ArrowRight' && activeIndex < EXAM_QUESTIONS.length - 1) {
        event.preventDefault();
        setActiveIndex((i) => Math.min(EXAM_QUESTIONS.length - 1, i + 1));
      } else if (event.key === 'ArrowLeft' && activeIndex > 0) {
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitted, viewMode, activeIndex, handleSelectOption]);

  const handleSubmit = () => {
    const graded = gradeExam(answers);
    setSubmitted(true);
    setViewMode('booklet');
    recordExamScore(graded.score);
    if (graded.passed) {
      showToast(
        `Passed! ${graded.score}/${graded.total} — Atlas Fellow seal verified.`,
        'success'
      );
    } else {
      showToast(
        `Assessment graded: ${graded.score}/${graded.total}. Review explanations below.`,
        'info'
      );
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setActiveIndex(0);
    setViewMode('focus');
  };

  const handleDownloadFieldSheet = () => {
    const svg = generateFieldSheetSvg({
      completedConceptIds: progress.conceptsCompleted,
      completedScenarioKeys: progress.scenariosCompleted,
      checkpointsSolved: stats.checkpointsSolved,
      totalCheckpoints: stats.totalCheckpoints,
      achievementsUnlocked: stats.achievementsUnlocked,
      totalAchievements: stats.totalAchievements,
      totalTimeSpentMs: stats.totalTimeSpent,
      incidentsSolved: stats.incidentsSolved,
      totalIncidents: stats.totalIncidents,
      examBestScore: stats.examBestScore,
      examTotalQuestions: stats.examTotalQuestions,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distributed-systems-field-sheet.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archival Field Sheet SVG downloaded.', 'success');
  };

  const visibleQuestions =
    viewMode === 'booklet' ? EXAM_QUESTIONS : [EXAM_QUESTIONS[activeIndex]];

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · SYSTEMS MASTERY ASSESSMENT</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums text-[var(--ink)]">
              PERSONAL BEST: {stats.examBestScore}/{stats.examTotalQuestions}
            </span>
            {isAlreadyFellow ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--emerald)] text-[#FAF7F1] font-semibold">
                <Award className="w-3.5 h-3.5" />
                ATLAS FELLOW VERIFIED
              </span>
            ) : (
              <span className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--chassis)] text-[var(--ink-secondary)]">
                PASS THRESHOLD: {EXAM_PASS_THRESHOLD}/{TOTAL_EXAM_QUESTIONS}
              </span>
            )}
          </div>
        </div>

        {/* Editorial Title Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
              Distributed Systems Mastery Exam
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Ten cross-domain verification problems spanning logical causality, consensus safety,
              quorum math, consistent hashing, and atomic coordination. Score{' '}
              <span className="font-mono font-semibold text-[var(--ink)]">
                {EXAM_PASS_THRESHOLD}/{TOTAL_EXAM_QUESTIONS}
              </span>{' '}
              or higher to earn the{' '}
              <span className="font-semibold text-[var(--emerald)]">Atlas Fellow</span> seal on your
              Archival Field Sheet.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2">
            {!submitted && (
              <div
                role="group"
                aria-label="Exam display mode"
                className="inline-flex border border-[var(--ink)] bg-[var(--paper-elevated)] font-mono text-[11px] uppercase tracking-wider"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'focus'}
                  onClick={() => setViewMode('focus')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors ${
                    viewMode === 'focus'
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                      : 'text-[var(--ink)] hover:bg-[var(--chassis)]'
                  }`}
                >
                  <SquareCheck className="w-3.5 h-3.5" />
                  <span>Focus</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'booklet'}
                  onClick={() => setViewMode('booklet')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors ${
                    viewMode === 'booklet'
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                      : 'text-[var(--ink)] hover:bg-[var(--chassis)]'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>All 10</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Post-Submission Diagnostic Scoreboard */}
        {submitted && (
          <section className="mb-10 border-2 border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[6px_6px_0_0_var(--ink)]">
            <div className="p-6 border-b border-[var(--rule)] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--paper)]">
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Official Assessment Verdict
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span
                    className={`font-editorial text-5xl tabular-nums ${
                      result.passed ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                    }`}
                  >
                    {result.score}
                    <span className="text-2xl text-[var(--ink-muted)]">/{result.total}</span>
                  </span>
                  <span className="font-mono text-sm font-semibold uppercase tracking-wider text-[var(--ink)]">
                    ({result.percentage}%)
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 font-semibold ${
                      result.passed
                        ? 'bg-[var(--emerald)] text-[#FAF7F1]'
                        : 'bg-[var(--signal)] text-[#FAF7F1]'
                    }`}
                  >
                    {result.passed ? 'ATLAS FELLOW SEAL EARNED' : 'REVIEW MISSED DOMAINS'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--ink-secondary)]">
                  {result.passed
                    ? 'Your score has been recorded in the Study Ledger and verified on your downloadable Archival Field Sheet.'
                    : `Score ${EXAM_PASS_THRESHOLD}/${result.total} or higher to unlock the Atlas Fellow seal. Inspect the linked plates below and retake anytime.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadFieldSheet}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] hover:bg-[var(--emerald)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Field Sheet SVG</span>
                </button>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Exam</span>
                </button>
              </div>
            </div>

            {/* Domain Mastery Breakdown */}
            <div className="p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-4">
                Domain Diagnostic Breakdown (2 Problems per Domain)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {result.byDomain.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                  const barColor =
                    d.correct === d.total
                      ? 'bg-[var(--emerald)]'
                      : d.correct > 0
                      ? 'bg-[var(--cobalt)]'
                      : 'bg-[var(--signal)]';
                  return (
                    <div
                      key={d.domainId}
                      className="p-3.5 border border-[var(--rule)] bg-[var(--paper)] flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono text-[10px] text-[var(--signal)] font-semibold">
                          § {d.domainIndex}
                        </div>
                        <div className="text-xs font-medium text-[var(--ink)] mt-0.5 leading-snug">
                          {d.domainLabel}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums mb-1">
                          <span className="text-[var(--ink-secondary)]">Score</span>
                          <span className="font-semibold text-[var(--ink)]">
                            {d.correct}/{d.total}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--chassis)] overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Question Progress Rail */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 p-3 border border-[var(--rule)] bg-[var(--paper-elevated)]">
          <div className="flex flex-wrap items-center gap-1.5">
            {EXAM_QUESTIONS.map((q, idx) => {
              const detail = result.details[idx];
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = viewMode === 'focus' && activeIndex === idx;

              let btnStyle =
                'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]';
              if (submitted) {
                btnStyle = detail.isCorrect
                  ? 'bg-[var(--emerald)] text-[#FAF7F1] border-[var(--emerald)]'
                  : 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]';
              } else if (isCurrent) {
                btnStyle = 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]';
              } else if (isAnswered) {
                btnStyle = 'bg-[var(--cobalt)]/12 text-[var(--cobalt)] border-[var(--cobalt)]';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => {
                    setActiveIndex(idx);
                    if (submitted) {
                      const el = document.getElementById(q.id);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className={`w-8 h-8 font-mono text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${btnStyle}`}
                  aria-label={`Jump to question ${q.number}${isAnswered ? ' (answered)' : ''}`}
                >
                  {q.number}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider">
            <span
              className="text-[var(--ink-secondary)] tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {answeredCount}/{TOTAL_EXAM_QUESTIONS} Answered
            </span>
            {!submitted && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={answeredCount === 0}
                className="px-4 py-1.5 bg-[var(--signal)] hover:bg-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed text-[#FAF7F1] font-semibold transition-colors cursor-pointer"
              >
                Grade Exam
              </button>
            )}
          </div>
        </div>

        {/* Question Booklet / Focus Cards */}
        <div className="space-y-6">
          {visibleQuestions.map((question) => {
            const qIndex = EXAM_QUESTIONS.findIndex((item) => item.id === question.id);
            const domain = CONCEPT_DOMAINS_BY_ID.get(question.domainId);
            const concept = CONCEPTS_BY_ID.get(question.conceptId);
            const selected = answers[question.id];
            const isCorrect = submitted && selected === question.correctIndex;

            return (
              <article
                id={question.id}
                key={question.id}
                className="border border-[var(--ink)] bg-[var(--paper-elevated)]"
              >
                {/* Question Meta Bar */}
                <div className="px-5 py-3 border-b border-[var(--rule)] bg-[var(--chassis)]/65 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-[var(--ink)] text-[#FAF7F1] font-semibold">
                      Q{question.number} / {TOTAL_EXAM_QUESTIONS}
                    </span>
                    {domain && (
                      <span className="text-[var(--signal)] font-semibold">
                        § {domain.index} · {domain.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[var(--ink-muted)]">{question.citation}</span>
                </div>

                {/* Question Body */}
                <div className="p-6 space-y-5">
                  <h2 className="font-editorial text-xl sm:text-2xl leading-snug text-[var(--ink)]">
                    {question.prompt}
                  </h2>

                  {/* 4 Options */}
                  <div
                    role="group"
                    aria-label={`Answer choices for question ${question.number}`}
                    className="space-y-2.5"
                  >
                    {question.options.map((optionText, optIdx) => {
                      const isPicked = selected === optIdx;
                      const isRightOption = optIdx === question.correctIndex;

                      let optionClasses =
                        'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]';
                      let letterClasses =
                        'bg-[var(--paper-elevated)] border-[var(--rule)] text-[var(--ink-secondary)]';

                      if (!submitted && isPicked) {
                        optionClasses =
                          'bg-[var(--cobalt)]/10 border-[var(--cobalt)] text-[var(--ink)]';
                        letterClasses =
                          'bg-[var(--cobalt)] border-[var(--cobalt)] text-[#FAF7F1]';
                      } else if (submitted) {
                        if (isRightOption) {
                          optionClasses =
                            'bg-[var(--emerald)]/12 border-[var(--emerald)] text-[var(--ink)]';
                          letterClasses =
                            'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]';
                        } else if (isPicked && !isRightOption) {
                          optionClasses =
                            'bg-[var(--signal)]/10 border-[var(--signal)] text-[var(--ink)]';
                          letterClasses =
                            'bg-[var(--signal)] border-[var(--signal)] text-[#FAF7F1]';
                        } else {
                          optionClasses =
                            'bg-[var(--paper)]/60 border-[var(--rule)] text-[var(--ink-muted)] opacity-75';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={submitted}
                          aria-pressed={isPicked}
                          onClick={() => handleSelectOption(question.id, optIdx)}
                          className={`w-full text-left p-3.5 border flex items-start gap-3.5 transition-colors ${
                            submitted ? 'cursor-default' : 'cursor-pointer'
                          } ${optionClasses}`}
                        >
                          <span
                            className={`w-6 h-6 border flex items-center justify-center flex-shrink-0 font-mono text-xs font-semibold mt-0.5 ${letterClasses}`}
                          >
                            {OPTION_LETTERS[optIdx]}
                          </span>
                          <span className="text-sm leading-relaxed flex-1">{optionText}</span>
                          {submitted && isRightOption && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 mt-1" />
                          )}
                          {submitted && isPicked && !isRightOption && (
                            <XCircle className="w-4 h-4 text-[var(--signal)] flex-shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Post-Submission Formal Debrief */}
                  {submitted && (
                    <div
                      className={`p-4 border-l-4 ${
                        isCorrect
                          ? 'bg-[var(--emerald)]/8 border-[var(--emerald)]'
                          : 'bg-[var(--signal)]/8 border-[var(--signal)]'
                      } space-y-2.5`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                            isCorrect ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                          }`}
                        >
                          {isCorrect
                            ? 'Verified Correct'
                            : selected === undefined
                            ? `Unanswered · Correct Answer: ${OPTION_LETTERS[question.correctIndex]}`
                            : `Incorrect · Correct Answer: ${OPTION_LETTERS[question.correctIndex]}`}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 bg-[#111413] text-[#F4F0E8]">
                          {question.formula}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                        {question.explanation}
                      </p>
                      {concept && (
                        <div className="pt-1">
                          <Link
                            href={concept.path}
                            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[var(--cobalt)] hover:text-[var(--signal)] transition-colors"
                          >
                            <span>
                              Inspect Plate {concept.plateNumber} · {concept.name}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Focus Mode Footer Navigation */}
                  {!submitted && viewMode === 'focus' && (
                    <div className="pt-3 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={qIndex === 0}
                        title="Previous question (←)"
                        onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[var(--rule)] hover:border-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs uppercase tracking-wider text-[var(--ink)] cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                        Keys: A–D / 1–4 select · ← / → switch
                      </span>

                      {qIndex < EXAM_QUESTIONS.length - 1 ? (
                        <button
                          type="button"
                          title="Next question (→)"
                          onClick={() =>
                            setActiveIndex((i) => Math.min(EXAM_QUESTIONS.length - 1, i + 1))
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--ink)] hover:bg-[var(--cobalt)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={answeredCount === 0}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-[var(--signal)] hover:bg-[var(--ink)] disabled:opacity-40 text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-semibold cursor-pointer transition-colors"
                        >
                          <span>Submit &amp; Grade Exam ({answeredCount}/{TOTAL_EXAM_QUESTIONS})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Booklet Mode Bottom Submit Bar */}
        {!submitted && viewMode === 'booklet' && (
          <div className="mt-8 p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono text-xs text-[var(--ink-secondary)]">
              Answered <span className="font-semibold text-[var(--ink)]">{answeredCount}</span> of{' '}
              <span className="font-semibold text-[var(--ink)]">{TOTAL_EXAM_QUESTIONS}</span>{' '}
              questions. Pass threshold: {EXAM_PASS_THRESHOLD}/{TOTAL_EXAM_QUESTIONS}.
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={answeredCount === 0}
              className="px-6 py-2.5 bg-[var(--signal)] hover:bg-[var(--ink)] disabled:opacity-40 text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-semibold cursor-pointer transition-colors"
            >
              Submit &amp; Grade Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
