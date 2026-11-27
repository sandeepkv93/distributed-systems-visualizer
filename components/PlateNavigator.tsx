'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTrackContextForConcept } from '@/lib/tracks';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import { useProgress } from '@/hooks/useProgress';

export default function PlateNavigator({ conceptId }: { conceptId: string }) {
  const router = useRouter();
  const ctx = getTrackContextForConcept(conceptId);
  const { progress } = useProgress();

  const prevPath = ctx?.prev?.path ?? null;
  const nextPath = ctx?.next?.path ?? null;

  useEffect(() => {
    if (!prevPath && !nextPath) return;
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
      if (event.key === '[' && prevPath) {
        event.preventDefault();
        router.push(prevPath);
      } else if (event.key === ']' && nextPath) {
        event.preventDefault();
        router.push(nextPath);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPath, nextPath, router]);

  if (!ctx) return null;

  return (
    <nav
      aria-label="Track plate navigation"
      className="min-h-11 px-4 sm:px-6 py-2 bg-[var(--paper-elevated)] border-t border-[var(--rule)] flex items-center justify-between gap-4 font-mono text-[11px] print-hide"
    >
      {/* Previous Plate */}
      <div className="min-w-0 flex-1">
        {ctx.prev ? (
          <Link
            href={ctx.prev.path}
            title={`Previous plate: ${ctx.prev.name} ([)`}
            className="inline-flex items-center gap-1.5 text-[var(--ink-secondary)] hover:text-[var(--signal)] transition-colors max-w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline text-[var(--ink-muted)] tabular-nums">
              {ctx.prev.plateNumber}
            </span>
            <span className="truncate">{ctx.prev.navName}</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Atlas Home</span>
          </Link>
        )}
      </div>

      {/* Center Track Position & Step Dots */}
      <div className="hidden md:flex items-center gap-3 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)] flex-shrink-0">
        <span className="text-[var(--signal)] font-semibold">TRACK {ctx.track.number}</span>
        <span>{ctx.track.title}</span>
        <div className="flex items-center gap-1" aria-label={`Plate ${ctx.index + 1} of ${ctx.total}`}>
          {ctx.track.conceptIds.map((id) => {
            const c = CONCEPTS_BY_ID.get(id);
            const isCurrent = id === conceptId;
            const isDone = progress.conceptsCompleted.includes(id);
            return (
              <Link
                key={id}
                href={c?.path ?? '/'}
                title={c?.name ?? id}
                className={`block h-1.5 transition-all ${
                  isCurrent
                    ? 'w-4 bg-[var(--signal)]'
                    : isDone
                    ? 'w-2 bg-[var(--emerald)]'
                    : 'w-2 bg-[var(--ink)]/20 hover:bg-[var(--ink)]/50'
                }`}
              />
            );
          })}
        </div>
        <span className="tabular-nums text-[var(--ink)]">
          {ctx.index + 1}/{ctx.total}
        </span>
      </div>

      {/* Next Plate */}
      <div className="min-w-0 flex-1 flex justify-end">
        {ctx.next ? (
          <Link
            href={ctx.next.path}
            title={`Next plate: ${ctx.next.name} (])`}
            className="inline-flex items-center gap-1.5 text-[var(--ink)] hover:text-[var(--signal)] font-medium transition-colors max-w-full"
          >
            <span className="truncate">{ctx.next.navName}</span>
            <span className="hidden sm:inline text-[var(--ink-muted)] tabular-nums">
              {ctx.next.plateNumber}
            </span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[var(--emerald)] hover:text-[var(--signal)] font-medium transition-colors"
          >
            <span>Track Complete · Atlas</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
        )}
      </div>
    </nav>
  );
}
