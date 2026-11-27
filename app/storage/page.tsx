'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Database,
  HardDrive,
  Layers,
  RotateCcw,
  Search,
  Sliders,
  Zap,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  CompactionStrategy,
  STORAGE_ENGINE_SYSTEMS,
  STORAGE_PRESETS,
  StorageParams,
  applyWriteBatch,
  createInitialStorageSim,
  evaluateStorageEngines,
  simulatePointLookup,
  triggerManualCompaction,
} from '@/lib/storage-engines';

export default function StorageEnginesLabPage() {
  const [activePreset, setActivePreset] = useState<string>('write-heavy-telemetry');
  const [params, setParams] = useState<StorageParams>(STORAGE_PRESETS[0].params);
  const [sim, setSim] = useState(() => createInitialStorageSim());

  const comparison = useMemo(() => evaluateStorageEngines(params), [params]);

  const applyPreset = (id: string) => {
    const preset = STORAGE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setParams(preset.params);
  };

  const updateParam = <K extends keyof StorageParams>(key: K, value: StorageParams[K]) => {
    setActivePreset('custom');
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME III · STORAGE ENGINE INTERNALS · LSM-TREE VS B+TREE &amp; RUM LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/replication-log" className="text-[var(--signal)] hover:underline">
              Plate 10 · Replication Log →
            </Link>
            <Link href="/sharding-rebalancing" className="text-[var(--cobalt)] hover:underline">
              Plate 13 · Sharding →
            </Link>
            <Link href="/systems" className="text-[var(--emerald)] hover:underline">
              Real-World Systems →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Storage Engine Internals: LSM-Tree vs. B+Tree
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Every distributed database node sits on a local storage engine constrained by the{' '}
              <strong className="text-[var(--ink)]">RUM Conjecture</strong> (Read, Update/Write, and
              Memory/Space Amplification). Compare sequential{' '}
              <strong className="text-[var(--ink)]">LSM-Tree SSTables + Bloom Filters</strong>{' '}
              against in-place <strong className="text-[var(--ink)]">B+Tree 8KB Pages</strong>{' '}
              under live workload shifts and compaction cycles.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Recommended
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--signal)]">
                {comparison.recommended === 'lsm' ? 'LSM-TREE' : 'B+TREE'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Bloom FPR
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {comparison.bloomFalsePositivePct}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Depth
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--ink)]">
                L{comparison.lsmLevels} / H{comparison.btreeHeight}
              </div>
            </div>
          </div>
        </header>

        {/* Workload Controls */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Workload &amp; Compaction Tuning</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              {STORAGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1 border uppercase tracking-wider transition-colors ${
                    activePreset === p.id
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Write / Read Mix</span>
                <span className="font-semibold">
                  {params.writePct}% W / {100 - params.writePct}% R
                </span>
              </div>
              <input
                type="range"
                aria-label="Write / Read Mix (% writes)"
                min={5}
                max={95}
                step={5}
                value={params.writePct}
                onChange={(e) => updateParam('writePct', Number(e.target.value))}
                className="w-full accent-[#D9441E]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Bloom Filter Bits / Key</span>
                <span className="font-semibold">
                  {params.bloomBitsPerKey} bits ({comparison.bloomFalsePositivePct}% FPR)
                </span>
              </div>
              <input
                type="range"
                aria-label="Bloom Filter Bits per Key"
                min={0}
                max={16}
                value={params.bloomBitsPerKey}
                onChange={(e) => updateParam('bloomBitsPerKey', Number(e.target.value))}
                className="w-full accent-[#1D4B8F]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">B+Tree Buffer Pool Hit Rate</span>
                <span className="font-semibold">{params.bufferPoolHitPct}%</span>
              </div>
              <input
                type="range"
                aria-label="B+Tree Buffer Pool Hit Rate (%)"
                min={15}
                max={95}
                step={5}
                value={params.bufferPoolHitPct}
                onChange={(e) => updateParam('bufferPoolHitPct', Number(e.target.value))}
                className="w-full accent-[#0F6B50]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Record Size</span>
                <span className="font-semibold">{params.recordBytes} bytes</span>
              </div>
              <input
                type="range"
                aria-label="Record Size (bytes)"
                min={64}
                max={1024}
                step={64}
                value={params.recordBytes}
                onChange={(e) => updateParam('recordBytes', Number(e.target.value))}
                className="w-full accent-[#D9441E]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Dataset Size</span>
                <span className="font-semibold">{params.datasetGb} GB</span>
              </div>
              <input
                type="range"
                aria-label="Dataset Size (GB)"
                min={10}
                max={1000}
                step={10}
                value={params.datasetGb}
                onChange={(e) => updateParam('datasetGb', Number(e.target.value))}
                className="w-full accent-[#1D4B8F]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                LSM Compaction Strategy
              </label>
              <div className="grid grid-cols-2 border border-[var(--rule)] divide-x divide-[var(--rule)]">
                {(
                  [
                    { id: 'leveled', label: 'Leveled (RocksDB)' },
                    { id: 'size-tiered', label: 'Size-Tiered (STCS)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateParam('compactionStrategy', opt.id as CompactionStrategy)}
                    className={`py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      params.compactionStrategy === opt.id
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'bg-[var(--paper)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Structural Schematics + Live Write/Compact/Lookup Controls */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] mb-8">
          <div className="p-4 border-b border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--cobalt)]" />
              <span>Live Disk-Layout Simulator · {sim.writesApplied.toLocaleString()} Writes Applied</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <button
                onClick={() => setSim((s) => applyWriteBatch(s))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--signal)] text-[var(--paper)] uppercase tracking-wider font-semibold hover:opacity-90"
              >
                <Zap className="w-3 h-3" /> +1,000 Random Writes
              </button>
              <button
                onClick={() => setSim((s) => triggerManualCompaction(s))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] uppercase tracking-wider hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                <HardDrive className="w-3 h-3" /> Compact L0 → L1
              </button>
              <button
                onClick={() => setSim((s) => simulatePointLookup(s, params.bloomBitsPerKey))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--cobalt)] bg-[var(--cobalt)] text-[var(--paper)] uppercase tracking-wider hover:opacity-90"
              >
                <Search className="w-3 h-3" /> Probe Point Lookup
              </button>
              <button
                onClick={() => setSim(createInitialStorageSim())}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] uppercase hover:border-[var(--ink)]"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#262B29] bg-[#111413] text-[#F4F0E8]">
            {/* LSM-Tree SVG Plate */}
            <div className="p-5">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-2">
                <span className="text-[#34D399] font-semibold">01 · LSM-TREE (APPEND-ONLY)</span>
                <span>Compactions: {sim.compactionsRun} · Last Lookup: {sim.lastLookupLsmProbes} SSTable(s)</span>
              </div>
              <svg viewBox="0 0 560 255" className="w-full h-auto">
                {/* WAL + MemTable */}
                <rect x="20" y="16" width="150" height="40" fill="#181D1B" stroke="#FBBF24" strokeWidth="1.5" />
                <text x="95" y="34" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace">APPEND WAL (SEQ)</text>
                <text x="95" y="48" textAnchor="middle" fill="#9A968E" fontSize="8" fontFamily="monospace">fsync sequential log</text>

                <rect x="200" y="16" width="210" height="40" fill="#181D1B" stroke="#34D399" strokeWidth="1.5" />
                <rect x="202" y="18" width={Math.max(4, (sim.memtableFillPct / 100) * 206)} height="36" fill="#0F6B50" fillOpacity="0.45" />
                <text x="305" y="34" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">MEMTABLE ({sim.memtableFillPct}%)</text>
                <text x="305" y="48" textAnchor="middle" fill="#34D399" fontSize="8" fontFamily="monospace">SkipList / Red-Black RAM</text>

                {/* Bloom Filter Gate */}
                <rect x="430" y="16" width="110" height="40" fill="#171C22" stroke="#60A5FA" strokeWidth="1.5" />
                <text x="485" y="34" textAnchor="middle" fill="#60A5FA" fontSize="10" fontFamily="monospace">BLOOM ({params.bloomBitsPerKey}b)</text>
                <text x="485" y="48" textAnchor="middle" fill="#9A968E" fontSize="8" fontFamily="monospace">FPR {comparison.bloomFalsePositivePct}%</text>

                {/* L0 SSTables */}
                <text x="20" y="96" fill="#9A968E" fontSize="9" fontFamily="monospace">L0 ({sim.l0Tables} runs)</text>
                {Array.from({ length: Math.min(6, sim.l0Tables) }).map((_, i) => (
                  <g key={`l0-${i}`}>
                    <rect x={110 + i * 70} y="78" width="60" height="28" fill="#231815" stroke="#D9441E" strokeWidth="1.5" />
                    <text x={140 + i * 70} y="96" textAnchor="middle" fill="#F4F0E8" fontSize="9" fontFamily="monospace">SST-{i}</text>
                  </g>
                ))}
                {sim.l0Tables === 0 && (
                  <text x="110" y="96" fill="#34D399" fontSize="9" fontFamily="monospace">L0 CLEAN (COMPACTED TO L1)</text>
                )}

                {/* L1 SSTables */}
                <text x="20" y="148" fill="#9A968E" fontSize="9" fontFamily="monospace">L1 ({sim.l1Tables} runs)</text>
                {Array.from({ length: Math.min(8, sim.l1Tables) }).map((_, i) => (
                  <rect key={`l1-${i}`} x={110 + i * 54} y="130" width="48" height="28" fill="#171E24" stroke="#60A5FA" strokeWidth="1.2" />
                ))}

                {/* L2 SSTables */}
                <text x="20" y="200" fill="#9A968E" fontSize="9" fontFamily="monospace">L2 ({sim.l2Tables} runs)</text>
                {Array.from({ length: Math.min(10, sim.l2Tables) }).map((_, i) => (
                  <rect key={`l2-${i}`} x={110 + i * 43} y="182" width="38" height="28" fill="#17201C" stroke="#34D399" strokeWidth="1.2" />
                ))}

                <text x="280" y="238" textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  MODE: {params.compactionStrategy.toUpperCase()} · WRITE AMP {comparison.lsm.writeAmplification}× · READ AMP {comparison.lsm.readAmplification}×
                </text>
              </svg>
            </div>

            {/* B+Tree SVG Plate */}
            <div className="p-5">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-2">
                <span className="text-[#60A5FA] font-semibold">02 · B+TREE (IN-PLACE 8KB PAGES)</span>
                <span>Page Splits: {sim.btreeSplits} · Last Lookup: {sim.lastLookupBtreePages} Leaf I/O</span>
              </div>
              <svg viewBox="0 0 560 255" className="w-full h-auto">
                {/* Buffer Pool */}
                <rect x="20" y="16" width="245" height="36" fill="#171C22" stroke="#60A5FA" strokeWidth="1.5" />
                <text x="142" y="38" textAnchor="middle" fill="#60A5FA" fontSize="10" fontFamily="monospace">
                  BUFFER POOL CACHE ({params.bufferPoolHitPct}% HIT)
                </text>

                <rect x="290" y="16" width="250" height="36" fill="#181D1B" stroke="#FBBF24" strokeWidth="1.5" />
                <text x="415" y="38" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace">
                  REDO WAL + RANDOM 8KB FLUSH
                </text>

                {/* Root node */}
                <rect x="220" y="72" width="120" height="28" fill="#181C1B" stroke="#F4F0E8" strokeWidth="1.5" />
                <text x="280" y="90" textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace">ROOT PAGE</text>

                {/* Branches */}
                <line x1="250" y1="100" x2="150" y2="128" stroke="#60A5FA" strokeWidth="1.5" />
                <line x1="310" y1="100" x2="410" y2="128" stroke="#60A5FA" strokeWidth="1.5" />
                <rect x="95" y="128" width="110" height="26" fill="#181C1B" stroke="#60A5FA" />
                <text x="150" y="145" textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily="monospace">INTERNAL A–M</text>
                <rect x="355" y="128" width="110" height="26" fill="#181C1B" stroke="#60A5FA" />
                <text x="410" y="145" textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily="monospace">INTERNAL N–Z</text>

                {/* Leaf Pages */}
                {Array.from({ length: Math.min(8, sim.btreeLeafPages) }).map((_, i) => {
                  const x = 24 + i * 65;
                  const fillWidth = Math.round((sim.btreeAvgFillPct / 100) * 54);
                  return (
                    <g key={`leaf-${i}`}>
                      <rect x={x} y="180" width="56" height="32" fill="#181C1B" stroke={sim.btreeAvgFillPct > 85 ? '#D9441E' : '#34D399'} strokeWidth="1.4" />
                      <rect x={x + 1} y="181" width={fillWidth} height="30" fill={sim.btreeAvgFillPct > 85 ? '#D9441E' : '#0F6B50'} fillOpacity="0.38" />
                      <text x={x + 28} y="200" textAnchor="middle" fill="#F4F0E8" fontSize="9" fontFamily="monospace">P{i} {sim.btreeAvgFillPct}%</text>
                    </g>
                  );
                })}

                <text x="280" y="238" textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  HEIGHT {comparison.btreeHeight} · WRITE AMP {comparison.btree.writeAmplification}× · READ AMP {comparison.btree.readAmplification}× · SPACE {comparison.btree.spaceAmplification}×
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* RUM Conjecture Side-by-Side Breakdown + Rationale */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
              RUM Conjecture Amplification Factors (Lower is Better)
            </div>
            <h2 className="font-editorial text-2xl mb-4">Read · Write · Space Trade-Off</h2>

            <div className="space-y-4 font-mono text-xs">
              {[
                {
                  label: 'Write Amplification (bytes written / logical byte)',
                  lsmVal: comparison.lsm.writeAmplification,
                  btVal: comparison.btree.writeAmplification,
                  max: Math.max(comparison.lsm.writeAmplification, comparison.btree.writeAmplification, 40),
                },
                {
                  label: 'Read Amplification (disk probes per point lookup)',
                  lsmVal: comparison.lsm.readAmplification,
                  btVal: comparison.btree.readAmplification,
                  max: Math.max(comparison.lsm.readAmplification, comparison.btree.readAmplification, 10),
                },
                {
                  label: 'Space Amplification (disk footprint / logical data)',
                  lsmVal: comparison.lsm.spaceAmplification,
                  btVal: comparison.btree.spaceAmplification,
                  max: 2.5,
                },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
                    {row.label}
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-2 text-[var(--emerald)] font-semibold">LSM</span>
                    <div className="col-span-8 h-3 bg-[var(--paper)] border border-[var(--rule)]">
                      <div
                        className="h-full bg-[#0F6B50]"
                        style={{ width: `${Math.min(100, (row.lsmVal / row.max) * 100)}%` }}
                      />
                    </div>
                    <span className="col-span-2 text-right font-semibold">{row.lsmVal}×</span>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-2 text-[var(--cobalt)] font-semibold">B+TREE</span>
                    <div className="col-span-8 h-3 bg-[var(--paper)] border border-[var(--rule)]">
                      <div
                        className="h-full bg-[#1D4B8F]"
                        style={{ width: `${Math.min(100, (row.btVal / row.max) * 100)}%` }}
                      />
                    </div>
                    <span className="col-span-2 text-right font-semibold">{row.btVal}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold mb-2">
                Architectural Verdict
              </div>
              <h2 className="font-editorial text-2xl mb-3">
                {comparison.recommended === 'lsm'
                  ? 'Favor LSM-Tree Engine (RocksDB / Pebble)'
                  : 'Favor B+Tree Engine (PostgreSQL / InnoDB)'}
              </h2>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4">
                {comparison.rationale}
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-[var(--paper)] border border-[var(--rule)]">
                  <div className="text-[9px] uppercase text-[var(--ink-muted)]">LSM Composite</div>
                  <div className="text-lg font-semibold text-[var(--emerald)]">
                    {comparison.lsm.compositeScore}
                  </div>
                </div>
                <div className="p-3 bg-[var(--paper)] border border-[var(--rule)]">
                  <div className="text-[9px] uppercase text-[var(--ink-muted)]">B+Tree Composite</div>
                  <div className="text-lg font-semibold text-[var(--cobalt)]">
                    {comparison.btree.compositeScore}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-[var(--rule)] text-xs text-[var(--ink-muted)]">
              Remember the RUM Conjecture: optimizing any two of Read, Update, or Memory/Space
              overhead inevitably increases the third.
            </p>
          </div>
        </section>

        {/* Production Engines Reference Table */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[var(--rule)]">
            <Database className="w-4 h-4 text-[var(--signal)]" />
            <h2 className="font-editorial text-2xl">Storage Engines in Distributed Systems</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {STORAGE_ENGINE_SYSTEMS.map((sys) => {
              const concept = CONCEPTS_CATALOG.find((c) => c.id === sys.conceptId);
              return (
                <div
                  key={sys.name}
                  className="p-3.5 border border-[var(--rule)] bg-[var(--paper)] flex flex-col justify-between gap-2"
                >
                  <div>
                    <span
                      className={`inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 mb-2 font-semibold ${
                        sys.engine === 'LSM-Tree'
                          ? 'bg-[#0F6B50] text-[#F4F0E8]'
                          : 'bg-[#1D4B8F] text-[#F4F0E8]'
                      }`}
                    >
                      {sys.engine}
                    </span>
                    <div className="font-editorial text-lg leading-tight">{sys.name}</div>
                    <div className="font-mono text-[10px] text-[var(--ink-secondary)] mt-1">
                      {sys.implementation}
                    </div>
                    <div className="text-[11px] text-[var(--ink-muted)] mt-1">
                      {sys.compactionOrPage}
                    </div>
                  </div>
                  {concept && (
                    <Link
                      href={concept.path}
                      className="inline-flex items-center justify-between pt-2 border-t border-[var(--rule)] font-mono text-[10px] uppercase text-[var(--cobalt)] hover:underline"
                    >
                      <span>{concept.name}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
