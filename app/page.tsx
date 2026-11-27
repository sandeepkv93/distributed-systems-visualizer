import Link from 'next/link';
import ConceptGrid from '@/components/ConceptGrid';
import HeroSimulation from '@/components/HeroSimulation';
import LearningTracks from '@/components/LearningTracks';
import { TOTAL_CONCEPTS, TOTAL_SCENARIOS } from '@/lib/catalog';
import {
  ArrowDown,
  ArrowUpRight,
  Network,
  Scale,
  Sliders,
  AlertTriangle,
  Compass,
  Layers,
  Award,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Bibliographic Top Edition Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-10 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · DISTRIBUTED SYSTEMS MONOGRAPH</span>
          <div className="flex items-center gap-4 tabular-nums">
            <span>{TOTAL_CONCEPTS} INTERACTIVE PLATES</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{TOTAL_SCENARIOS} STEP-THROUGH SCENARIOS</span>
          </div>
        </div>

        {/* Asymmetric Editorial Hero + Live Interactive Telemetry Bench */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-editorial text-[2.75rem] sm:text-[3.75rem] lg:text-[4.35rem] leading-[1.02] tracking-[-0.028em] text-[var(--ink)] font-normal">
              How distributed machines{' '}
              <em className="italic text-[var(--signal)] font-normal">agree</em>, fail, and
              recover.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-[var(--ink-secondary)] max-w-2xl">
              An interactive field manual for the protocols underneath modern infrastructure. Step
              forward and backward through message rounds, sever network links, crash leaders, and
              inspect state transitions directly on the wire.
            </p>

            {/* Direct Action Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/raft"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <span>Open Plate 20 · Raft</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <Link
                href="/advisor"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>Protocol Advisor</span>
              </Link>

              <Link
                href="/systems"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--signal)]" />
                <span>Real Systems</span>
              </Link>

              <Link
                href="/exam"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-[var(--emerald)]" />
                <span>Mastery Exam</span>
              </Link>

              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Network className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>Dependency Map</span>
              </Link>

              <Link
                href="/bench"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-[var(--emerald)]" />
                <span>Quorum Bench</span>
              </Link>

              <Link
                href="/duel"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <Scale className="w-3.5 h-3.5 text-[var(--signal)]" />
                <span>Protocol Duel Lab</span>
              </Link>

              <Link
                href="/incidents"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--signal)]" />
                <span>Outage Drills</span>
              </Link>

              <a
                href="#protocol-atlas"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)]/30 hover:border-[var(--ink)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              >
                <span>Browse All {TOTAL_CONCEPTS} Plates</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quiet Monograph Specification Footnote */}
            <div className="pt-4 border-t border-[var(--rule)] grid grid-cols-3 gap-4 max-w-xl">
              <div>
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
                  Deterministic Engine
                </div>
                <div className="font-editorial text-lg text-[var(--ink)] mt-0.5">
                  Reversible steps
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
                  Failure Injection
                </div>
                <div className="font-editorial text-lg text-[var(--ink)] mt-0.5">
                  Crashes &amp; splits
                </div>
              </div>
              <Link href="/bibliography" className="group block">
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--cobalt)] group-hover:text-[var(--signal)] transition-colors">
                  Primary Sources →
                </div>
                <div className="font-editorial text-lg text-[var(--ink)] group-hover:underline mt-0.5">
                  1978 – 2014 papers
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column: Live Interactive 5-Node Raft Quorum Bench */}
          <div className="lg:col-span-5">
            <HeroSimulation />
          </div>
        </section>

        {/* Guided Curriculum Tracks */}
        <LearningTracks />

        {/* Full Protocol Atlas */}
        <ConceptGrid />

        {/* Technical Monograph Colophon */}
        <footer className="mt-20 pt-8 border-t border-[var(--ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[11px] text-[var(--ink-muted)]">
          <div className="space-y-1">
            <div className="text-[var(--ink)] uppercase tracking-[0.1em] font-semibold">
              Distributed Systems Atlas · Interactive Monograph
            </div>
            <div>
              Progress, scenario completions, and study time are stored locally in your browser.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 uppercase tracking-wider">
            <Link href="/outbox" className="text-[var(--emerald)] font-semibold hover:underline">
              Outbox &amp; CDC
            </Link>
            <span>·</span>
            <Link href="/resilience" className="text-[var(--signal)] font-semibold hover:underline">
              Resilience
            </Link>
            <span>·</span>
            <Link href="/streaming" className="text-[var(--cobalt)] font-semibold hover:underline">
              Streaming
            </Link>
            <span>·</span>
            <Link href="/caching" className="text-[var(--emerald)] font-semibold hover:underline">
              Caching
            </Link>
            <span>·</span>
            <Link href="/isolation" className="text-[var(--cobalt)] font-semibold hover:underline">
              Isolation
            </Link>
            <span>·</span>
            <Link href="/interviews" className="text-[var(--signal)] font-semibold hover:underline">
              Interviews
            </Link>
            <span>·</span>
            <Link href="/storage" className="text-[var(--emerald)] font-semibold hover:underline">
              Storage
            </Link>
            <span>·</span>
            <Link href="/queueing" className="text-[var(--cobalt)] font-semibold hover:underline">
              Queueing
            </Link>
            <span>·</span>
            <Link href="/theorems" className="text-[var(--signal)] font-semibold hover:underline">
              Theorems
            </Link>
            <span>·</span>
            <Link href="/glossary" className="text-[var(--cobalt)] hover:underline">
              Glossary
            </Link>
            <span>·</span>
            <Link href="/runbooks" className="text-[var(--signal)] hover:underline">
              Runbooks
            </Link>
            <span>·</span>
            <Link href="/studio" className="text-[var(--signal)] font-semibold hover:underline">
              Stack Studio
            </Link>
            <span>·</span>
            <Link href="/clocks" className="text-[var(--cobalt)] hover:underline">
              HLC Clocks
            </Link>
            <span>·</span>
            <Link href="/drills" className="text-[var(--emerald)] font-semibold hover:underline">
              Flashcards
            </Link>
            <span>·</span>
            <Link href="/consistency" className="text-[var(--signal)] hover:underline">
              Consistency
            </Link>
            <span>·</span>
            <Link href="/latency" className="text-[var(--cobalt)] hover:underline">
              Latency
            </Link>
            <span>·</span>
            <Link href="/exam" className="text-[var(--emerald)] font-semibold hover:underline">
              Mastery Exam
            </Link>
            <span>·</span>
            <Link href="/systems" className="text-[var(--signal)] hover:underline">
              Real Systems
            </Link>
            <span>·</span>
            <Link href="/advisor" className="text-[var(--cobalt)] hover:underline">
              Advisor
            </Link>
            <span>·</span>
            <Link href="/bibliography" className="text-[var(--cobalt)] hover:underline">
              Bibliography
            </Link>
            <span>·</span>
            <span>⌘K Jump</span>
            <span>·</span>
            <span>Space Play</span>
            <span>·</span>
            <span>←/→ Step</span>
            <span>·</span>
            <span>R Reset</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
