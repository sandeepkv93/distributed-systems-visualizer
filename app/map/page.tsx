'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  GitBranch,
  Network,
  RotateCcw,
} from 'lucide-react';
import {
  CONCEPTS_BY_ID,
  CONCEPT_DOMAINS,
  ConceptDomainId,
  TOTAL_CONCEPTS,
} from '@/lib/catalog';
import {
  MAP_TIERS,
  MapRelationType,
  PROTOCOL_MAP_EDGES,
  PROTOCOL_MAP_NODES,
  PROTOCOL_MAP_NODES_BY_ID,
  getDownstreamIds,
  getUpstreamIds,
} from '@/lib/protocol-map';
import { useProgress } from '@/hooks/useProgress';
import { SCOPE_COLORS } from '@/components/ScopeSvgKit';
import ConceptGlyph from '@/components/ConceptGlyph';

const RELATION_STYLE: Record<
  MapRelationType,
  { color: string; label: string; dashed?: boolean }
> = {
  'builds-on': { color: SCOPE_COLORS.cobalt, label: 'Builds On' },
  extends: { color: SCOPE_COLORS.emerald, label: 'Extends' },
  'trade-off': { color: SCOPE_COLORS.signal, label: 'Trade-Off', dashed: true },
  uses: { color: SCOPE_COLORS.amber, label: 'Uses', dashed: true },
};

type CompletionFilter = 'all' | 'completed' | 'remaining';

export default function ProtocolDependencyMapPage() {
  const { progress } = useProgress();
  const [selectedId, setSelectedId] = useState<string>('raft');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<ConceptDomainId | 'all'>('all');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');

  const completedSet = useMemo(
    () => new Set(progress.conceptsCompleted),
    [progress.conceptsCompleted]
  );

  const focusId = hoveredId ?? selectedId;

  const upstreamSet = useMemo(() => new Set(getUpstreamIds(focusId)), [focusId]);
  const downstreamSet = useMemo(() => new Set(getDownstreamIds(focusId)), [focusId]);

  const selectedConcept = CONCEPTS_BY_ID.get(selectedId) ?? null;
  const selectedUpstream = useMemo(
    () =>
      PROTOCOL_MAP_EDGES.filter((e) => e.to === selectedId).map((edge) => ({
        edge,
        concept: CONCEPTS_BY_ID.get(edge.from)!,
      })),
    [selectedId]
  );
  const selectedDownstream = useMemo(
    () =>
      PROTOCOL_MAP_EDGES.filter((e) => e.from === selectedId).map((edge) => ({
        edge,
        concept: CONCEPTS_BY_ID.get(edge.to)!,
      })),
    [selectedId]
  );

  const matchesFilter = (conceptId: string): boolean => {
    const concept = CONCEPTS_BY_ID.get(conceptId);
    if (!concept) return false;
    if (domainFilter !== 'all' && concept.domainId !== domainFilter) return false;
    if (completionFilter === 'completed' && !completedSet.has(conceptId)) return false;
    if (completionFilter === 'remaining' && completedSet.has(conceptId)) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Monograph Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[var(--rule)]">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-secondary)] hover:text-[var(--ink)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atlas Index</span>
            </Link>
            <span className="text-[var(--ink-muted)]">/</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
              Systems Genealogy · 22 Protocols
            </span>
          </div>
          <div className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
            {completedSet.size}/{TOTAL_CONCEPTS} PLATES VERIFIED · {PROTOCOL_MAP_EDGES.length}{' '}
            DEPENDENCY LINKS
          </div>
        </div>

        {/* Title & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
          <div className="max-w-2xl">
            <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--ink)] tracking-[-0.02em] font-normal">
              Protocol Dependency <em className="italic text-[var(--signal)] font-normal">Map</em>
            </h1>
            <p className="text-sm text-[var(--ink-secondary)] mt-2 leading-relaxed">
              Trace how logical clocks, failure detectors, and CAP trade-offs compose into Paxos,
              Raft, replication logs, distributed locks, and atomic commit. Select any plate to
              highlight its upstream prerequisites and downstream protocols.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Completion Filter */}
            <div className="inline-flex border border-[var(--rule)] bg-[var(--paper-elevated)] divide-x divide-[var(--rule)]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'completed', label: 'Verified' },
                  { id: 'remaining', label: 'Remaining' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCompletionFilter(opt.id)}
                  className={`px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                    completionFilter === opt.id
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] font-semibold'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--chassis)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(domainFilter !== 'all' || completionFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setDomainFilter('all');
                  setCompletionFilter('all');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-[var(--rule)] bg-[var(--paper-elevated)] text-[var(--ink-secondary)] hover:border-[var(--ink)] hover:text-[var(--ink)] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Domain Filter Ribbon */}
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setDomainFilter('all')}
            className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              domainFilter === 'all'
                ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
            }`}
          >
            All Domains (22)
          </button>
          {CONCEPT_DOMAINS.map((domain) => (
            <button
              key={domain.id}
              type="button"
              onClick={() => setDomainFilter(domain.id)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                domainFilter === domain.id
                  ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              {domain.index} · {domain.shortLabel}
            </button>
          ))}
        </div>

        {/* Main Instrument Layout: Obsidian Graph + Archival Spec Drawer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Recessed Obsidian Dependency Oscilloscope */}
          <div className="xl:col-span-8 bg-[#111413] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)] overflow-hidden">
            {/* Oscilloscope Top Strip */}
            <div className="px-4 py-2.5 border-b border-[rgba(244,240,232,0.12)] bg-[#0D100F] flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9E9B90]">
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-[#D9441E]" />
                <span>Topology Scope · Click or hover any plate</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {(Object.keys(RELATION_STYLE) as MapRelationType[]).map((rel) => (
                  <span key={rel} className="inline-flex items-center gap-1.5">
                    <span
                      className="w-3 h-0.5 inline-block"
                      style={{
                        backgroundColor: RELATION_STYLE[rel].color,
                      }}
                    />
                    <span>{RELATION_STYLE[rel].label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive SVG Graph */}
            <div
              className="w-full overflow-x-auto"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(244, 240, 232, 0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <svg
                viewBox="0 0 1180 760"
                preserveAspectRatio="xMidYMid meet"
                className="w-full min-w-[780px] h-auto block"
                role="img"
                aria-label="Interactive distributed systems protocol dependency map"
              >
                <defs>
                  {(Object.keys(RELATION_STYLE) as MapRelationType[]).map((rel) => (
                    <marker
                      key={rel}
                      id={`map-arrow-${rel}`}
                      viewBox="0 0 10 10"
                      refX="8.5"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill={RELATION_STYLE[rel].color} />
                    </marker>
                  ))}
                </defs>

                {/* Tier Column Guides & Headers */}
                {MAP_TIERS.map((col) => (
                  <g key={col.tier}>
                    <line
                      x1={col.x}
                      y1={46}
                      x2={col.x}
                      y2={730}
                      stroke="rgba(244, 240, 232, 0.06)"
                      strokeWidth="1"
                      strokeDasharray="3 5"
                    />
                    <text
                      x={col.x}
                      y={30}
                      textAnchor="middle"
                      fill="#9E9B90"
                      fontSize="10"
                      fontWeight="600"
                      letterSpacing="0.14em"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {col.label}
                    </text>
                  </g>
                ))}

                {/* Directed Dependency Curves */}
                {PROTOCOL_MAP_EDGES.map((edge) => {
                  const source = PROTOCOL_MAP_NODES_BY_ID.get(edge.from);
                  const target = PROTOCOL_MAP_NODES_BY_ID.get(edge.to);
                  if (!source || !target) return null;

                  const isUpstreamEdge = edge.to === focusId;
                  const isDownstreamEdge = edge.from === focusId;
                  const isActive = isUpstreamEdge || isDownstreamEdge;
                  const bothVisible = matchesFilter(edge.from) && matchesFilter(edge.to);

                  const startX = source.x + 86;
                  const startY = source.y;
                  const endX = target.x - 90;
                  const endY = target.y;

                  // Same-column vertical edge vs cross-tier bezier curve
                  const pathD =
                    source.tier === target.tier
                      ? `M ${source.x} ${source.y + (target.y > source.y ? 26 : -26)} L ${target.x} ${target.y + (target.y > source.y ? -28 : 28)}`
                      : `M ${startX} ${startY} C ${startX + (endX - startX) * 0.45} ${startY}, ${startX + (endX - startX) * 0.55} ${endY}, ${endX} ${endY}`;

                  const relStyle = RELATION_STYLE[edge.relation];
                  const opacity = isActive ? 0.95 : bothVisible ? 0.2 : 0.06;

                  return (
                    <path
                      key={`${edge.from}->${edge.to}`}
                      d={pathD}
                      fill="none"
                      stroke={relStyle.color}
                      strokeWidth={isActive ? 2.2 : 1.1}
                      strokeDasharray={relStyle.dashed ? '5 4' : undefined}
                      opacity={opacity}
                      markerEnd={isActive ? `url(#map-arrow-${edge.relation})` : undefined}
                      className="transition-opacity duration-150"
                    />
                  );
                })}

                {/* Protocol Plate Nodes */}
                {PROTOCOL_MAP_NODES.map((node) => {
                  const concept = CONCEPTS_BY_ID.get(node.conceptId);
                  if (!concept) return null;

                  const isFocused = focusId === node.conceptId;
                  const isSelected = selectedId === node.conceptId;
                  const isUpstream = upstreamSet.has(node.conceptId);
                  const isDownstream = downstreamSet.has(node.conceptId);
                  const isCompleted = completedSet.has(node.conceptId);
                  const inFilter = matchesFilter(node.conceptId);

                  const strokeColor = isSelected
                    ? SCOPE_COLORS.inkLight
                    : isFocused
                    ? SCOPE_COLORS.signal
                    : isUpstream
                    ? SCOPE_COLORS.cobalt
                    : isDownstream
                    ? SCOPE_COLORS.signal
                    : isCompleted
                    ? SCOPE_COLORS.emerald
                    : 'rgba(244, 240, 232, 0.22)';

                  const fillColor = isSelected
                    ? '#231A17'
                    : isUpstream
                    ? '#131E29'
                    : isDownstream
                    ? '#241814'
                    : '#171C1A';

                  const nodeOpacity =
                    isFocused || isSelected || isUpstream || isDownstream
                      ? 1
                      : inFilter
                      ? 0.85
                      : 0.22;

                  return (
                    <g
                      key={node.conceptId}
                      transform={`translate(${node.x - 86}, ${node.y - 25})`}
                      onClick={() => setSelectedId(node.conceptId)}
                      onMouseEnter={() => setHoveredId(node.conceptId)}
                      onMouseLeave={() => setHoveredId(null)}
                      opacity={nodeOpacity}
                      className="cursor-pointer transition-opacity duration-150"
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${concept.name} (Plate ${concept.plateNumber})`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(node.conceptId);
                        }
                      }}
                    >
                      <rect
                        width="172"
                        height="50"
                        rx="2"
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected || isFocused ? 2 : 1.2}
                      />

                      {/* Top plate number + status indicator */}
                      <text
                        x="10"
                        y="16"
                        fill={
                          isUpstream
                            ? SCOPE_COLORS.cobalt
                            : isDownstream
                            ? SCOPE_COLORS.signal
                            : '#9E9B90'
                        }
                        fontSize="9"
                        fontWeight="600"
                        letterSpacing="0.1em"
                        fontFamily="var(--font-mono), monospace"
                      >
                        PL.{concept.plateNumber}
                        {isUpstream ? ' · PREREQ' : isDownstream ? ' · NEXT' : ''}
                      </text>

                      {/* Completed Emerald Dot */}
                      {isCompleted && (
                        <circle cx="158" cy="13" r="4" fill={SCOPE_COLORS.emerald} />
                      )}

                      {/* Protocol Label */}
                      <text
                        x="10"
                        y="35"
                        fill="#F4F0E8"
                        fontSize="12"
                        fontWeight="600"
                        fontFamily="var(--font-mono), monospace"
                      >
                        {node.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Bottom Key Strip */}
            <div className="px-4 py-2 border-t border-[rgba(244,240,232,0.12)] bg-[#0D100F] flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[#9E9B90]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                  <span>Upstream Prerequisite</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9441E]" />
                  <span>Downstream Dependent</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
                  <span>Verified in Ledger</span>
                </span>
              </div>
              <span className="uppercase tracking-wider">Left → Right Architectural Lineage</span>
            </div>
          </div>

          {/* Right Archival Plate Specification Card */}
          <aside className="xl:col-span-4 bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)] flex flex-col">
            {selectedConcept && (
              <>
                <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--chassis)] flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
                  <span className="text-[var(--ink-secondary)]">
                    PLATE {selectedConcept.plateNumber} · {selectedConcept.domainLabel}
                  </span>
                  {completedSet.has(selectedConcept.id) ? (
                    <span className="inline-flex items-center gap-1 text-[var(--emerald)] font-semibold">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-[var(--ink-muted)]">Unverified</span>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  {/* Header with Glyph */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 border border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center flex-shrink-0">
                      <ConceptGlyph id={selectedConcept.id} className="w-8 h-8 text-[var(--ink)]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-editorial text-2xl text-[var(--ink)] leading-tight">
                        {selectedConcept.name}
                      </h2>
                      <div className="font-mono text-[11px] text-[var(--ink-muted)] mt-1">
                        {selectedConcept.citation} · {selectedConcept.mechanism}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                    {selectedConcept.description}
                  </p>

                  {/* Direct Launch CTA */}
                  <Link
                    href={selectedConcept.path}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-[0.1em] transition-colors"
                  >
                    <span>Open Plate {selectedConcept.plateNumber}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>

                  {/* Upstream Prerequisites */}
                  <div className="pt-4 border-t border-[var(--rule)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--cobalt)] flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Builds On / Prerequisites ({selectedUpstream.length})</span>
                      </span>
                    </div>
                    {selectedUpstream.length === 0 ? (
                      <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                        Foundational concept — start here without prerequisites.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedUpstream.map(({ edge, concept }) => (
                          <button
                            key={`up-${edge.from}`}
                            type="button"
                            onClick={() => setSelectedId(concept.id)}
                            className="w-full px-3 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] border border-[var(--rule)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[var(--ink)] truncate">
                                {concept.plateNumber} · {concept.name}
                              </div>
                              <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                                {edge.relation} · {edge.label}
                              </div>
                            </div>
                            {completedSet.has(concept.id) && (
                              <Check className="w-3.5 h-3.5 text-[var(--emerald)] flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Downstream Dependents */}
                  <div className="pt-4 border-t border-[var(--rule)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--signal)] flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 rotate-180" />
                        <span>Unlocks / Downstream ({selectedDownstream.length})</span>
                      </span>
                    </div>
                    {selectedDownstream.length === 0 ? (
                      <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                        Capstone protocol synthesizing lower layers.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDownstream.map(({ edge, concept }) => (
                          <button
                            key={`down-${edge.to}`}
                            type="button"
                            onClick={() => setSelectedId(concept.id)}
                            className="w-full px-3 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] border border-[var(--rule)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[var(--ink)] truncate">
                                {concept.plateNumber} · {concept.name}
                              </div>
                              <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                                {edge.relation} · {edge.label}
                              </div>
                            </div>
                            {completedSet.has(concept.id) && (
                              <Check className="w-3.5 h-3.5 text-[var(--emerald)] flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
