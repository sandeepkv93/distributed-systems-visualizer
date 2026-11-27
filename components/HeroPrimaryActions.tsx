'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Award, FlaskConical } from 'lucide-react';
import { TOTAL_CONCEPTS } from '@/lib/catalog';
import { TOTAL_LABS } from '@/lib/labs-catalog';
import { getNextRecommendedPlate } from '@/lib/tracks';
import { useProgress } from '@/hooks/useProgress';

const QUICK_JUMP_TOOLS = [
  { href: '/map', label: 'Dependency Map' },
  { href: '/advisor', label: 'Protocol Advisor' },
  { href: '/systems', label: 'Real Systems' },
  { href: '/incidents', label: 'Outage Drills' },
  { href: '/interviews', label: 'Interview Studio' },
  { href: '/exam', label: 'Mastery Exam' },
] as const;

export default function HeroPrimaryActions() {
  const { progress } = useProgress();
  const completedCount = progress.conceptsCompleted.length;
  const recommended = getNextRecommendedPlate(progress.conceptsCompleted);

  const primaryCta =
    completedCount === 0
      ? {
          href: '/raft',
          label: 'Open Plate 20 · Raft',
          isExam: false,
        }
      : recommended
      ? {
          href: recommended.concept.path,
          label: `Resume Plate ${recommended.concept.plateNumber} · ${recommended.concept.navName}`,
          isExam: false,
        }
      : {
          href: '/exam',
          label: `Mastery Exam · ${TOTAL_CONCEPTS}/${TOTAL_CONCEPTS} Done`,
          isExam: true,
        };

  return (
    <div className="space-y-4 pt-2">
      {/* 3 Decisive Primary Actions (Zero Decision Fatigue) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={primaryCta.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
        >
          {primaryCta.isExam && <Award className="w-4 h-4 text-[#34D399]" />}
          <span>{primaryCta.label}</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>

        <Link
          href="/labs"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--emerald)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Explore All {TOTAL_LABS} Labs</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        <a
          href="#protocol-atlas"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)]/35 hover:border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
        >
          <span>Browse All {TOTAL_CONCEPTS} Plates</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Quiet Quick-Jump Index Strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
        <span className="uppercase tracking-[0.12em] text-[10px] text-[var(--ink-secondary)]">
          Quick jump:
        </span>
        {QUICK_JUMP_TOOLS.map((tool, idx) => (
          <span key={tool.href} className="inline-flex items-center gap-3">
            {idx > 0 && <span aria-hidden="true" className="opacity-35">·</span>}
            <Link
              href={tool.href}
              className="hover:text-[var(--signal)] hover:underline underline-offset-4 transition-colors"
            >
              {tool.label}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}
