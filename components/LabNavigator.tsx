'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, FlaskConical } from 'lucide-react';
import { getLabContextForPath, TOTAL_LABS } from '@/lib/labs-catalog';

export default function LabNavigator({ path }: { path: string }) {
  const router = useRouter();
  const ctx = getLabContextForPath(path);

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
      aria-label="Workbench section navigation"
      className="min-h-11 px-4 sm:px-6 py-2 bg-[var(--paper-elevated)] border-t border-[var(--rule)] flex items-center justify-between gap-4 font-mono text-[11px] print-hide"
    >
      {/* Previous Lab in Section */}
      <div className="min-w-0 flex-1">
        {ctx.prev ? (
          <Link
            href={ctx.prev.path}
            title={`Previous lab: ${ctx.prev.title} ([)`}
            className="inline-flex items-center gap-1.5 py-1 text-[var(--ink-secondary)] hover:text-[var(--signal)] transition-colors max-w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{ctx.prev.shortTitle}</span>
          </Link>
        ) : (
          <Link
            href="/labs"
            className="inline-flex items-center gap-1.5 py-1 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span>All {TOTAL_LABS} Labs</span>
          </Link>
        )}
      </div>

      {/* Center Section Context + Sibling Step Dots */}
      <div className="hidden md:flex items-center gap-3 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)] flex-shrink-0">
        <Link
          href={`/labs?category=${encodeURIComponent(ctx.category.id)}`}
          className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
        >
          <FlaskConical className="w-3 h-3 text-[var(--emerald)]" />
          <span className="text-[var(--signal)] font-semibold">
            SECTION {ctx.category.index}
          </span>
          <span>{ctx.category.shortLabel}</span>
        </Link>
        <div
          className="flex items-center gap-1"
          aria-label={`Lab ${ctx.index + 1} of ${ctx.total} in ${ctx.category.shortLabel}`}
        >
          {ctx.siblings.map((sibling) => {
            const isCurrent = sibling.id === ctx.lab.id;
            return (
              <Link
                key={sibling.id}
                href={sibling.path}
                title={sibling.title}
                aria-label={sibling.title}
                className={`block h-1.5 transition-all ${
                  isCurrent
                    ? 'w-4 bg-[var(--signal)]'
                    : 'w-2 bg-[var(--ink)]/20 hover:bg-[var(--ink)]/55'
                }`}
              />
            );
          })}
        </div>
        <span className="tabular-nums text-[var(--ink)]">
          {ctx.index + 1}/{ctx.total}
        </span>
      </div>

      {/* Next Lab in Section */}
      <div className="min-w-0 flex-1 flex justify-end">
        {ctx.next ? (
          <Link
            href={ctx.next.path}
            title={`Next lab: ${ctx.next.title} (])`}
            className="inline-flex items-center gap-1.5 py-1 text-[var(--ink)] hover:text-[var(--signal)] font-medium transition-colors max-w-full"
          >
            <span className="truncate">{ctx.next.shortTitle}</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
        ) : (
          <Link
            href="/labs"
            className="inline-flex items-center gap-1.5 py-1 text-[var(--emerald)] hover:text-[var(--signal)] font-medium transition-colors"
          >
            <span>All {TOTAL_LABS} Workbenches</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
        )}
      </div>
    </nav>
  );
}
