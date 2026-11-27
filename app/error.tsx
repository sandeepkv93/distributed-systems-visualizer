'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ArrowUpRight, FlaskConical, RotateCcw } from 'lucide-react';
import { TOTAL_LABS } from '@/lib/labs-catalog';

export default function AtlasErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Distributed Systems Atlas runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-4 sm:px-6 py-16">
      <div
        role="alert"
        className="w-full max-w-2xl bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)]"
      >
        {/* Top Fault Rail */}
        <div className="px-6 py-3 border-b border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
          <span className="inline-flex items-center gap-1.5 text-[var(--signal)] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>RUNTIME FAULT · LOCAL RECOVERY</span>
          </span>
          {error.digest && (
            <span className="text-[var(--ink-muted)] tabular-nums">DIGEST {error.digest}</span>
          )}
        </div>

        {/* Main Content */}
        <div className="p-6 sm:p-8 space-y-5">
          <h1 className="font-editorial text-3xl sm:text-4xl leading-[1.1] tracking-[-0.02em] text-[var(--ink)] font-normal">
            This simulation encountered an unexpected{' '}
            <em className="italic text-[var(--signal)] font-normal">fault</em>.
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-secondary)]">
            Your study progress and scenario completions remain safely stored in your browser.
            Reset the current view to retry, or jump back to the monograph index.
          </p>

          {error.message && (
            <div className="p-3 bg-[var(--paper)] border border-[var(--rule)] font-mono text-xs text-[var(--ink-secondary)] break-words">
              {error.message}
            </div>
          )}

          {/* Recovery Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--signal)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-xs uppercase tracking-[0.1em] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atlas Home</span>
            </Link>

            <Link
              href="/labs"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span>All {TOTAL_LABS} Labs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
