'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  CACHE_PATTERNS,
  CachePatternId,
  EVICTION_POLICIES,
  STAMPEDE_DEFENSES,
  StampedeDefenseId,
  simulateCacheStampede,
} from '@/lib/caching-lab';

export default function CachingLabPage() {
  const [hotKeyRps, setHotKeyRps] = useState(4000);
  const [dbQueryMs, setDbQueryMs] = useState(150);
  const [dbCapacityRps, setDbCapacityRps] = useState(250);
  const [appInstances, setAppInstances] = useState(16);
  const [defense, setDefense] = useState<StampedeDefenseId>('memcache-leases');
  const [selectedPattern, setSelectedPattern] = useState<CachePatternId>('cache-aside');

  const sim = useMemo(
    () =>
      simulateCacheStampede({
        hotKeyRps,
        dbQueryMs,
        dbCapacityRps,
        appInstances,
        defense,
      }),
    [hotKeyRps, dbQueryMs, dbCapacityRps, appInstances, defense]
  );

  const activePattern = useMemo(
    () => CACHE_PATTERNS.find((p) => p.id === selectedPattern) ?? CACHE_PATTERNS[0],
    [selectedPattern]
  );

  const maxY = Math.max(dbCapacityRps * 1.4, sim.peakUnprotectedRps * 1.15);
  const toX = (tick: number) => 58 + (tick / 15) * 570;
  const toY = (rps: number) => 205 - (Math.min(maxY, rps) / maxY) * 165;

  const unprotectedPath = sim.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.tick).toFixed(1)} ${toY(t.unprotectedOriginRps).toFixed(1)}`)
    .join(' ');
  const defendedPath = sim.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.tick).toFixed(1)} ${toY(t.defendedOriginRps).toFixed(1)}`)
    .join(' ');

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME IV · DISTRIBUTED CACHING · THUNDERING HERDS &amp; MEMCACHE LEASES</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/consistent-hashing" className="text-[var(--cobalt)] hover:underline">
              Plate 12 · Consistent Hashing →
            </Link>
            <Link href="/queueing" className="text-[var(--signal)] hover:underline">
              Queueing &amp; Tail Lab →
            </Link>
            <Link href="/storage" className="text-[var(--emerald)] hover:underline">
              Storage Engines →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Distributed Caching &amp; Stampede Control
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Simulate a hot-key TTL expiration across a fleet of app servers and compare{' '}
              <strong className="text-[var(--signal)]">unprotected thundering herds</strong> against{' '}
              <strong className="text-[var(--ink)]">Singleflight coalescing</strong>,{' '}
              <strong className="text-[var(--ink)]">XFetch probabilistic early expiry</strong>, and{' '}
              <strong className="text-[var(--ink)]">Facebook Memcache Leases</strong>—plus
              cache-aside vs. write-through topologies and W-TinyLFU eviction.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Raw Spike
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--signal)]">
                {sim.peakUnprotectedRps} rps
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Defended Peak
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  sim.defendedStable ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                }`}
              >
                {sim.peakDefendedRps} rps
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Reduction
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {sim.reductionFactor}×
              </div>
            </div>
          </div>
        </header>

        {/* Controls & Stampede Oscilloscope */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 space-y-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold pb-3 border-b border-[var(--rule)]">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Stampede Defense &amp; Traffic Parameters</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STAMPEDE_DEFENSES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDefense(item.id)}
                  className={`text-left p-2.5 border font-mono text-[10px] transition-colors ${
                    defense === item.id
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  <div className="uppercase">{item.name}</div>
                </button>
              ))}
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Hot-Key Traffic</span>
                  <span className="font-semibold">{hotKeyRps.toLocaleString()} req/s</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={250}
                  value={hotKeyRps}
                  onChange={(e) => setHotKeyRps(Number(e.target.value))}
                  className="w-full accent-[#D9441E]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Origin DB Query Latency</span>
                  <span className="font-semibold">{dbQueryMs} ms</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={400}
                  step={10}
                  value={dbQueryMs}
                  onChange={(e) => setDbQueryMs(Number(e.target.value))}
                  className="w-full accent-[#1D4B8F]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">Origin DB Capacity Ceiling</span>
                  <span className="font-semibold">{dbCapacityRps} req/s</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={800}
                  step={25}
                  value={dbCapacityRps}
                  onChange={(e) => setDbCapacityRps(Number(e.target.value))}
                  className="w-full accent-[#0F6B50]"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="uppercase text-[var(--ink-muted)]">App Server Instances</span>
                  <span className="font-semibold">{appInstances} nodes</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={48}
                  value={appInstances}
                  onChange={(e) => setAppInstances(Number(e.target.value))}
                  className="w-full accent-[#1D4B8F]"
                />
              </div>
            </div>

            <div className="p-3 bg-[var(--paper)] border-l-2 border-[var(--cobalt)] text-xs text-[var(--ink-secondary)] leading-relaxed">
              {sim.verdict}
            </div>
          </div>

          <div className="lg:col-span-7 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
                <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                  <Activity className="w-3.5 h-3.5 text-[#D9441E]" />
                  ORIGIN DATABASE QPS · HOT KEY EXPIRES AT TICK 5
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[#D9441E]">— Unprotected</span>
                  <span className="text-[#34D399]">— Active Defense</span>
                  <span className="text-[#FBBF24]">-- DB Cap</span>
                </span>
              </div>

              <svg viewBox="0 0 660 235" className="w-full h-auto">
                {/* TTL Expiry vertical guide */}
                <line
                  x1={toX(5)}
                  y1={28}
                  x2={toX(5)}
                  y2={205}
                  stroke="#D9441E"
                  strokeDasharray="4 4"
                  opacity="0.55"
                />
                <text x={toX(5)} y={20} textAnchor="middle" fill="#D9441E" fontSize="9" fontFamily="monospace">
                  TTL = 0 (EXPIRE)
                </text>

                {/* DB Capacity Ceiling */}
                <line
                  x1={58}
                  y1={toY(dbCapacityRps)}
                  x2={632}
                  y2={toY(dbCapacityRps)}
                  stroke="#FBBF24"
                  strokeDasharray="6 4"
                  strokeWidth="1.4"
                />
                <text
                  x={628}
                  y={Math.max(36, toY(dbCapacityRps) - 6)}
                  textAnchor="end"
                  fill="#FBBF24"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  DB CAPACITY ({dbCapacityRps} RPS)
                </text>

                <line x1={58} y1={205} x2={632} y2={205} stroke="#4A4E4B" />
                <line x1={58} y1={28} x2={58} y2={205} stroke="#4A4E4B" />

                <path d={unprotectedPath} fill="none" stroke="#D9441E" strokeWidth="2.4" strokeDasharray="5 3" />
                <path d={defendedPath} fill="none" stroke="#34D399" strokeWidth="2.8" />

                <text x={345} y={224} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  TIMELINE TICKS (0–15) · STALE-SET RACE PROTECTION:{' '}
                  {sim.preventsStaleSetRace ? 'ACTIVE (64-BIT LEASE TOKEN)' : 'NONE'}
                </text>
              </svg>
            </div>

            <div className="mt-4 pt-3 border-t border-[#262B29] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <span className={sim.defendedStable ? 'text-[#34D399] inline-flex items-center gap-1.5' : 'text-[#D9441E] inline-flex items-center gap-1.5'}>
                {sim.defendedStable ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {sim.defendedStable ? 'ORIGIN STABLE UNDER HOT-KEY EXPIRY' : 'ORIGIN OVERLOADED (MELTDOWN)'}
              </span>
              <span className="text-[#9A968E] text-[10px]">
                {STAMPEDE_DEFENSES.find((d) => d.id === defense)?.paperOrOrigin}
              </span>
            </div>
          </div>
        </section>

        {/* Cache Topologies & Eviction Policies */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
              Read / Write Consistency Topologies
            </div>
            <h2 className="font-editorial text-2xl mb-4">Cache-Aside vs. Write-Through vs. Write-Behind</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {CACHE_PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPattern(p.id)}
                  className={`p-2.5 border text-left font-mono text-[10px] uppercase transition-colors ${
                    selectedPattern === p.id
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                  }`}
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>

            <div className="p-4 bg-[var(--paper)] border border-[var(--rule)] space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-editorial text-xl text-[var(--ink)]">{activePattern.name}</span>
                <div className="flex gap-2 font-mono text-[10px] uppercase">
                  <span className="px-2 py-0.5 bg-[var(--ink)] text-[var(--paper)]">
                    Write Lat: {activePattern.writeLatency}
                  </span>
                  <span className="px-2 py-0.5 bg-[var(--cobalt)] text-[var(--paper)]">
                    Stale Risk: {activePattern.staleWindow}
                  </span>
                </div>
              </div>
              <p className="text-[var(--ink-secondary)]">
                <strong className="text-[var(--ink)]">Read Path:</strong> {activePattern.readPath}
              </p>
              <p className="text-[var(--ink-secondary)]">
                <strong className="text-[var(--ink)]">Write Path:</strong> {activePattern.writePath}
              </p>
              <p className="text-[var(--ink-secondary)]">
                <strong className="text-[var(--signal)]">Failure / Race Mode:</strong>{' '}
                {activePattern.consistencyRisk}
              </p>
              <div className="pt-2 border-t border-[var(--rule)] flex flex-wrap gap-2">
                {activePattern.conceptIds.map((cid) => {
                  const concept = CONCEPTS_CATALOG.find((c) => c.id === cid);
                  if (!concept) return null;
                  return (
                    <Link
                      key={cid}
                      href={concept.path}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--ink)] font-mono text-[10px] uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                    >
                      {concept.name} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
              <Cpu className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span>Admission &amp; Eviction Policy Comparison</span>
            </div>
            <h2 className="font-editorial text-2xl mb-4">Scan Resistance (LRU vs. W-TinyLFU)</h2>
            <div className="space-y-4">
              {EVICTION_POLICIES.map((pol) => (
                <div key={pol.id} className="p-3.5 bg-[var(--paper)] border border-[var(--rule)] space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-semibold text-[var(--ink)]">{pol.name}</span>
                    <span className="font-semibold text-[var(--emerald)]">
                      {pol.hitRateUnderScanPct}% Hit
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--paper-elevated)] border border-[var(--rule)]">
                    <div
                      className={pol.id === 'w-tinylfu' ? 'h-full bg-[#0F6B50]' : pol.id === 'lfu' ? 'h-full bg-[#1D4B8F]' : 'h-full bg-[#D9441E]'}
                      style={{ width: `${pol.hitRateUnderScanPct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[var(--ink-secondary)]">
                    <strong className="text-[var(--ink)]">Structure:</strong> {pol.structure}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    <strong>Trade-off:</strong> {pol.weakness}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
