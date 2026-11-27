'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Filter,
  FlaskConical,
  Layers,
  Search,
  X,
} from 'lucide-react';
import {
  LAB_CATEGORIES,
  LAB_CATEGORIES_BY_ID,
  LABS_CATALOG,
  TOTAL_LABS,
  filterLabs,
  getCategoryCounts,
  type LabCatalogEntry,
  type LabCategoryId,
  type LabTone,
} from '@/lib/labs-catalog';
import { CONCEPTS_CATALOG, TOTAL_CONCEPTS, TOTAL_SCENARIOS } from '@/lib/catalog';

const CONCEPTS_BY_ID = new Map(CONCEPTS_CATALOG.map((c) => [c.id, c]));

const VALID_CATEGORY_IDS = new Set<string>(LAB_CATEGORIES.map((c) => c.id));

function toneBadgeClass(tone: LabTone): string {
  switch (tone) {
    case 'signal':
      return 'bg-[var(--signal)] text-[#FAF7F1]';
    case 'cobalt':
      return 'bg-[var(--cobalt)] text-[#FAF7F1]';
    case 'emerald':
      return 'bg-[var(--emerald)] text-[#FAF7F1]';
  }
}

function toneBorderHoverClass(tone: LabTone): string {
  switch (tone) {
    case 'signal':
      return 'hover:border-[var(--signal)]';
    case 'cobalt':
      return 'hover:border-[var(--cobalt)]';
    case 'emerald':
      return 'hover:border-[var(--emerald)]';
  }
}

function toneTextClass(tone: LabTone): string {
  switch (tone) {
    case 'signal':
      return 'text-[var(--signal)]';
    case 'cobalt':
      return 'text-[var(--cobalt)]';
    case 'emerald':
      return 'text-[var(--emerald)]';
  }
}

function LabCard({ lab }: { lab: LabCatalogEntry }) {
  const category = LAB_CATEGORIES_BY_ID.get(lab.categoryId);

  return (
    <div
      className={`group flex flex-col justify-between bg-[var(--paper-elevated)] border border-[var(--rule)] ${toneBorderHoverClass(
        lab.tone
      )} transition-colors p-5`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 flex-shrink-0 ${toneBadgeClass(
                lab.tone
              )}`}
            >
              {lab.badge}
            </span>
            {lab.featured && (
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--chassis)] text-[var(--ink-secondary)] border border-[var(--rule)]">
                CORE
              </span>
            )}
          </div>
          {category && (
            <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums flex-shrink-0">
              {category.index} · {category.shortLabel}
            </span>
          )}
        </div>

        <Link href={lab.path} className="block group/link">
          <h3 className="font-editorial text-xl leading-snug text-[var(--ink)] group-hover/link:text-[var(--signal)] transition-colors flex items-start justify-between gap-2">
            <span>{lab.title}</span>
            <ArrowUpRight className="w-4 h-4 flex-shrink-0 mt-1 text-[var(--ink-muted)] group-hover/link:text-[var(--signal)] transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">{lab.subtitle}</p>
        </Link>
      </div>

      {/* Linked Protocol Plates */}
      <div className="mt-4 pt-3 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {lab.relatedConceptIds.slice(0, 3).map((cid) => {
            const concept = CONCEPTS_BY_ID.get(cid);
            if (!concept) return null;
            return (
              <Link
                key={cid}
                href={concept.path}
                className="font-mono text-[10px] px-1.5 py-0.5 bg-[var(--chassis)] hover:bg-[var(--ink)] text-[var(--ink-secondary)] hover:text-[var(--paper-elevated)] border border-[var(--rule)] transition-colors"
              >
                PL {concept.plateNumber} · {concept.navName}
              </Link>
            );
          })}
        </div>

        <Link
          href={lab.path}
          className={`font-mono text-[10px] uppercase tracking-[0.1em] font-semibold hover:underline ${toneTextClass(
            lab.tone
          )}`}
        >
          Open Lab →
        </Link>
      </div>
    </div>
  );
}

export default function LabsDirectoryPage() {
  const [activeCategory, setActiveCategory] = useState<LabCategoryId | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    const q = params.get('q');
    if ((cat && VALID_CATEGORY_IDS.has(cat)) || q) {
      const timer = setTimeout(() => {
        if (cat && VALID_CATEGORY_IDS.has(cat)) {
          setActiveCategory(cat as LabCategoryId);
        }
        if (q) {
          setQuery(q);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const categoryCounts = useMemo(() => getCategoryCounts(), []);

  const filteredLabs = useMemo(
    () => filterLabs(activeCategory, query),
    [activeCategory, query]
  );

  const isGroupedMode = activeCategory === 'all' && query.trim() === '';

  const selectCategory = (cat: LabCategoryId | 'all') => {
    setActiveCategory(cat);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cat === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', cat);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Back Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[var(--ink-secondary)] hover:text-[var(--signal)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Atlas Home</span>
          </Link>
          <span className="tabular-nums">
            WORKBENCH INDEX · {TOTAL_LABS} INTERACTIVE LABS · {TOTAL_CONCEPTS} PROTOCOL PLATES
          </span>
        </div>

        {/* Hero Header + Dark Telemetry Summary Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase px-2 py-1 bg-[var(--ink)] text-[var(--paper-elevated)]">
              <FlaskConical className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Unified Workbenches &amp; Simulators Directory</span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.06] tracking-[-0.025em] text-[var(--ink)] font-normal">
              {TOTAL_LABS} Interactive Labs for{' '}
              <em className="italic text-[var(--signal)] font-normal">Systems Mastery</em>
            </h1>

            <p className="text-base leading-relaxed text-[var(--ink-secondary)] max-w-2xl">
              Beyond the {TOTAL_CONCEPTS} protocol plates ({TOTAL_SCENARIOS} step-through
              scenarios), this directory organizes every specialized calculator, failure simulator,
              storage bench, SRE playbook, and Staff-level interview studio in one searchable
              monograph index.
            </p>
          </div>

          {/* Obsidian Summary Strip */}
          <div className="lg:col-span-5 bg-[#111413] text-[#FAF7F1] border border-[var(--ink)] p-5 shadow-[5px_5px_0_0_var(--ink)]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15 font-mono text-[10px] tracking-[0.12em] uppercase text-white/60">
              <span>ATLAS TELEMETRY SUMMARY</span>
              <span className="text-[#34D399]">5 DOMAINS</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/5 border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Workbenches
                </div>
                <div className="font-mono text-2xl font-semibold text-[#34D399] tabular-nums mt-1">
                  {TOTAL_LABS}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Plates
                </div>
                <div className="font-mono text-2xl font-semibold text-[#60A5FA] tabular-nums mt-1">
                  {TOTAL_CONCEPTS}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Scenarios
                </div>
                <div className="font-mono text-2xl font-semibold text-[#FBBF24] tabular-nums mt-1">
                  {TOTAL_SCENARIOS}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {LAB_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 transition-colors text-left cursor-pointer"
                >
                  <span className="text-white/85 truncate">
                    <span className="text-[#FBBF24] mr-2">{cat.index}</span>
                    {cat.label}
                  </span>
                  <span className="text-white/60 tabular-nums ml-2">
                    {categoryCounts[cat.id]} labs →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filter & Live Search Toolbar */}
        <section className="bg-[var(--paper-elevated)] border border-[var(--ink)] p-4 mb-10 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by mechanism, paper, or topic (e.g. mvcc, bloom, debezium, wan, aimd, tail)..."
                aria-label="Filter interactive labs"
                className="w-full pl-9 pr-9 py-2 bg-[var(--paper)] border border-[var(--rule)] focus:border-[var(--ink)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear lab filter"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-xs text-[var(--ink-secondary)]">
              <Filter className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              <span className="tabular-nums">
                Showing <strong className="text-[var(--ink)]">{filteredLabs.length}</strong> of{' '}
                {TOTAL_LABS} labs
              </span>
              {(activeCategory !== 'all' || query.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    selectCategory('all');
                    setQuery('');
                  }}
                  className="px-2 py-1 border border-[var(--rule)] hover:border-[var(--ink)] text-[10px] uppercase tracking-wider text-[var(--signal)] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--rule)]">
            <button
              type="button"
              onClick={() => selectCategory('all')}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border transition-colors cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] font-semibold'
                  : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              All Workbenches ({TOTAL_LABS})
            </button>
            {LAB_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border transition-colors cursor-pointer ${
                    active
                      ? `${toneBadgeClass(cat.tone)} border-transparent font-semibold`
                      : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                  }`}
                >
                  {cat.index} · {cat.shortLabel} ({categoryCounts[cat.id]})
                </button>
              );
            })}
          </div>
        </section>

        {/* Labs Catalog Rendering */}
        {filteredLabs.length === 0 ? (
          <div className="bg-[var(--paper-elevated)] border border-[var(--rule)] p-12 text-center space-y-3">
            <p className="font-editorial text-2xl text-[var(--ink)]">
              No labs matched &ldquo;{query}&rdquo;
            </p>
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              Try a broader term like &ldquo;quorum&rdquo;, &ldquo;mvcc&rdquo;, &ldquo;wan&rdquo;,
              &ldquo;otel&rdquo;, or reset filters to browse all {TOTAL_LABS} workbenches.
            </p>
            <button
              type="button"
              onClick={() => {
                selectCategory('all');
                setQuery('');
              }}
              className="mt-2 px-4 py-2 bg-[var(--ink)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-wider cursor-pointer"
            >
              Show All {TOTAL_LABS} Labs
            </button>
          </div>
        ) : isGroupedMode ? (
          <div className="space-y-14">
            {LAB_CATEGORIES.map((category) => {
              const labs = LABS_CATALOG.filter((l) => l.categoryId === category.id);
              return (
                <section key={category.id} id={category.id}>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 mb-6 border-b border-[var(--ink)]">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
                        <span className={`font-semibold ${toneTextClass(category.tone)}`}>
                          SECTION {category.index}
                        </span>
                        <span className="text-[var(--ink-muted)]">·</span>
                        <span className="text-[var(--ink-muted)] tabular-nums">
                          {labs.length} WORKBENCHES
                        </span>
                      </div>
                      <h2 className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mt-1">
                        {category.label}
                      </h2>
                    </div>
                    <p className="text-sm text-[var(--ink-secondary)] max-w-xl">
                      {category.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {labs.map((lab) => (
                      <LabCard key={lab.id} lab={lab} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredLabs.map((lab) => (
              <LabCard key={lab.id} lab={lab} />
            ))}
          </div>
        )}

        {/* Bottom Cross-Navigation Banner */}
        <section className="mt-16 pt-8 border-t border-[var(--ink)] grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/#protocol-atlas"
            className="group bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] p-5 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)]">
                <Layers className="w-3.5 h-3.5" />
                <span>Protocol Monograph</span>
              </div>
              <div className="font-editorial text-xl text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors">
                Browse All {TOTAL_CONCEPTS} Interactive Protocol Plates
              </div>
              <div className="text-xs text-[var(--ink-secondary)]">
                Step-through visualizations with Space-Time wire scopes, Invariant Monitors &amp;
                Chaos Injection.
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 flex-shrink-0 text-[var(--ink-muted)] group-hover:text-[var(--signal)]" />
          </Link>

          <Link
            href="/advisor"
            className="group bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] p-5 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--emerald)]">
                <Compass className="w-3.5 h-3.5" />
                <span>Guided Selection</span>
              </div>
              <div className="font-editorial text-xl text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors">
                Not sure which protocol fits your workload? Open Protocol Advisor
              </div>
              <div className="text-xs text-[var(--ink-secondary)]">
                Score Raft, Paxos, PBFT, Quorums, CRDTs, 2PC, and Sagas against your exact system
                constraints.
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 flex-shrink-0 text-[var(--ink-muted)] group-hover:text-[var(--signal)]" />
          </Link>
        </section>
      </div>
    </div>
  );
}
