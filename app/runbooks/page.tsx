'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Search,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react';
import {
  FAILURE_RUNBOOKS,
  RunbookSeverity,
  filterRunbooks,
} from '@/lib/runbooks';
import { CONCEPTS_BY_ID, CONCEPT_DOMAINS, ConceptDomainId } from '@/lib/catalog';

export default function RunbooksPage() {
  const [domainFilter, setDomainFilter] = useState<ConceptDomainId | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<RunbookSeverity | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rbParam = new URLSearchParams(window.location.search).get('runbook');
    if (!rbParam) return;
    const match = FAILURE_RUNBOOKS.find((r) => r.id === rbParam || r.code === rbParam);
    if (match) {
      const timer = setTimeout(() => setQuery(match.code), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const visibleRunbooks = useMemo(
    () => filterRunbooks(domainFilter, severityFilter, query),
    [domainFilter, severityFilter, query]
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · PRODUCTION FAILURE MODES &amp; SRE RUNBOOKS</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/incidents" className="text-[var(--signal)] hover:underline">
              Interactive Outage Drills →
            </Link>
            <Link href="/studio" className="text-[var(--cobalt)] hover:underline">
              Stack Studio →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 space-y-3">
          <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
            Production Failure Modes &amp; SRE Playbook
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-3xl">
            Eight canonical distributed-systems outage signatures mapped directly to the formal
            invariant breached, live telemetry signals, immediate incident mitigation, permanent
            architectural fix, and one-click scenario reproduction in the Atlas.
          </p>
        </header>

        {/* Search & Filter Controls */}
        <section className="mb-8 p-4 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search SRE failure runbooks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search signals, invariants, or symptoms (e.g., ISR, fsync, PREPARED, fencing)..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--paper)] border border-[var(--rule)] focus:border-[var(--ink)] outline-none font-mono text-xs text-[var(--ink)]"
              />
            </div>

            <div className="inline-flex border border-[var(--ink)] bg-[var(--paper)] font-mono text-[11px] uppercase">
              {(['all', 'SEV-1', 'SEV-2'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3.5 py-2 cursor-pointer transition-colors ${
                    severityFilter === sev
                      ? sev === 'SEV-1'
                        ? 'bg-[var(--signal)] text-[#FAF7F1]'
                        : 'bg-[var(--ink)] text-[#FAF7F1]'
                      : 'text-[var(--ink)] hover:bg-[var(--chassis)]'
                  }`}
                >
                  {sev === 'all' ? 'All Sev' : sev}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDomainFilter('all')}
              className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                domainFilter === 'all'
                  ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                  : 'bg-[var(--paper)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              All Domains ({FAILURE_RUNBOOKS.length})
            </button>
            {CONCEPT_DOMAINS.filter((d) =>
              FAILURE_RUNBOOKS.some((rb) => rb.domainId === d.id)
            ).map((domain) => (
              <button
                key={domain.id}
                type="button"
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
        </section>

        {/* Runbook Cards */}
        <div className="space-y-6">
          {visibleRunbooks.length === 0 ? (
            <div className="p-10 border border-[var(--rule)] bg-[var(--paper-elevated)] text-center font-mono text-xs text-[var(--ink-muted)]">
              No runbooks match your current filter. Try clearing the search query.
            </div>
          ) : (
            visibleRunbooks.map((rb) => {
              const concept = CONCEPTS_BY_ID.get(rb.conceptId);
              const reproHref = concept
                ? `${concept.path}?scenario=${encodeURIComponent(rb.reproScenarioId)}`
                : '/';

              return (
                <article
                  key={rb.id}
                  className="border border-[var(--ink)] bg-[var(--paper-elevated)]"
                >
                  {/* Top Bar */}
                  <div className="px-5 py-3 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[var(--ink)] text-[#FAF7F1]">
                        {rb.code}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 uppercase ${
                          rb.severity === 'SEV-1'
                            ? 'bg-[var(--signal)] text-[#FAF7F1]'
                            : 'bg-[#D97706] text-[#FAF7F1]'
                        }`}
                      >
                        {rb.severity}
                      </span>
                      <h2 className="font-editorial text-xl sm:text-2xl text-[var(--ink)]">
                        {rb.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={reproHref}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--ink)] hover:bg-[var(--signal)] text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider transition-colors"
                      >
                        <span>Reproduce Live Scenario</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                      {rb.incidentId && (
                        <Link
                          href={`/incidents?incident=${encodeURIComponent(rb.incidentId)}`}
                          className="inline-flex items-center gap-1 px-3 py-1 border border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--chassis)] font-mono text-[10px] uppercase tracking-wider transition-colors"
                        >
                          <span>Postmortem Drill</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Invariant Banner */}
                  <div className="px-5 py-2.5 bg-[#111413] text-[#F4F0E8] font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[#F87171] uppercase text-[10px] font-semibold tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Breached Formal Invariant
                    </span>
                    <span className="font-semibold">{rb.breachedInvariant}</span>
                  </div>

                  {/* Body 3-Column Grid */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Telemetry Signals */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--signal)] font-semibold">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Detection &amp; Telemetry Signals</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[var(--ink-secondary)]">
                        {rb.telemetrySignals.map((sig) => (
                          <li key={sig} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-[var(--signal)] font-mono">▸</span>
                            <span>{sig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Root Cause + Immediate Mitigation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--cobalt)] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Immediate Incident Mitigation</span>
                      </div>
                      <p className="text-xs text-[var(--ink)] leading-relaxed">{rb.rootCause}</p>
                      <ol className="space-y-1 text-xs text-[var(--ink-secondary)] list-decimal pl-4">
                        {rb.immediateMitigation.map((step) => (
                          <li key={step} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Permanent Architectural Fix */}
                    <div className="p-4 border-l-4 border-[var(--emerald)] bg-[var(--emerald)]/6 space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--emerald)] font-semibold">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Permanent Architectural Fix</span>
                      </div>
                      <p className="text-xs text-[var(--ink)] leading-relaxed">{rb.permanentFix}</p>
                      {concept && (
                        <div className="pt-1">
                          <Link
                            href={concept.path}
                            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--cobalt)] hover:text-[var(--signal)]"
                          >
                            <span>
                              Plate {concept.plateNumber} · {concept.name}
                            </span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
