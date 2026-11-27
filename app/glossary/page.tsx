'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookMarked, Search, X } from 'lucide-react';
import {
  GLOSSARY_ENTRIES,
  TOTAL_GLOSSARY_TERMS,
  filterGlossary,
} from '@/lib/glossary';
import {
  CONCEPTS_BY_ID,
  CONCEPT_DOMAINS,
  CONCEPT_DOMAINS_BY_ID,
  ConceptDomainId,
} from '@/lib/catalog';

export default function GlossaryPage() {
  const [domainFilter, setDomainFilter] = useState<ConceptDomainId | 'all'>('all');
  const [letterFilter, setLetterFilter] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const termParam = new URLSearchParams(window.location.search).get('term');
    if (!termParam) return;
    const match = GLOSSARY_ENTRIES.find((e) => e.id === termParam);
    if (match) {
      const timer = setTimeout(() => setQuery(match.term), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const availableLetters = useMemo(
    () => Array.from(new Set(GLOSSARY_ENTRIES.map((e) => e.term[0].toUpperCase()))).sort(),
    []
  );

  const visibleEntries = useMemo(
    () => filterGlossary(domainFilter, letterFilter, query),
    [domainFilter, letterFilter, query]
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · CANONICAL GLOSSARY &amp; FORMAL NOTATION LEXICON</span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[var(--ink)] tabular-nums">{TOTAL_GLOSSARY_TERMS} ENTRIES</span>
            <Link href="/bibliography" className="text-[var(--cobalt)] hover:underline">
              Primary Papers →
            </Link>
            <Link href="/drills" className="text-[var(--emerald)] hover:underline">
              Flashcards →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 space-y-3">
          <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
            Distributed Systems Glossary &amp; Notation
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-3xl">
            Concise formal definitions, mathematical notation (<span className="font-mono">→</span>,{' '}
            <span className="font-mono">⊔</span>, <span className="font-mono">2f+1</span>,{' '}
            <span className="font-mono">3f+1</span>, <span className="font-mono">W+R&gt;N</span>,{' '}
            <span className="font-mono">φ(t)</span>), primary citations, and direct links to the
            live interactive plates where each concept executes.
          </p>
        </header>

        {/* Search + Domain + A-Z Filter Bar */}
        <section className="mb-8 p-4 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search glossary terms and formal notation"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search terms, notation, or authors (e.g., FLP, fencing, 3f+1, Lamport, PACELC)..."
                className="w-full pl-9 pr-9 py-2 bg-[var(--paper)] border border-[var(--rule)] focus:border-[var(--ink)] outline-none font-mono text-xs text-[var(--ink)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear glossary search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-secondary)] flex-shrink-0">
              <span className="tabular-nums" aria-live="polite" aria-atomic="true">
                Showing <strong className="text-[var(--ink)]">{visibleEntries.length}</strong> of{' '}
                {TOTAL_GLOSSARY_TERMS}
              </span>
              {(query.trim() !== '' || domainFilter !== 'all' || letterFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDomainFilter('all');
                    setLetterFilter('all');
                  }}
                  className="px-2 py-1 border border-[var(--rule)] hover:border-[var(--ink)] text-[10px] uppercase tracking-wider text-[var(--signal)] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter glossary by domain"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              aria-pressed={domainFilter === 'all'}
              onClick={() => setDomainFilter('all')}
              className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                domainFilter === 'all'
                  ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                  : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              All Domains
            </button>
            {CONCEPT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                aria-pressed={domainFilter === domain.id}
                onClick={() => setDomainFilter(domain.id)}
                className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                  domainFilter === domain.id
                    ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                    : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                § {domain.index} {domain.shortLabel}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Filter glossary by starting letter"
            className="flex flex-wrap items-center gap-1 pt-1 border-t border-[var(--rule)]"
          >
            <button
              type="button"
              aria-pressed={letterFilter === 'all'}
              onClick={() => setLetterFilter('all')}
              className={`px-2 py-0.5 font-mono text-[10px] uppercase border cursor-pointer ${
                letterFilter === 'all'
                  ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]'
                  : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              A–Z
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                aria-pressed={letterFilter === letter}
                onClick={() => setLetterFilter(letter)}
                className={`w-6 h-6 font-mono text-[10px] font-semibold border cursor-pointer ${
                  letterFilter === letter
                    ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </section>

        {/* Glossary Cards Grid */}
        {visibleEntries.length === 0 ? (
          <div className="p-10 border border-[var(--rule)] bg-[var(--paper-elevated)] text-center space-y-3">
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              No glossary entries match your filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDomainFilter('all');
                setLetterFilter('all');
              }}
              className="px-3.5 py-1.5 bg-[var(--ink)] text-[var(--paper-elevated)] font-mono text-[11px] uppercase tracking-wider cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleEntries.map((entry) => {
              const domain = CONCEPT_DOMAINS_BY_ID.get(entry.domainId);
              return (
                <article
                  key={entry.id}
                  id={entry.id}
                  className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
                      {domain && (
                        <span className="text-[var(--signal)] font-semibold">
                          § {domain.index} · {domain.shortLabel}
                        </span>
                      )}
                      {entry.citation && (
                        <span className="text-[var(--ink-muted)]">{entry.citation}</span>
                      )}
                    </div>

                    <h2 className="font-editorial text-2xl text-[var(--ink)] leading-tight">
                      {entry.term}
                    </h2>

                    {entry.symbol && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#111413] text-[#F4F0E8] font-mono text-[11px]">
                        <BookMarked className="w-3 h-3 text-[#34D399]" />
                        <span>{entry.symbol}</span>
                      </div>
                    )}

                    <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                      {entry.definition}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--rule)] flex flex-wrap gap-1.5">
                    {entry.conceptIds.map((cid) => {
                      const concept = CONCEPTS_BY_ID.get(cid);
                      if (!concept) return null;
                      return (
                        <Link
                          key={cid}
                          href={concept.path}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--paper)] border border-[var(--rule)] hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider transition-colors"
                        >
                          <span>
                            PL {concept.plateNumber} · {concept.navName}
                          </span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      );
                    })}
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
