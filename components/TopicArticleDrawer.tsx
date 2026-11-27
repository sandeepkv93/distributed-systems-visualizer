'use client';

import { ReactNode, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

type TopicArticleDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function TopicArticleDrawer({
  open,
  title,
  onClose,
  children,
}: TopicArticleDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[#161614]/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-[var(--paper-elevated)] border-l border-[var(--ink)] shadow-[-8px_0_32px_rgba(22,22,20,0.2)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--ink)] bg-[var(--paper)]">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--signal)] mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Monograph Theory Notes</span>
            </div>
            <h2 className="font-editorial text-2xl text-[var(--ink)] leading-snug">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper-elevated)] border border-[rgba(22,22,20,0.28)] hover:bg-[var(--ink)] hover:text-[var(--paper-elevated)] font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] transition-colors cursor-pointer"
            aria-label="Close theory drawer"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="monograph-reader flex-1 overflow-y-auto px-6 sm:px-8 py-7 text-[var(--ink-secondary)]">
          {children}
        </div>
      </aside>
    </div>
  );
}
