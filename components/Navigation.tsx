'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import ProgressDashboard from './ProgressDashboard';
import ConceptGlyph from './ConceptGlyph';
import {
  Search,
  BookMarked,
  ChevronDown,
  X,
  ArrowUpRight,
  Scale,
  Network,
  Sliders,
  AlertTriangle,
  FlaskConical,
  Keyboard,
  Clock,
} from 'lucide-react';
import { CONCEPTS_CATALOG, CONCEPT_DOMAINS, TOTAL_CONCEPTS } from '@/lib/catalog';
import { LAB_CATEGORIES, TOTAL_LABS, getLabByPath, type LabTone } from '@/lib/labs-catalog';
import {
  ATLAS_SEARCH_INDEX,
  searchAtlas,
  type SearchItemKind,
  type SearchKindFilter,
} from '@/lib/search';
import {
  getClientRecentVisits,
  getServerRecentVisits,
  recordRecentVisit,
  subscribeRecentVisits,
} from '@/lib/recent-visits';
import { useProgress } from '@/hooks/useProgress';

const SEARCH_KIND_COUNTS: Record<SearchItemKind, number> = ATLAS_SEARCH_INDEX.reduce(
  (acc, item) => {
    acc[item.kind] += 1;
    return acc;
  },
  {
    plate: 0,
    scenario: 0,
    lab: 0,
    glossary: 0,
    paper: 0,
    runbook: 0,
    duel: 0,
    incident: 0,
  } as Record<SearchItemKind, number>
);

function labToneBgClass(tone: LabTone): string {
  switch (tone) {
    case 'signal':
      return 'bg-[var(--signal)]';
    case 'cobalt':
      return 'bg-[var(--cobalt)]';
    case 'emerald':
      return 'bg-[var(--emerald)]';
  }
}

function labToneTextClass(tone: LabTone): string {
  switch (tone) {
    case 'signal':
      return 'text-[var(--signal)]';
    case 'cobalt':
      return 'text-[var(--cobalt)]';
    case 'emerald':
      return 'text-[var(--emerald)]';
  }
}

const KEYBOARD_SHORTCUTS = [
  { keys: '⌘K / Ctrl+K', action: 'Open instant Atlas search & recent visits' },
  { keys: 'Space', action: 'Play or pause active protocol simulation' },
  { keys: '← / →', action: 'Step backward or forward one event' },
  { keys: '[ / ]', action: 'Jump to previous or next plate / lab in section' },
  { keys: 'R', action: 'Reset simulation back to initial state' },
  { keys: 'S', action: 'Toggle Topology ↔ Space-Time wire trace' },
  { keys: '?', action: 'Toggle this keyboard shortcuts sheet' },
  { keys: 'Esc', action: 'Close any open modal, drawer, or HUD popover' },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { stats, progress } = useProgress();
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showIndexMenu, setShowIndexMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchKindFilter>('all');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeResultRef = useRef<HTMLButtonElement | null>(null);

  const recentVisits = useSyncExternalStore(
    subscribeRecentVisits,
    getClientRecentVisits,
    getServerRecentVisits
  );

  const normalizedPath = pathname?.replace(/\/$/, '') || '/';
  const activeConcept = useMemo(
    () => CONCEPTS_CATALOG.find((c) => c.path === normalizedPath) ?? null,
    [normalizedPath]
  );
  const activeLab = useMemo(() => getLabByPath(normalizedPath), [normalizedPath]);

  // Record recently visited plates and labs for instant Cmd+K recall
  useEffect(() => {
    if (activeConcept) {
      recordRecentVisit({
        path: activeConcept.path,
        badge: `PL ${activeConcept.plateNumber}`,
        title: activeConcept.name,
      });
    } else if (activeLab) {
      recordRecentVisit({
        path: activeLab.path,
        badge: activeLab.searchBadge,
        title: activeLab.shortTitle,
      });
    }
  }, [activeConcept, activeLab]);

  const searchResults = useMemo(
    () => searchAtlas(query, searchFilter, 32),
    [query, searchFilter]
  );

  // Global Cmd+K / Ctrl+K, ?, and Escape shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowIndexMenu(false);
        setShowShortcutsModal(false);
        setShowCommandPalette((open) => !open);
        return;
      }
      if (event.key === 'Escape') {
        setShowCommandPalette(false);
        setShowIndexMenu(false);
        setShowShortcutsModal(false);
        return;
      }
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        setShowIndexMenu(false);
        setShowCommandPalette(false);
        setShowShortcutsModal((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock background scroll while Command Palette or Shortcuts modal is open
  useEffect(() => {
    if (!showCommandPalette && !showShortcutsModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showCommandPalette, showShortcutsModal]);

  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [showCommandPalette]);

  // Keep keyboard-selected Command Palette result scrolled into view
  useEffect(() => {
    if (!showCommandPalette) return;
    const el = activeResultRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx, showCommandPalette]);

  const openCommandPalette = () => {
    setQuery('');
    setSearchFilter('all');
    setSelectedIdx(0);
    setShowIndexMenu(false);
    setShowShortcutsModal(false);
    setShowCommandPalette(true);
  };

  const handlePaletteKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIdx((idx) => (idx + 1) % searchResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIdx((idx) => (idx - 1 + searchResults.length) % searchResults.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = searchResults[selectedIdx] ?? searchResults[0];
      if (target) {
        setShowCommandPalette(false);
        router.push(target.href);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-[var(--paper)]/95 backdrop-blur-sm border-b border-[var(--rule)]">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand Masthead + Live Active Plate / Workbench Breadcrumb */}
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
            ) : normalizedPath === '/labs' ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-[var(--rule)] min-w-0">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--ink)] text-[#FAF7F1] flex-shrink-0">
                  WORKBENCHES
                </span>
                <span className="font-editorial text-base text-[var(--ink)] truncate">
                  All {TOTAL_LABS} Interactive Labs &amp; Simulators
                </span>
              </div>
            ) : activeLab ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-[var(--rule)] min-w-0">
                <span
                  className={`font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 ${labToneBgClass(
                    activeLab.tone
                  )} text-[#FAF7F1] flex-shrink-0`}
                >
                  {activeLab.badge}
                </span>
                <span className="font-editorial text-base text-[var(--ink)] truncate">
                  {activeLab.navTitle}
                </span>
              </div>
            ) : null}
          </div>

          {/* Right Instrument Controls */}
          <div className="flex items-center gap-2">
            {/* Curated Workbenches & Labs Directory Link */}
            <Link
              href="/labs"
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/labs'
                  ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label={`All ${TOTAL_LABS} Interactive Labs`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span className="hidden md:inline">Labs</span>
              <span className="hidden xl:inline text-[10px] opacity-70 tabular-nums">
                {TOTAL_LABS}
              </span>
            </Link>

            {/* Protocol Dependency Map Link */}
            <Link
              href="/map"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/map'
                  ? 'bg-[var(--cobalt)] text-[#FAF7F1] border-[var(--cobalt)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Protocol Dependency Map"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Map</span>
            </Link>

            {/* Quorum & Fault-Tolerance Workbench Link */}
            <Link
              href="/bench"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/bench'
                  ? 'bg-[var(--emerald)] text-[#FAF7F1] border-[var(--emerald)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Quorum and Fault-Tolerance Workbench"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Bench</span>
            </Link>

            {/* Protocol Duel Link */}
            <Link
              href="/duel"
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/duel'
                  ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Protocol Duel Lab"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Duel</span>
            </Link>

            {/* Incident Postmortem Lab Link */}
            <Link
              href="/incidents"
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                normalizedPath === '/incidents'
                  ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
              aria-label="Incident Postmortem Lab"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Outages</span>
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
                  <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-2 sm:w-[700px] max-w-[calc(100vw-2rem)] bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)] z-50 max-h-[78vh] overflow-y-auto">
                    <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--chassis)] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink-secondary)]">
                          Complete Protocol Index · {TOTAL_CONCEPTS} Plates &amp; {TOTAL_LABS} Labs
                        </span>
                        <div className="flex items-center gap-3">
                          <Link
                            href="/labs"
                            onClick={() => setShowIndexMenu(false)}
                            className="font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-0.5 bg-[var(--ink)] text-[var(--paper-elevated)] hover:bg-[var(--signal)] transition-colors font-semibold"
                          >
                            All {TOTAL_LABS} Workbenches →
                          </Link>
                          <Link
                            href="/"
                            onClick={() => setShowIndexMenu(false)}
                            className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--ink)] hover:underline"
                          >
                            Atlas Home →
                          </Link>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--rule)]">
                        {LAB_CATEGORIES.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/labs?category=${encodeURIComponent(cat.id)}`}
                            onClick={() => setShowIndexMenu(false)}
                            className={`font-mono text-[10px] tracking-[0.06em] uppercase px-2 py-0.5 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] transition-colors ${labToneTextClass(
                              cat.tone
                            )}`}
                          >
                            {cat.index} · {cat.shortLabel}
                          </Link>
                        ))}
                      </div>
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
          className="fixed inset-0 z-50 bg-[#161614]/50 backdrop-blur-[2px] flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search Atlas"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--rule)] bg-[var(--paper)]">
              <Search className="w-4 h-4 text-[var(--ink-muted)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search the Distributed Systems Atlas"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handlePaletteKeyDown}
                placeholder={`Search ${SEARCH_KIND_COUNTS.plate} plates, ${SEARCH_KIND_COUNTS.scenario} scenarios, ${SEARCH_KIND_COUNTS.glossary} glossary terms, ${SEARCH_KIND_COUNTS.paper} papers, runbooks, labs...`}
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

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[var(--rule)] bg-[var(--chassis)]/65 font-mono text-[10px] uppercase tracking-wider">
              {(
                [
                  { id: 'all', label: `All (${ATLAS_SEARCH_INDEX.length})` },
                  { id: 'plate', label: `Plates (${SEARCH_KIND_COUNTS.plate})` },
                  { id: 'scenario', label: `Scenarios (${SEARCH_KIND_COUNTS.scenario})` },
                  { id: 'lab', label: `Labs & Cases (${SEARCH_KIND_COUNTS.lab})` },
                  { id: 'glossary', label: `Glossary (${SEARCH_KIND_COUNTS.glossary})` },
                  { id: 'paper', label: `Papers (${SEARCH_KIND_COUNTS.paper})` },
                  { id: 'runbook', label: `Runbooks (${SEARCH_KIND_COUNTS.runbook})` },
                  { id: 'duel', label: `Duels (${SEARCH_KIND_COUNTS.duel})` },
                  { id: 'incident', label: `Outages (${SEARCH_KIND_COUNTS.incident})` },
                ] as const
              ).map((tab) => {
                const active = searchFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSearchFilter(tab.id);
                      setSelectedIdx(0);
                    }}
                    className={`px-2 py-1 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] font-semibold'
                        : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Recent Visits Quick-Return Strip */}
            {query.trim() === '' && searchFilter === 'all' && recentVisits.length > 0 && (
              <div className="px-4 py-2 border-b border-[var(--rule)] bg-[var(--paper)] flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mr-1">
                  <Clock className="w-3 h-3" />
                  Recent:
                </span>
                {recentVisits.map((visit) => (
                  <button
                    key={visit.path}
                    type="button"
                    onClick={() => {
                      setShowCommandPalette(false);
                      router.push(visit.path);
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--paper-elevated)] hover:bg-[var(--ink)] hover:text-[var(--paper-elevated)] border border-[var(--rule)] font-mono text-[10px] text-[var(--ink-secondary)] transition-colors cursor-pointer"
                  >
                    <span className="opacity-70">{visit.badge}</span>
                    <span className="truncate max-w-[140px]">{visit.title}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[55vh] overflow-y-auto divide-y divide-[var(--rule)]">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-xs text-[var(--ink-muted)]">
                  No Atlas entries matching &ldquo;{query}&rdquo;
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const isSelected = idx === selectedIdx;
                  const conceptId = item.kind === 'plate' ? item.id.replace('plate:', '') : null;
                  const badgeTone =
                    item.kind === 'incident' || item.kind === 'runbook'
                      ? isSelected
                        ? 'bg-[#D9441E] text-[#FAF7F1]'
                        : 'bg-[var(--signal)]/12 text-[var(--signal)]'
                      : item.kind === 'duel' || item.kind === 'paper'
                      ? isSelected
                        ? 'bg-[#A8640B] text-[#FAF7F1]'
                        : 'bg-[var(--ochre)]/12 text-[var(--ochre)]'
                      : item.kind === 'lab'
                      ? isSelected
                        ? 'bg-[#0F6B50] text-[#FAF7F1]'
                        : 'bg-[var(--emerald)]/12 text-[var(--emerald)]'
                      : item.kind === 'scenario' || item.kind === 'glossary'
                      ? isSelected
                        ? 'bg-[#1D4B8F] text-[#FAF7F1]'
                        : 'bg-[var(--cobalt)]/12 text-[var(--cobalt)]'
                      : isSelected
                      ? 'bg-[#FAF7F1]/15 text-[#FB923C]'
                      : 'bg-[var(--chassis)] text-[var(--ink-secondary)]';

                  return (
                    <button
                      key={item.id}
                      ref={isSelected ? activeResultRef : null}
                      type="button"
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => {
                        setShowCommandPalette(false);
                        router.push(item.href);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                          : 'text-[var(--ink)] hover:bg-[var(--chassis)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {conceptId ? (
                          <div
                            className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${
                              isSelected
                                ? 'border-[#FAF7F1]/25 bg-[#FAF7F1]/10 text-[#FAF7F1]'
                                : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]'
                            }`}
                          >
                            <ConceptGlyph id={conceptId} className="w-6 h-6" />
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider flex-shrink-0 ${badgeTone}`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {conceptId && (
                              <span
                                className={`font-mono text-[10px] tabular-nums ${
                                  isSelected ? 'text-[#FB923C]' : 'text-[var(--ink-muted)]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <span className="text-sm font-medium truncate">{item.title}</span>
                          </div>
                          <div
                            className={`font-mono text-[10px] truncate mt-0.5 ${
                              isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'
                            }`}
                          >
                            {item.subtitle}
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

            <div className="px-4 py-2 border-t border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between gap-3 font-mono text-[10px] text-[var(--ink-muted)] uppercase">
              <span>↑↓ Navigate · ↵ Open</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommandPalette(false);
                    setShowShortcutsModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--signal)] cursor-pointer"
                >
                  <Keyboard className="w-3 h-3" />
                  <span>Shortcuts (?)</span>
                </button>
                <span>ESC Close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Keyboard Shortcuts Cheat Sheet (? key) */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 bg-[#161614]/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard Shortcuts"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ink)] bg-[var(--paper)]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[var(--signal)]" />
                <h2 className="font-editorial text-xl text-[var(--ink)]">
                  Atlas Keyboard Shortcuts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Close keyboard shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-[var(--rule)] px-5 py-2">
              {KEYBOARD_SHORTCUTS.map((row) => (
                <div
                  key={row.keys}
                  className="py-2.5 flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-[var(--ink-secondary)]">{row.action}</span>
                  <kbd className="px-2 py-1 bg-[var(--chassis)] border border-[var(--rule)] font-mono text-[11px] text-[var(--ink)] flex-shrink-0">
                    {row.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="px-5 py-2.5 border-t border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between font-mono text-[10px] uppercase text-[var(--ink-muted)]">
              <span>Press ? anywhere outside inputs</span>
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
