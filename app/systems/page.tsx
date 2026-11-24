'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  ShieldCheck,
  GitCommitHorizontal,
} from 'lucide-react';
import { REAL_SYSTEMS, getRealSystemById } from '@/lib/real-systems';
import { CONCEPTS_BY_ID } from '@/lib/catalog';

export default function RealSystemsPage() {
  const [selectedSystemId, setSelectedSystemId] = useState<string>(REAL_SYSTEMS[0].id);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);

  const activeSystem = getRealSystemById(selectedSystemId);
  const activeLayer = activeSystem.layers[selectedLayerIndex] ?? activeSystem.layers[0];

  const handleSelectSystem = (id: string) => {
    setSelectedSystemId(id);
    setSelectedLayerIndex(0);
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--signal)] font-semibold">
            <Layers className="w-3.5 h-3.5" />
            PRODUCTION ARCHITECTURE BLUEPRINTS · 06 COMPOSITE SYSTEMS
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        {/* Heading + System Selector */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
              Inside Real <em className="italic text-[var(--signal)] font-normal">Infrastructure</em>
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
              Real production databases and streaming engines never rely on a single algorithm in
              isolation. Inspect how 6 landmark systems compose consensus, partitioning, clocks,
              gossip, and atomic commit layers—and jump directly into each live Atlas plate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REAL_SYSTEMS.map((sys) => {
              const active = sys.id === activeSystem.id;
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => handleSelectSystem(sys.id)}
                  className={`px-3.5 py-2.5 border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="font-mono text-xs uppercase tracking-wider font-semibold">
                    <span className={active ? 'text-[#FB923C] mr-1.5' : 'text-[var(--signal)] mr-1.5'}>
                      {sys.number}
                    </span>
                    {sys.name}
                  </div>
                  <div
                    className={`font-mono text-[10px] mt-0.5 truncate ${
                      active ? 'text-[#C8C3B8]' : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {sys.category} · {sys.capProfile}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* System Overview Header Strip */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] mb-6">
          <div className="px-5 py-3 border-b border-[var(--ink)] bg-[var(--chassis)] flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-wider">
            <span className="text-[var(--ink)] font-semibold">
              BLUEPRINT {activeSystem.number} · {activeSystem.category}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2 py-0.5 bg-[var(--cobalt)] text-[#FAF7F1] font-semibold">
                {activeSystem.capProfile}
              </span>
              <span className="text-[var(--ink-secondary)]">{activeSystem.faultModel}</span>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-2">
              <h2 className="font-editorial text-3xl text-[var(--ink)]">{activeSystem.name}</h2>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                {activeSystem.summary}
              </p>
            </div>
            <div className="lg:col-span-5 p-3.5 bg-[var(--paper)] border border-[var(--rule)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold mb-1">
                Failure &amp; Recovery Behavior
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                {activeSystem.failureStory}
              </p>
            </div>
          </div>
        </section>

        {/* Main Blueprint Split: Clickable Architecture Stack + Obsidian Layer Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left 6 Columns: Layered Protocol Stack */}
          <div className="lg:col-span-6 space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Click any protocol layer to inspect its invariant &amp; live plates
            </div>

            {activeSystem.layers.map((layer, idx) => {
              const selected = idx === selectedLayerIndex;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setSelectedLayerIndex(idx)}
                  className={`w-full text-left p-4 border transition-all cursor-pointer ${
                    selected
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)] shadow-[5px_5px_0_0_var(--signal)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.12em] font-semibold ${
                        selected ? 'text-[#FB923C]' : 'text-[var(--signal)]'
                      }`}
                    >
                      {layer.tier}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase ${
                        selected ? 'text-[#34D399]' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {layer.conceptIds.length} PLATE{layer.conceptIds.length === 1 ? '' : 'S'}
                    </span>
                  </div>
                  <div className="font-editorial text-2xl leading-snug">{layer.name}</div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      selected ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                    }`}
                  >
                    {layer.problemSolved}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right 6 Columns: Recessed Obsidian Layer Telemetry & Live Plate Links */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <section className="border border-[var(--ink)] bg-[#111413] text-[#F4F0E8] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F0E8]/15">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#FB923C] font-semibold">
                  ACTIVE SUBSYSTEM · {activeLayer.tier}
                </span>
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              </div>

              <div>
                <h3 className="font-editorial text-2xl text-[#F4F0E8]">{activeLayer.name}</h3>
                <p className="text-sm text-[#C8C3B8] mt-1.5 leading-relaxed">
                  {activeLayer.problemSolved}
                </p>
              </div>

              <div className="p-3 bg-[#181C1A] border border-[#34D399]/35 font-mono text-xs">
                <div className="text-[9.5px] uppercase tracking-[0.12em] text-[#34D399] mb-1">
                  Enforced Formal Invariant
                </div>
                <div className="text-[#F4F0E8]">{activeLayer.keyInvariant}</div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9E9B90]">
                  Interactive Atlas Plates in This Layer
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeLayer.conceptIds.map((cid) => {
                    const concept = CONCEPTS_BY_ID.get(cid);
                    if (!concept) return null;
                    return (
                      <Link
                        key={cid}
                        href={concept.path}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D9441E] hover:bg-[#B83412] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider transition-colors"
                      >
                        <span>
                          Plate {concept.plateNumber} · {concept.name}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* End-to-End Write Path Pipeline */}
            <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-secondary)] font-semibold pb-2 border-b border-[var(--rule)]">
                <GitCommitHorizontal className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>End-to-End Write Path Trace</span>
              </div>

              <ol className="space-y-2.5">
                {activeSystem.writePathSteps.map((stepText, idx) => (
                  <li key={stepText} className="flex items-start gap-3 text-sm text-[var(--ink)]">
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-[var(--chassis)] border border-[var(--rule)] text-[var(--signal)] tabular-nums mt-0.5 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed text-[var(--ink-secondary)]">{stepText}</span>
                  </li>
                ))}
              </ol>

              {/* Related Lab Jump Row */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--rule)]">
                {activeSystem.relatedDuelId && (
                  <Link
                    href={`/duel?duel=${activeSystem.relatedDuelId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper)] hover:bg-[var(--chassis)] border border-[var(--ink)] text-[var(--ink)] font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5 text-[var(--signal)]" />
                    <span>Open Related Duel</span>
                  </Link>
                )}
                {activeSystem.relatedIncidentId && (
                  <Link
                    href={`/incidents?incident=${activeSystem.relatedIncidentId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper)] hover:bg-[var(--chassis)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)] font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--signal)]" />
                    <span>Diagnose Related Outage</span>
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
