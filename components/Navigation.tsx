'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import ProgressDashboard from './ProgressDashboard';
import ConceptGlyph from './ConceptGlyph';
import { Search, BookMarked, ChevronDown, X, ArrowUpRight, Scale, Network } from 'lucide-react';
import { CONCEPTS_CATALOG, CONCEPT_DOMAINS, TOTAL_CONCEPTS } from '@/lib/catalog';
import { useProgress } from '@/hooks/useProgress';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { stats, progress } = useProgress();
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showIndexMenu, setShowIndexMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedPath = pathname?.replace(/\/$/, '') || '/';
  const activeConcept = useMemo(
    () => CONCEPTS_CATALOG.find((c) => c.path === normalizedPath) ?? null,
    [normalizedPath]
  );

  const filteredConcepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONCEPTS_CATALOG;
    return CONCEPTS_CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domainLabel.toLowerCase().includes(q) ||
        c.citation.toLowerCase().includes(q) ||
        c.mechanism.toLowerCase().includes(q) ||
        c.plateNumber.includes(q)
    );
  }, [query]);

  // Global Cmd+K / Ctrl+K shortcut for instant protocol jumping
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowIndexMenu(false);
        setShowCommandPalette((open) => !open);
      } else if (event.key === 'Escape') {
        setShowCommandPalette(false);
        setShowIndexMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [showCommandPalette]);

  const openCommandPalette = () => {
    setQuery('');
    setSelectedIdx(0);
    setShowIndexMenu(false);
    setShowCommandPalette(true);
  };

  const handlePaletteKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredConcepts.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIdx((idx) => (idx + 1) % filteredConcepts.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIdx((idx) => (idx - 1 + filteredConcepts.length) % filteredConcepts.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = filteredConcepts[selectedIdx] ?? filteredConcepts[0];
      if (target) {
        setShowCommandPalette(false);
        router.push(target.path);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-[var(--paper)]/95 backdrop-blur-sm border-b border-[var(--rule)]">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand Masthead + Live Active Plate Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="group flex items-center gap-2.5 flex-shrink-0 text-[var(--ink)]"
            >
              {/* Custom geometric 3-node protocol emblem */}
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-[var(--ink)] transition-transform duration-200 group-hover:rotate-12"
                fill="none"
                aria-hidden="true"
              >
                <path d="M12 3.5L20 18H4L12 3.5Z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="3.5" r="2.2" fill="#D9441E" />
                <circle cx="20" cy="18" r="2" fill="currentColor" />
                <circle cx="4" cy="18" r="2" fill="currentColor" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
                  DS ATLAS
                </span>
                <span className="hidden sm:inline font-mono text-[9px] tracking-[0.08em] text-[var(--ink-muted)] uppercase mt-0.5">
                  Interactive Monograph
                </span>
              </div>
            </Link>

            {activeConcept ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-[var(--rule)] min-w-0">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--chassis)] text-[var(--ink-secondary)] border border-[var(--rule)] flex-shrink-0">
                  PLATE {activeConcept.plateNumber}
                </span>
                <span className="font-editorial text-base text-[var(--ink)] truncate">
                  {activeConcept.name}
                </span>
                <span className="hidden lg:inline font-mono text-[11px] text-[var(--ink-muted)] flex-shrink-0">
                  · {activeConcept.citation}
                </span>
              </div>
            ) : normalizedPath === '/duel' ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-[var(--rule)] min-w-0">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--signal)] text-[#FAF7F1] flex-shrink-0">
                  DUEL LAB
                </span>
                <span className="font-editorial text-base text-[var(--ink)] truncate">
                  Side-by-Side Protocol Bench
                </span>
              </div>
            ) : normalizedPath === '/map' ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-[var(--rule)] min-w-0">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--cobalt)] text-[#FAF7F1] flex-shrink-0">
                  DEPENDENCY MAP
                </span>
                <span className="font-editorial text-base text-[var(--ink)] truncate">
                  22-Protocol Systems Genealogy
                </span>
              </div>
            ) : null}
          </div>

          {/* Right Instrument Controls */}
          <div className="flex items-center gap-2">
            {/* Protocol Dependency Map Link */}
            <Link
              href="/map"
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/map'
                  ? 'bg-[var(--cobalt)] text-[#FAF7F1] border-[var(--cobalt)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Protocol Dependency Map"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </Link>

            {/* Protocol Duel Link */}
            <Link
              href="/duel"
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/duel'
                  ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Protocol Duel Lab"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Duel</span>
            </Link>
            {/* Domain-Grouped Protocol Index Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIndexMenu((open) => !open)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors cursor-pointer ${
                  showIndexMenu
                    ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
                aria-expanded={showIndexMenu}
              >
                <span>Plates</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showIndexMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showIndexMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowIndexMenu(false)}
                  />
                  <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-2 sm:w-[680px] max-w-[calc(100vw-2rem)] bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)] z-50 max-h-[75vh] overflow-y-auto">
                    <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink-secondary)]">
                        Complete Protocol Index · 22 Plates
                      </span>
                      <Link
                        href="/"
                        onClick={() => setShowIndexMenu(false)}
                        className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--signal)] hover:underline"
                      >
                        Atlas Home →
                      </Link>
                    </div>
                    <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      {CONCEPT_DOMAINS.map((domain) => {
                        const domainConcepts = CONCEPTS_CATALOG.filter(
                          (c) => c.domainId === domain.id
                        );
                        return (
                          <div key={domain.id}>
                            <div className="flex items-baseline gap-2 pb-1.5 mb-1.5 border-b border-[var(--rule)]">
                              <span className="font-mono text-[10px] text-[var(--signal)] font-semibold">
                                {domain.index}
                              </span>
                              <span className="font-mono text-[10px] tracking-[0.08em] uppercase font-semibold text-[var(--ink)]">
                                {domain.label}
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {domainConcepts.map((concept) => {
                                const isActive = normalizedPath === concept.path;
                                const isDone = progress.conceptsCompleted.includes(concept.id);
                                return (
                                  <li key={concept.id}>
                                    <Link
                                      href={concept.path}
                                      onClick={() => setShowIndexMenu(false)}
                                      className={`flex items-center justify-between gap-2 px-2 py-1 text-xs transition-colors ${
                                        isActive
                                          ? 'bg-[var(--ink)] text-[var(--paper-elevated)] font-medium'
                                          : 'text-[var(--ink-secondary)] hover:bg-[var(--chassis)] hover:text-[var(--ink)]'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={`font-mono text-[10px] tabular-nums ${
                                            isActive
                                              ? 'text-[#D9441E]'
                                              : 'text-[var(--ink-muted)]'
                                          }`}
                                        >
                                          {concept.plateNumber}
                                        </span>
                                        <span className="truncate">{concept.name}</span>
                                      </span>
                                      {isDone && (
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                            isActive ? 'bg-[#34D399]' : 'bg-[var(--emerald)]'
                                          }`}
                                          title="Completed"
                                        />
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Instant Command Palette Trigger */}
            <button
              type="button"
              onClick={openCommandPalette}
              className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink-secondary)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              aria-label="Search protocols (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-xs">Jump</span>
              <kbd className="hidden md:inline-block font-mono text-[10px] px-1 py-0.5 bg-[var(--chassis)] border border-[var(--rule)] text-[var(--ink-muted)] leading-none">
                ⌘K
              </kbd>
            </button>

            {/* Study Ledger / Progress Trigger */}
            <button
              type="button"
              onClick={() => setShowProgressDashboard(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs tracking-wide transition-colors cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase">Ledger</span>
              <span className="tabular-nums opacity-85">
                {String(stats.completedConcepts).padStart(2, '0')}/{TOTAL_CONCEPTS}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-50 bg-[#161614]/50 backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="w-full max-w-xl bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Jump to protocol"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--rule)] bg-[var(--paper)]">
              <Search className="w-4 h-4 text-[var(--ink-muted)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Jump to protocol, paper (e.g. Lamport, 1978), or domain..."
                className="w-full bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCommandPalette(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto divide-y divide-[var(--rule)]">
              {filteredConcepts.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-xs text-[var(--ink-muted)]">
                  No protocols matching &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredConcepts.map((concept, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => {
                        setShowCommandPalette(false);
                        router.push(concept.path);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                          : 'text-[var(--ink)] hover:bg-[var(--chassis)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${
                            isSelected
                              ? 'border-[#FAF7F1]/25 bg-[#FAF7F1]/10 text-[#FAF7F1]'
                              : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]'
                          }`}
                        >
                          <ConceptGlyph id={concept.id} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[10px] tabular-nums ${
                                isSelected ? 'text-[#FB923C]' : 'text-[var(--ink-muted)]'
                              }`}
                            >
                              FIG. {concept.plateNumber}
                            </span>
                            <span className="text-sm font-medium truncate">{concept.name}</span>
                          </div>
                          <div
                            className={`font-mono text-[10px] truncate mt-0.5 ${
                              isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                            }`}
                          >
                            {concept.domainLabel} · {concept.citation}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight
                        className={`w-4 h-4 flex-shrink-0 ${
                          isSelected ? 'text-[#FAF7F1]' : 'text-[var(--ink-muted)]'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] uppercase">
              <span>↑↓ Navigate · ↵ Open Plate</span>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      )}

      {/* Study Ledger Modal */}
      {showProgressDashboard && (
        <ProgressDashboard onClose={() => setShowProgressDashboard(false)} />
      )}
    </>
  );
}
