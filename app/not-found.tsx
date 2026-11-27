import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, FlaskConical, Search } from 'lucide-react';
import { TOTAL_CONCEPTS } from '@/lib/catalog';
import { TOTAL_LABS } from '@/lib/labs-catalog';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-4 sm:px-6 py-16">
      <div className="w-full max-w-2xl bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)]">
        {/* Top Archival Error Rail */}
        <div className="px-6 py-3 border-b border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
          <span className="text-[var(--signal)] font-semibold">
            HTTP 404 · UNREACHABLE PARTITION
          </span>
          <span className="text-[var(--ink-muted)] tabular-nums">
            {TOTAL_CONCEPTS} PLATES · {TOTAL_LABS} LABS
          </span>
        </div>

        {/* Main Message */}
        <div className="p-6 sm:p-8 space-y-5">
          <h1 className="font-editorial text-3xl sm:text-4xl leading-[1.1] tracking-[-0.02em] text-[var(--ink)] font-normal">
            No replica holds state at this{' '}
            <em className="italic text-[var(--signal)] font-normal">address</em>.
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-secondary)]">
            The protocol plate or workbench route you requested does not exist in this edition of
            the Distributed Systems Atlas. Jump back to the monograph index, browse the full
            workbenches directory, or press{' '}
            <kbd className="px-1.5 py-0.5 bg-[var(--chassis)] border border-[var(--rule)] font-mono text-xs text-[var(--ink)]">
              ⌘K
            </kbd>{' '}
            to search all plates, scenarios, papers, and glossary entries.
          </p>

          {/* Direct Recovery Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atlas Home</span>
            </Link>

            <Link
              href="/labs"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--emerald)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>All {TOTAL_LABS} Labs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/raft"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
            >
              <span>Plate 20 · Raft</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom Hint Rail */}
        <div className="px-6 py-3 border-t border-[var(--rule)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Search className="w-3 h-3" />
            <span>Press ⌘K / Ctrl+K to jump anywhere</span>
          </span>
          <span>DS ATLAS · VOLUME I</span>
        </div>
      </div>
    </div>
  );
}
