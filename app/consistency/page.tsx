'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  Layers,
} from 'lucide-react';
import {
  CONSISTENCY_MODELS,
  CONSISTENCY_ANOMALIES,
  ConsistencyModelId,
  getConsistencyAnomalyById,
} from '@/lib/consistency-models';
import { CONCEPTS_BY_ID } from '@/lib/catalog';

export default function ConsistencyLabPage() {
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>(CONSISTENCY_ANOMALIES[0].id);
  const [focusedModelId, setFocusedModelId] = useState<ConsistencyModelId>('linearizability');

  // Hydrate optional ?anomaly=<id> deep-link without useSearchParams
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('anomaly');
    if (fromUrl && CONSISTENCY_ANOMALIES.some((a) => a.id === fromUrl)) {
      const timer = setTimeout(() => setSelectedAnomalyId(fromUrl), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const selectAnomaly = (id: string) => {
    setSelectedAnomalyId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('anomaly', id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const anomaly = getConsistencyAnomalyById(selectedAnomalyId);
  const focusedModel =
    CONSISTENCY_MODELS.find((m) => m.id === focusedModelId) ?? CONSISTENCY_MODELS[0];

  // Layout geometry for Space-Time execution SVG
  const svgW = 880;
  const laneStartX = 148;
  const laneEndX = 844;
  const laneSpan = laneEndX - laneStartX;
  const topPad = 48;
  const laneGap = anomaly.clients.length >= 4 ? 60 : 76;
  const svgH = Math.max(240, topPad + anomaly.clients.length * laneGap + 36);

  const opCoords = new Map<string, { x1: number; x2: number; y: number }>();
  anomaly.operations.forEach((op) => {
    const laneIdx = anomaly.clients.indexOf(op.client);
    const y = topPad + laneIdx * laneGap + 18;
    const x1 = laneStartX + (op.start / 100) * laneSpan;
    const x2 = laneStartX + (op.end / 100) * laneSpan;
    opCoords.set(op.id, { x1, x2, y });
  });

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Archival Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · CONSISTENCY MODELS &amp; ANOMALIES LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/latency" className="text-[var(--cobalt)] hover:underline">
              Latency Estimator →
            </Link>
            <Link href="/advisor" className="text-[var(--emerald)] hover:underline">
              Protocol Advisor →
            </Link>
          </div>
        </div>

        {/* Editorial Title Header */}
        <header className="mb-8 space-y-3">
          <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
            Consistency Models &amp; Execution Anomalies
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-3xl">
            Inspect six canonical execution histories that strictly separate{' '}
            <strong className="font-semibold text-[var(--ink)]">Linearizability</strong>,{' '}
            <strong className="font-semibold text-[var(--ink)]">Sequential</strong>,{' '}
            <strong className="font-semibold text-[var(--ink)]">Causal</strong>,{' '}
            <strong className="font-semibold text-[var(--ink)]">Read-Your-Writes</strong>,{' '}
            <strong className="font-semibold text-[var(--ink)]">Monotonic Reads</strong>, and{' '}
            <strong className="font-semibold text-[var(--ink)]">Eventual Consistency</strong>—and see
            which distributed protocol prevents each failure mode.
          </p>
        </header>

        {/* 6-Anomaly Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-8">
          {CONSISTENCY_ANOMALIES.map((item) => {
            const isSelected = item.id === anomaly.id;
            const forbiddenCount = Object.values(item.verdicts).filter((v) => v === 'forbidden').length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectAnomaly(item.id)}
                className={`p-3.5 border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)] shadow-[4px_4px_0_0_var(--signal)]'
                    : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                  <span className={isSelected ? 'text-[#D9441E]' : 'text-[var(--signal)]'}>
                    ANOMALY {item.number}
                  </span>
                  <span className={isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-muted)]'}>
                    FORBIDDEN BY {forbiddenCount}/6
                  </span>
                </div>
                <div className="font-editorial text-lg leading-snug mt-1">{item.title}</div>
                <div
                  className={`text-xs mt-0.5 line-clamp-1 ${
                    isSelected ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                  }`}
                >
                  {item.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Interactive Bench: Space-Time Execution History + Model Verdicts */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Left 8 Cols: Space-Time Execution History SVG + Technical Diagnosis */}
          <div className="lg:col-span-8 space-y-5">
            <div className="border border-[var(--ink)] bg-[#111413] text-[#F4F0E8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.12em]">
                <span className="text-[#D9441E] font-semibold">
                  EXECUTION HISTORY · {anomaly.number} {anomaly.title.toUpperCase()}
                </span>
                <div className="flex items-center gap-3 text-[#9E9B90]">
                  <span>
                    <span className="text-[#60A5FA]">■</span> WRITE
                  </span>
                  <span>
                    <span className="text-[#34D399]">■</span> READ
                  </span>
                  <span>
                    <span className="text-[#D9441E]">■</span> ANOMALY
                  </span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto"
                role="img"
                aria-label={`Space-time execution history illustrating ${anomaly.title}`}
              >
                <defs>
                  <marker
                    id="causal-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 7 3.5, 0 7" fill="#FBBF24" />
                  </marker>
                </defs>

                {/* Real-time axis */}
                <line
                  x1={laneStartX}
                  y1={22}
                  x2={laneEndX}
                  y2={22}
                  stroke="rgba(244,240,232,0.25)"
                  strokeWidth="1"
                />
                <text
                  x={laneStartX}
                  y={14}
                  fill="#9E9B90"
                  fontSize="9.5"
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                >
                  t = 0 (REAL TIME →)
                </text>
                <text
                  x={laneEndX}
                  y={14}
                  textAnchor="end"
                  fill="#9E9B90"
                  fontSize="9.5"
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                >
                  t = 100
                </text>

                {/* Client Lanes */}
                {anomaly.clients.map((client, idx) => {
                  const y = topPad + idx * laneGap + 18;
                  return (
                    <g key={client}>
                      <text
                        x={laneStartX - 14}
                        y={y + 4}
                        textAnchor="end"
                        fill="#F4F0E8"
                        fontSize="11.5"
                        fontWeight="600"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                      >
                        {client}
                      </text>
                      <line
                        x1={laneStartX}
                        y1={y}
                        x2={laneEndX}
                        y2={y}
                        stroke="rgba(244,240,232,0.14)"
                        strokeWidth="1"
                        strokeDasharray="3 4"
                      />
                    </g>
                  );
                })}

                {/* Causal Dependency Links */}
                {(anomaly.causalLinks ?? []).map((link, idx) => {
                  const from = opCoords.get(link.fromOpId);
                  const to = opCoords.get(link.toOpId);
                  if (!from || !to) return null;
                  const x1 = from.x2;
                  const y1 = from.y;
                  const x2 = to.x1;
                  const y2 = to.y;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2 - 8;
                  return (
                    <g key={`${link.fromOpId}-${link.toOpId}-${idx}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2 - 4}
                        y2={y2}
                        stroke="#FBBF24"
                        strokeWidth="1.6"
                        strokeDasharray="4 3"
                        markerEnd="url(#causal-arrow)"
                      />
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        fill="#FBBF24"
                        fontSize="9.5"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                      >
                        {link.label}
                      </text>
                    </g>
                  );
                })}

                {/* Operation Invocation..Response Bars */}
                {anomaly.operations.map((op) => {
                  const box = opCoords.get(op.id);
                  if (!box) return null;
                  const width = Math.max(48, box.x2 - box.x1);
                  const fill =
                    op.kind === 'anomaly'
                      ? '#2D1410'
                      : op.kind === 'write'
                      ? '#13243B'
                      : '#0F2920';
                  const stroke =
                    op.kind === 'anomaly'
                      ? '#D9441E'
                      : op.kind === 'write'
                      ? '#60A5FA'
                      : '#34D399';

                  return (
                    <g key={op.id}>
                      <rect
                        x={box.x1}
                        y={box.y - 16}
                        width={width}
                        height={32}
                        rx={2}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={op.kind === 'anomaly' ? '2' : '1.5'}
                      />
                      <text
                        x={box.x1 + width / 2}
                        y={box.y + 4}
                        textAnchor="middle"
                        fill="#FAF7F1"
                        fontSize="10.5"
                        fontWeight="600"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                      >
                        {op.label}
                      </text>
                      {op.replica && (
                        <text
                          x={box.x1 + width / 2}
                          y={box.y + 27}
                          textAnchor="middle"
                          fill="#9E9B90"
                          fontSize="9"
                          fontFamily="ui-monospace, SFMono-Regular, monospace"
                        >
                          @{op.replica}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Formal Explanation + Prevention */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
                  Why This History Separates Models
                </div>
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                  {anomaly.whyItHappens}
                </p>
              </div>
              <div className="p-5 border border-[var(--ink)] bg-[var(--paper-elevated)] space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--emerald)] font-semibold">
                  How Production Systems Prevent It
                </div>
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                  {anomaly.howToPrevent}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {anomaly.enforcingConceptIds.map((cid) => {
                    const concept = CONCEPTS_BY_ID.get(cid);
                    if (!concept) return null;
                    return (
                      <Link
                        key={cid}
                        href={concept.path}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--paper)] border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider transition-colors"
                      >
                        <span>
                          PL {concept.plateNumber} · {concept.navName}
                        </span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: 6-Model Permit / Forbid Verdict Stack */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] font-semibold">
                <GitBranch className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>Hierarchy Verdicts (Strongest → Weakest)</span>
              </div>
            </div>

            <div className="divide-y divide-[var(--rule)] flex-1">
              {CONSISTENCY_MODELS.map((model) => {
                const verdict = anomaly.verdicts[model.id];
                const isForbidden = verdict === 'forbidden';
                const isFocused = focusedModelId === model.id;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setFocusedModelId(model.id)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isFocused ? 'bg-[var(--paper)]' : 'hover:bg-[var(--paper)]/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                          0{model.rank}
                        </span>
                        <span className="font-medium text-sm text-[var(--ink)] truncate">
                          {model.name}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-[var(--ink-muted)] mt-0.5">
                        {model.citation}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider font-semibold flex-shrink-0 ${
                        isForbidden
                          ? 'bg-[var(--emerald)]/12 text-[var(--emerald)] border border-[var(--emerald)]/40'
                          : 'bg-[var(--signal)]/12 text-[var(--signal)] border border-[var(--signal)]/40'
                      }`}
                    >
                      {isForbidden ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{isForbidden ? 'FORBIDDEN' : 'PERMITTED'}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Model Deep Spec Box */}
            <div className="p-4 border-t border-[var(--ink)] bg-[var(--paper)] space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                <span className="text-[var(--cobalt)] font-semibold">{focusedModel.name}</span>
                <span className="text-[var(--ink-muted)]">{focusedModel.citation}</span>
              </div>
              <p className="text-xs text-[var(--ink)] leading-relaxed">{focusedModel.guarantee}</p>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                <strong className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]">
                  Trade-off:{' '}
                </strong>
                {focusedModel.costSummary}
              </p>
            </div>
          </div>
        </section>

        {/* Full 6x6 Formal Comparison Matrix */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">
            <Layers className="w-3.5 h-3.5 text-[var(--signal)]" />
            <span>Complete 6 × 6 Consistency Separation Matrix (Click Any Row to Inspect)</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--ink)] bg-[var(--paper)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
                <th className="py-3 px-4">Execution Anomaly</th>
                {CONSISTENCY_MODELS.map((m) => (
                  <th key={m.id} className="py-3 px-3 text-center">
                    {m.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)] text-xs">
              {CONSISTENCY_ANOMALIES.map((row) => {
                const isActive = row.id === anomaly.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => selectAnomaly(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-[var(--chassis)]/80 font-medium' : 'hover:bg-[var(--paper)]'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-[var(--signal)] mr-2">
                        {row.number}
                      </span>
                      <span className="text-[var(--ink)]">{row.title}</span>
                    </td>
                    {CONSISTENCY_MODELS.map((m) => {
                      const forbid = row.verdicts[m.id] === 'forbidden';
                      return (
                        <td key={m.id} className="py-3 px-3 text-center font-mono text-[10px]">
                          <span
                            className={`inline-block px-2 py-0.5 font-semibold ${
                              forbid
                                ? 'bg-[var(--emerald)]/12 text-[var(--emerald)]'
                                : 'bg-[var(--signal)]/10 text-[var(--signal)]'
                            }`}
                          >
                            {forbid ? 'FORBID' : 'ALLOW'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
