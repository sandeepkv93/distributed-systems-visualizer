'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Award,
} from 'lucide-react';
import {
  DRILL_MASTER_SEAL_THRESHOLD,
  computeDrillStats,
  filterDrills,
} from '@/lib/drills';
import {
  CONCEPTS_BY_ID,
  CONCEPT_DOMAINS,
  CONCEPT_DOMAINS_BY_ID,
  ConceptDomainId,
} from '@/lib/catalog';
import { markDrillMastered, unmarkDrillMastered } from '@/lib/progress';
import { useProgress } from '@/hooks/useProgress';
import { showToast } from '@/lib/toast';

export default function DrillsPage() {
  const { progress } = useProgress();
  const [domainFilter, setDomainFilter] = useState<ConceptDomainId | 'all'>('all');
  const [unmasteredOnly, setUnmasteredOnly] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const masteredSet = useMemo(
    () => new Set(progress.drillsMastered ?? []),
    [progress.drillsMastered]
  );

  const drillStats = useMemo(
    () => computeDrillStats(progress.drillsMastered ?? []),
    [progress.drillsMastered]
  );

  const deck = useMemo(() => {
    const base = filterDrills(domainFilter);
    return unmasteredOnly ? base.filter((c) => !masteredSet.has(c.id)) : base;
  }, [domainFilter, unmasteredOnly, masteredSet]);

  const safeIndex = deck.length > 0 ? Math.min(cardIndex, deck.length - 1) : 0;
  const activeCard = deck[safeIndex] ?? null;

  const goNext = useCallback(() => {
    if (deck.length === 0) return;
    setRevealed(false);
    setCardIndex((idx) => (idx + 1) % deck.length);
  }, [deck.length]);

  const goPrev = useCallback(() => {
    if (deck.length === 0) return;
    setRevealed(false);
    setCardIndex((idx) => (idx - 1 + deck.length) % deck.length);
  }, [deck.length]);

  const handleRate = useCallback(
    (rating: 'again' | 'good' | 'mastered') => {
      if (!activeCard) return;
      if (rating === 'mastered') {
        const wasMastered = masteredSet.has(activeCard.id);
        markDrillMastered(activeCard.id);
        if (!wasMastered) {
          showToast('Flashcard marked Mastered in Study Ledger.', 'success');
        }
      } else if (rating === 'again') {
        unmarkDrillMastered(activeCard.id);
      }
      setRevealed(false);
      if (deck.length > 1) {
        setCardIndex((idx) => (idx + 1) % deck.length);
      }
    },
    [activeCard, deck.length, masteredSet]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === 'Space') {
        event.preventDefault();
        setRevealed((r) => !r);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (revealed && event.key === '1') {
        event.preventDefault();
        handleRate('again');
      } else if (revealed && event.key === '2') {
        event.preventDefault();
        handleRate('good');
      } else if (revealed && event.key === '3') {
        event.preventDefault();
        handleRate('mastered');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, handleRate, revealed]);

  const activeConcept = activeCard ? CONCEPTS_BY_ID.get(activeCard.conceptId) ?? null : null;
  const activeDomain = activeCard ? CONCEPT_DOMAINS_BY_ID.get(activeCard.domainId) ?? null : null;
  const isCardMastered = activeCard ? masteredSet.has(activeCard.id) : false;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · ACTIVE-RECALL FLASHCARDS &amp; INTERVIEW DRILL</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums text-[var(--ink)]">
              MASTERED: {drillStats.masteredCount}/{drillStats.totalCount} ({drillStats.percentage}%)
            </span>
            {drillStats.sealEarned ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--emerald)] text-[#FAF7F1] font-semibold">
                <Award className="w-3.5 h-3.5" />
                FLASHCARD SCHOLAR
              </span>
            ) : (
              <span className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--chassis)] text-[var(--ink-secondary)]">
                SEAL AT {DRILL_MASTER_SEAL_THRESHOLD}/22
              </span>
            )}
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Protocol Flashcards &amp; Recall Studio
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Drill formal invariants, message bounds, and failure windows across all 22 Atlas
              plates. Press <kbd className="px-1.5 py-0.5 border border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-xs">Space</kbd> to
              flip, <kbd className="px-1.5 py-0.5 border border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-xs">1</kbd>–<kbd className="px-1.5 py-0.5 border border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-xs">3</kbd> to
              rate, or <kbd className="px-1.5 py-0.5 border border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-xs">←</kbd>/<kbd className="px-1.5 py-0.5 border border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-xs">→</kbd> to step.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              href="/exam"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--ink)] hover:text-[#FAF7F1] border border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors"
            >
              <span>Ready? Take 10-Question Exam</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Mastery Progress Bar */}
        <div className="mb-6">
          <div className="w-full h-2 bg-[var(--chassis)] border border-[var(--rule)] overflow-hidden">
            <div
              className="h-full bg-[var(--emerald)] transition-all duration-300"
              style={{ width: `${drillStats.percentage}%` }}
            />
          </div>
        </div>

        {/* Domain Filter Bar + Unmastered Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDomainFilter('all');
                setCardIndex(0);
                setRevealed(false);
              }}
              className={`px-3 py-1.5 border font-mono text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
                domainFilter === 'all'
                  ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              All 22 Plates
            </button>
            {CONCEPT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => {
                  setDomainFilter(domain.id);
                  setCardIndex(0);
                  setRevealed(false);
                }}
                className={`px-3 py-1.5 border font-mono text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
                  domainFilter === domain.id
                    ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                § {domain.index} {domain.shortLabel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setUnmasteredOnly((prev) => !prev);
              setCardIndex(0);
              setRevealed(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
              unmasteredOnly
                ? 'bg-[var(--cobalt)] text-[#FAF7F1] border-[var(--cobalt)]'
                : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{unmasteredOnly ? 'Showing Unmastered Only' : 'Filter Unmastered'}</span>
          </button>
        </div>

        {/* Active Archival Index Card */}
        {activeCard ? (
          <section className="mb-10 border-2 border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[8px_8px_0_0_var(--ink)]">
            {/* Card Masthead */}
            <div className="px-6 py-3.5 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2 py-0.5 bg-[var(--ink)] text-[#FAF7F1] font-semibold tabular-nums">
                  CARD {String(safeIndex + 1).padStart(2, '0')} / {String(deck.length).padStart(2, '0')}
                </span>
                {activeConcept && (
                  <span className="text-[var(--signal)] font-semibold">
                    PLATE {activeConcept.plateNumber} · {activeConcept.name}
                  </span>
                )}
                {activeDomain && (
                  <span className="hidden sm:inline text-[var(--ink-muted)]">
                    § {activeDomain.index} {activeDomain.shortLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)]">
                  {activeCard.category}
                </span>
                {isCardMastered && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--emerald)] text-[#FAF7F1] font-semibold">
                    <Check className="w-3 h-3" />
                    MASTERED
                  </span>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  Recall Prompt · {activeCard.citation}
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl leading-snug text-[var(--ink)]">
                  {activeCard.prompt}
                </h2>
              </div>

              {!revealed ? (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink)] hover:bg-[var(--signal)] text-[#FAF7F1] font-mono text-xs uppercase tracking-[0.12em] font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Reveal Formal Answer (Space)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 pt-4 border-t border-[var(--rule)]">
                  {/* Formula Banner */}
                  <div className="px-4 py-2.5 bg-[#111413] text-[#F4F0E8] font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#34D399] uppercase tracking-wider text-[10px] font-semibold">
                      Formal Property
                    </span>
                    <span className="font-semibold">{activeCard.formula}</span>
                  </div>

                  {/* Answer Explanation */}
                  <p className="text-sm sm:text-base text-[var(--ink)] leading-relaxed">
                    {activeCard.answer}
                  </p>

                  {/* Practical Takeaway */}
                  <div className="p-4 border-l-4 border-[var(--cobalt)] bg-[var(--cobalt)]/6 text-xs sm:text-sm text-[var(--ink-secondary)]">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--cobalt)] mr-2">
                      Production Note:
                    </span>
                    {activeCard.keyTakeaway}
                  </div>

                  {/* Rating Controls + Direct Plate Link */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRate('again')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--signal)] text-[var(--signal)] hover:bg-[var(--signal)] hover:text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>[1] Review Again</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('good')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--cobalt)] text-[var(--cobalt)] hover:bg-[var(--cobalt)] hover:text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                      >
                        <span>[2] Good · Next</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('mastered')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--emerald)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>[3] Mastered</span>
                      </button>
                    </div>

                    {activeConcept && (
                      <Link
                        href={activeConcept.path}
                        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-[var(--cobalt)] hover:text-[var(--signal)]"
                      >
                        <span>Open Plate {activeConcept.plateNumber}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Prev/Next */}
            <div className="px-6 py-3 border-t border-[var(--rule)] bg-[var(--paper)] flex items-center justify-between font-mono text-xs">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--ink)] uppercase tracking-wider cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider hidden sm:inline">
                Space Flip · 1/2/3 Rate · ←/→ Step
              </span>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--ink)] uppercase tracking-wider cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        ) : (
          <section className="mb-10 p-10 border-2 border-[var(--emerald)] bg-[var(--paper-elevated)] text-center space-y-3">
            <Award className="w-8 h-8 text-[var(--emerald)] mx-auto" />
            <h2 className="font-editorial text-2xl text-[var(--ink)]">
              Every card in this filter is mastered!
            </h2>
            <p className="text-sm text-[var(--ink-secondary)]">
              Switch off &ldquo;Unmastered Only&rdquo; or choose another domain to review your full
              22-plate deck.
            </p>
            <button
              type="button"
              onClick={() => setUnmasteredOnly(false)}
              className="px-4 py-2 bg-[var(--ink)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider cursor-pointer"
            >
              Show All Cards
            </button>
          </section>
        )}

        {/* Complete Deck Quick-Jump Index */}
        <section>
          <div className="flex items-baseline justify-between pb-2 mb-4 border-b border-[var(--ink)]">
            <h2 className="font-editorial text-2xl text-[var(--ink)]">Deck Index</h2>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] tabular-nums">
              {deck.length} cards shown
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {deck.map((card, idx) => {
              const concept = CONCEPTS_BY_ID.get(card.conceptId);
              const mastered = masteredSet.has(card.id);
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setCardIndex(idx);
                    setRevealed(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`p-3 border text-left transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    isCurrent
                      ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                      : mastered
                      ? 'bg-[var(--emerald)]/6 border-[var(--emerald)]/45 text-[var(--ink)] hover:border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                      <span className={isCurrent ? 'text-[#D9441E]' : 'text-[var(--ink-muted)]'}>
                        PL {concept?.plateNumber ?? '??'}
                      </span>
                      <span className={isCurrent ? 'text-[#D6D2C7]' : 'text-[var(--cobalt)]'}>
                        {card.category}
                      </span>
                    </div>
                    <div className="font-medium text-xs mt-1 truncate">
                      {concept?.name ?? card.conceptId}
                    </div>
                  </div>
                  {mastered && (
                    <span
                      className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                        isCurrent
                          ? 'bg-[#34D399] text-[#111413]'
                          : 'bg-[var(--emerald)] text-[#FAF7F1]'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
