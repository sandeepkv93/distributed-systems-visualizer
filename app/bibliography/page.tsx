'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowUpRight, Search, Scale, Printer } from 'lucide-react';
import {
  BIBLIOGRAPHY,
  PAPER_DECADES,
  PaperDecade,
  filterBibliography,
} from '@/lib/bibliography';
import { CONCEPTS_BY_ID, CONCEPT_DOMAINS, ConceptDomainId } from '@/lib/catalog';
import { getDuelById } from '@/lib/duels';

export default function BibliographyPage() {
  const [selectedDecade, setSelectedDecade] = useState<PaperDecade | 'all'>('all');
  const [selectedDomain, setSelectedDomain] = useState<ConceptDomainId | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const paperParam = new URLSearchParams(window.location.search).get('paper');
    if (!paperParam) return;
    const match = BIBLIOGRAPHY.find((p) => p.id === paperParam);
    if (match) {
      const timer = setTimeout(() => setQuery(match.title), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const filteredPapers = useMemo(
    () =>
      filterBibliography({
        decade: selectedDecade,
        domainId: selectedDomain,
        query,
      }),
    [selectedDecade, selectedDomain, query]
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--cobalt)] font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            PRIMARY LITERATURE INDEX · {BIBLIOGRAPHY.length} FOUNDATIONAL PAPERS (1978 – 2014)
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="print-hide inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Syllabus</span>
            </button>
            <Link href="/" className="hover:text-[var(--ink)] transition-colors">
              ← Return to Protocol Atlas
            </Link>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
            Foundational <em className="italic text-[var(--signal)] font-normal">Papers</em> &amp;
            Theorems
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
            Every interactive plate in the Atlas traces directly to primary systems literature.
            Explore the chronological lineage from Lamport’s 1978 logical clocks to Raft’s 2014
            consensus design, with direct jump links to each live simulation and Protocol Duel.
          </p>
        </div>

        {/* Filter & Search Instrument Strip */}
        <div className="print-hide border border-[var(--ink)] bg-[var(--chassis)] p-4 mb-8 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--paper-elevated)] border border-[var(--rule)] focus-within:border-[var(--ink)] flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by author, theorem, venue, or year..."
                className="w-full bg-transparent text-xs font-mono text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
              />
            </div>

            {/* Decade Filter */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-[var(--ink-muted)] mr-1">Decade:</span>
              <button
                type="button"
                onClick={() => setSelectedDecade('all')}
                className={`px-2.5 py-1 border cursor-pointer transition-colors ${
                  selectedDecade === 'all'
                    ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] font-semibold'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                All
              </button>
              {PAPER_DECADES.map((decade) => (
                <button
                  key={decade}
                  type="button"
                  onClick={() => setSelectedDecade(decade)}
                  className={`px-2.5 py-1 border cursor-pointer transition-colors tabular-nums ${
                    selectedDecade === decade
                      ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)] font-semibold'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                  }`}
                >
                  {decade}
                </button>
              ))}
            </div>
          </div>

          {/* Domain Filter Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[var(--rule)] font-mono text-[10px] uppercase tracking-wider">
            <span className="text-[var(--ink-muted)] mr-1">Domain:</span>
            <button
              type="button"
              onClick={() => setSelectedDomain('all')}
              className={`px-2.5 py-1 border cursor-pointer transition-colors ${
                selectedDomain === 'all'
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] font-semibold'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              All Domains ({BIBLIOGRAPHY.length})
            </button>
            {CONCEPT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => setSelectedDomain(domain.id)}
                className={`px-2.5 py-1 border cursor-pointer transition-colors ${
                  selectedDomain === domain.id
                    ? 'bg-[var(--cobalt)] text-[#FAF7F1] border-[var(--cobalt)] font-semibold'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                § {domain.index} · {domain.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological Bibliographic Entries */}
        {filteredPapers.length === 0 ? (
          <div className="border border-[var(--rule)] bg-[var(--paper-elevated)] p-10 text-center font-mono text-xs text-[var(--ink-muted)]">
            No papers matching the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPapers.map((paper) => {
              const domain = CONCEPT_DOMAINS.find((d) => d.id === paper.domainId);
              return (
                <article
                  key={paper.id}
                  className="border border-[var(--ink)] bg-[var(--paper-elevated)] grid grid-cols-1 md:grid-cols-12"
                >
                  {/* Left Year & Metadata Column */}
                  <div className="md:col-span-3 lg:col-span-2 p-5 bg-[var(--chassis)]/65 border-b md:border-b-0 md:border-r border-[var(--rule)] flex flex-col justify-between gap-2">
                    <div>
                      <div className="font-editorial text-4xl text-[var(--signal)] leading-none tabular-nums">
                        {paper.year}
                      </div>
                      {domain && (
                        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-secondary)] mt-2">
                          § {domain.index} · {domain.shortLabel}
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--ink-muted)] leading-snug pt-2 border-t border-[var(--rule)]">
                      {paper.faultModel}
                    </div>
                  </div>

                  {/* Right Citation & Interactive Links Column */}
                  <div className="md:col-span-9 lg:col-span-10 p-5 space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[var(--ink-secondary)]">
                        {paper.authors}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                        {paper.venue}
                      </span>
                    </div>

                    <h2 className="font-editorial text-2xl text-[var(--ink)] leading-snug">
                      {paper.title}
                    </h2>

                    {/* Formal Core Theorem Callout */}
                    <div className="px-3 py-2 bg-[#111413] text-[#F4F0E8] font-mono text-xs flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-[#FB923C] font-semibold">
                        CORE THEOREM
                      </span>
                      <span className="text-[#E5E2D9]">{paper.coreTheorem}</span>
                    </div>

                    <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                      {paper.keyTakeaway}
                    </p>

                    {/* Direct Jump Links to Plates & Protocol Duels */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--rule)]">
                      {paper.conceptIds.map((cid) => {
                        const concept = CONCEPTS_BY_ID.get(cid);
                        if (!concept) return null;
                        return (
                          <Link
                            key={cid}
                            href={concept.path}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-[10.5px] uppercase tracking-wider transition-colors"
                          >
                            <span>
                              Plate {concept.plateNumber} · {concept.name}
                            </span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        );
                      })}
                      {paper.duelIds?.map((duelId) => {
                        const duel = getDuelById(duelId);
                        return (
                          <Link
                            key={duelId}
                            href={`/duel?duel=${duelId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)]/45 hover:border-[var(--ink)] font-mono text-[10.5px] uppercase tracking-wider transition-colors"
                          >
                            <Scale className="w-3 h-3 text-[var(--signal)]" />
                            <span>Duel: {duel.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
