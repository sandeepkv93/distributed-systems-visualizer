'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, LayoutGrid, List, Search, X } from 'lucide-react';
import {
  CONCEPTS_CATALOG,
  CONCEPT_DOMAINS,
  ConceptDomainId,
} from '@/lib/catalog';
import { useProgress } from '@/hooks/useProgress';
import ConceptGlyph from './ConceptGlyph';

type ViewMode = 'plates' | 'ledger';

export default function ConceptGrid() {
  const { progress } = useProgress();
  const [activeDomain, setActiveDomain] = useState<'all' | ConceptDomainId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('plates');

  const domainCounts = useMemo(() => {
    const counts = new Map<ConceptDomainId, number>();
    for (const c of CONCEPTS_CATALOG) {
      counts.set(c.domainId, (counts.get(c.domainId) ?? 0) + 1);
    }
    return counts;
  }, []);

  const filteredConcepts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CONCEPTS_CATALOG.filter((concept) => {
      if (activeDomain !== 'all' && concept.domainId !== activeDomain) {
        return false;
      }
      if (!q) return true;
      return (
        concept.name.toLowerCase().includes(q) ||
        concept.description.toLowerCase().includes(q) ||
        concept.citation.toLowerCase().includes(q) ||
        concept.mechanism.toLowerCase().includes(q) ||
        concept.domainLabel.toLowerCase().includes(q) ||
        concept.plateNumber.includes(q)
      );
    });
  }, [activeDomain, searchQuery]);

  const activeDomainMeta = useMemo(
    () => (activeDomain === 'all' ? null : CONCEPT_DOMAINS.find((d) => d.id === activeDomain) ?? null),
    [activeDomain]
  );

  return (
    <section id="protocol-atlas" className="scroll-mt-20">
      {/* Five Domains — Architectural Table of Contents Strip */}
      <div className="mb-10 border-y border-[var(--ink)] bg-[var(--paper-elevated)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--rule)]">
          {CONCEPT_DOMAINS.map((domain) => {
            const count = domainCounts.get(domain.id) ?? 0;
            const isSelected = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() =>
                  setActiveDomain((prev) => (prev === domain.id ? 'all' : domain.id))
                }
                className={`group text-left p-4 sm:p-5 transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                    : 'hover:bg-[var(--chassis)] text-[var(--ink)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`font-mono text-[11px] font-semibold tracking-widest ${
                        isSelected ? 'text-[#FB923C]' : 'text-[var(--signal)]'
                      }`}
                    >
                      § {domain.index}
                    </span>
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {count} PLATES
                    </span>
                  </div>
                  <h2 className="font-editorial text-lg leading-snug font-medium">
                    {domain.label}
                  </h2>
                </div>
                <p
                  className={`mt-2 text-xs leading-relaxed ${
                    isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {domain.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Atlas Toolbar: Filter Pills + Search + View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-8 border-b border-[var(--rule)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDomain('all')}
            className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border transition-colors cursor-pointer ${
              activeDomain === 'all'
                ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
            }`}
          >
            All · {CONCEPTS_CATALOG.length}
          </button>
          {CONCEPT_DOMAINS.map((domain) => {
            const isSelected = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => setActiveDomain(domain.id)}
                className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                {domain.shortLabel} · {domainCounts.get(domain.id) ?? 0}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Filter Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by protocol or author..."
              aria-label="Filter protocols"
              className="w-full pl-8 pr-8 py-1.5 bg-[var(--paper-elevated)] border border-[var(--rule)] focus:border-[var(--ink)] text-xs text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Plates vs Ledger View Switcher */}
          <div
            className="inline-flex border border-[var(--rule)] bg-[var(--paper-elevated)]"
            role="group"
            aria-label="Catalog layout view"
          >
            <button
              type="button"
              onClick={() => setViewMode('plates')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
                viewMode === 'plates'
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'
              }`}
              title="Architectural Plates View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plates</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider border-l border-[var(--rule)] transition-colors cursor-pointer ${
                viewMode === 'ledger'
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'
              }`}
              title="Reference Index Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Index</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Domain Subtitle */}
      {activeDomainMeta && (
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-[var(--signal)] font-semibold">
              SECTION {activeDomainMeta.index}
            </span>
            <h3 className="font-editorial text-2xl text-[var(--ink)]">
              {activeDomainMeta.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveDomain('all')}
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            Show all 22 →
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredConcepts.length === 0 ? (
        <div className="border border-[var(--rule)] bg-[var(--paper-elevated)] p-12 text-center">
          <p className="font-editorial text-xl text-[var(--ink)] mb-2">
            No protocol plates match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-sm text-[var(--ink-muted)] mb-4">
            Try searching for Raft, Lamport, quorum, Merkle, or reset your domain filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveDomain('all');
            }}
            className="px-4 py-1.5 bg-[var(--ink)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-wider cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'plates' ? (
        /* ARCHITECTURAL PLATES GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredConcepts.map((concept) => {
            const isCompleted = progress.conceptsCompleted.includes(concept.id);
            const completedScenarios = concept.scenarioKeys.filter((key) =>
              progress.scenariosCompleted.includes(key)
            ).length;
            const totalScenarios = concept.scenarioKeys.length;

            return (
              <Link
                key={concept.id}
                href={concept.path}
                className="group plate-card flex flex-col justify-between"
              >
                <div>
                  {/* Plate Specification Header Rail */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--chassis)]/55 font-mono text-[10px] tracking-[0.09em] uppercase">
                    <span className="flex items-center gap-2 text-[var(--ink-secondary)]">
                      <span className="font-semibold text-[var(--ink)] tabular-nums">
                        FIG. {concept.plateNumber}
                      </span>
                      <span className="opacity-40">/</span>
                      <span className="truncate">{concept.citation}</span>
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[var(--emerald)] font-semibold flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        DONE
                      </span>
                    ) : (
                      <span className="text-[var(--ink-muted)] flex-shrink-0">
                        {concept.domainLabel.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Schematic & Monograph Summary */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 border border-[var(--rule)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)] group-hover:border-[var(--ink)] transition-colors flex-shrink-0">
                        <ConceptGlyph id={concept.id} className="w-9 h-9" />
                      </div>
                      <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-1 border border-[var(--rule)] text-[var(--ink-secondary)] bg-[var(--paper)]">
                        {concept.mechanism}
                      </span>
                    </div>

                    <h3 className="font-editorial text-[22px] leading-tight text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors mb-2">
                      {concept.name}
                    </h3>

                    <p className="text-[13.5px] leading-relaxed text-[var(--ink-secondary)]">
                      {concept.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Calibrated Scenario Progress Strip */}
                <div className="px-5 py-3 border-t border-[var(--rule)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {totalScenarios > 0 ? (
                      <>
                        <div
                          className="flex items-center gap-1"
                          aria-label={`${completedScenarios} of ${totalScenarios} scenarios completed`}
                        >
                          {concept.scenarioKeys.map((key) => {
                            const done = progress.scenariosCompleted.includes(key);
                            return (
                              <span
                                key={key}
                                className={`block h-1.5 w-3.5 transition-colors ${
                                  done ? 'bg-[var(--emerald)]' : 'bg-[var(--ink)]/15'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums uppercase">
                          {completedScenarios}/{totalScenarios} runs
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase">
                        Interactive diagram
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors flex-shrink-0">
                    Open
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* SWISS REFERENCE INDEX LEDGER TABLE */
        <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--ink)] bg-[var(--chassis)] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-secondary)]">
                <th className="py-2.5 px-4 w-20">Plate</th>
                <th className="py-2.5 px-4">Protocol</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Domain</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Reference</th>
                <th className="py-2.5 px-4 hidden lg:table-cell">Mechanism</th>
                <th className="py-2.5 px-4 text-right">Runs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)]">
              {filteredConcepts.map((concept) => {
                const isCompleted = progress.conceptsCompleted.includes(concept.id);
                const completedScenarios = concept.scenarioKeys.filter((key) =>
                  progress.scenariosCompleted.includes(key)
                ).length;
                const totalScenarios = concept.scenarioKeys.length;

                return (
                  <tr
                    key={concept.id}
                    className="group hover:bg-[var(--chassis)]/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-[var(--signal)] font-medium">
                      <Link href={concept.path} className="block">
                        {concept.plateNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={concept.path} className="flex items-center gap-3">
                        <span className="w-7 h-7 border border-[var(--rule)] bg-[var(--paper)] flex items-center justify-center flex-shrink-0 text-[var(--ink)]">
                          <ConceptGlyph id={concept.id} className="w-5 h-5" />
                        </span>
                        <div>
                          <div className="font-editorial text-base text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors">
                            {concept.name}
                          </div>
                          <div className="text-xs text-[var(--ink-muted)] line-clamp-1 max-w-md">
                            {concept.description}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-[11px] text-[var(--ink-secondary)]">
                      {concept.domainLabel}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-[var(--ink-muted)]">
                      {concept.citation}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-[11px] text-[var(--ink-secondary)]">
                      {concept.mechanism}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      <Link
                        href={concept.path}
                        className="inline-flex items-center justify-end gap-2"
                      >
                        {isCompleted ? (
                          <span className="text-[var(--emerald)] font-semibold">DONE</span>
                        ) : totalScenarios > 0 ? (
                          <span className="text-[var(--ink-secondary)]">
                            {completedScenarios}/{totalScenarios}
                          </span>
                        ) : (
                          <span className="text-[var(--ink-muted)]">LIVE</span>
                        )}
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--ink-muted)] group-hover:text-[var(--signal)]" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
