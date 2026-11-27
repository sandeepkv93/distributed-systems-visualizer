'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { LEARNING_TRACKS } from '@/lib/tracks';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import { useProgress } from '@/hooks/useProgress';

export default function LearningTracks() {
  const { progress } = useProgress();

  return (
    <section className="mb-16">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 mb-6 border-b border-[var(--ink)]">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--signal)]">
            CURRICULUM
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl text-[var(--ink)]">
            Guided Reading Tracks
          </h2>
        </div>
        <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider">
          Sequential Textbook Paths · 4 Tracks
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEARNING_TRACKS.map((track) => {
          const completedIds = track.conceptIds.filter((id) =>
            progress.conceptsCompleted.includes(id)
          );
          const completedCount = completedIds.length;
          const totalCount = track.conceptIds.length;
          const isComplete = completedCount === totalCount;
          const pct = Math.round((completedCount / totalCount) * 100);

          const nextConceptId =
            track.conceptIds.find((id) => !progress.conceptsCompleted.includes(id)) ??
            track.conceptIds[0];
          const nextConcept = CONCEPTS_BY_ID.get(nextConceptId);

          return (
            <div
              key={track.id}
              className="border border-[var(--rule)] bg-[var(--paper-elevated)] flex flex-col justify-between p-5 hover:border-[var(--ink)] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] mb-2.5">
                  <span className="text-[var(--signal)] font-semibold">TRACK {track.number}</span>
                  <span className="text-[var(--ink-muted)] tabular-nums">
                    ~{track.estimatedMinutes} MIN · {totalCount} PLATES
                  </span>
                </div>

                <h3 className="font-editorial text-xl text-[var(--ink)] leading-snug mb-2">
                  {track.title}
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-4">
                  {track.subtitle}
                </p>

                {/* Compact plate sequence rail */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {track.conceptIds.map((id) => {
                    const c = CONCEPTS_BY_ID.get(id);
                    if (!c) return null;
                    const done = progress.conceptsCompleted.includes(id);
                    return (
                      <Link
                        key={id}
                        href={c.path}
                        title={c.name}
                        aria-label={`Plate ${c.plateNumber}: ${c.name}${done ? ' (completed)' : ''}`}
                        className={`font-mono text-[10px] px-1.5 py-0.5 border tabular-nums transition-colors ${
                          done
                            ? 'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]'
                            : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-secondary)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {c.plateNumber}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rule)] space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] tabular-nums uppercase">
                  <span>
                    {completedCount}/{totalCount} completed
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1 bg-[var(--chassis)] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isComplete ? 'bg-[var(--emerald)]' : 'bg-[var(--signal)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {nextConcept && (
                  <Link
                    href={nextConcept.path}
                    className="w-full inline-flex items-center justify-between gap-2 pt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] hover:text-[var(--signal)] transition-colors"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {isComplete ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--emerald)] stroke-[2.5]" />
                          Review: {nextConcept.navName}
                        </>
                      ) : completedCount > 0 ? (
                        <>Continue: {nextConcept.navName}</>
                      ) : (
                        <>Start: {nextConcept.navName}</>
                      )}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
