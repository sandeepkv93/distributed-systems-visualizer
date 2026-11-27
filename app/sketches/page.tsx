'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Binary,
  CheckCircle2,
  Cpu,
  Grid3X3,
  Plus,
  RotateCcw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  bloomInsert,
  bloomQuery,
  cmsIncrement,
  cmsQuery,
  computeBloomTheoreticalFpr,
  createBloomFilter,
  createCountMinSketch,
  evaluateHyperLogLog,
} from '@/lib/sketches-lab';

const INITIAL_BLOOM_KEYS = ['raft:term-4', 'key:alpha', 'sstable:09'];

export default function SketchesLabPage() {
  // 1. Bloom Filter State
  const [hashK, setHashK] = useState(3);
  const [bloom, setBloom] = useState(() =>
    INITIAL_BLOOM_KEYS.reduce((st, k) => bloomInsert(st, k), createBloomFilter(32, 3))
  );
  const [bloomInput, setBloomInput] = useState('key:beta');
  const [bloomProbeKey, setBloomProbeKey] = useState('key:alpha');

  const rebuildBloom = (nextK: number) => {
    setHashK(nextK);
    setBloom((prev) =>
      prev.insertedKeys.reduce((st, k) => bloomInsert(st, k), createBloomFilter(32, nextK))
    );
  };

  const bloomRes = useMemo(() => bloomQuery(bloom, bloomProbeKey), [bloom, bloomProbeKey]);
  const setBitsCount = bloom.bits.filter(Boolean).length;
  const theoreticalFpr = computeBloomTheoreticalFpr(
    bloom.sizeM,
    bloom.hashCountK,
    bloom.insertedKeys.length
  );

  // 2. Count-Min Sketch State
  const [cms, setCms] = useState(() => {
    let s = createCountMinSketch(4, 10);
    s = cmsIncrement(s, 'hot:sku-1', 12);
    s = cmsIncrement(s, 'user:404', 4);
    s = cmsIncrement(s, 'api:login', 7);
    return s;
  });
  const [cmsQueryKey, setCmsQueryKey] = useState('hot:sku-1');
  const cmsRes = useMemo(() => cmsQuery(cms, cmsQueryKey), [cms, cmsQueryKey]);

  // 3. HyperLogLog State (log10 distinct items: 4 => 10^4 .. 9 => 10^9)
  const [logDistinct, setLogDistinct] = useState(8); // 100M uniques
  const [hllPrecision, setHllPrecision] = useState(14); // Redis 12KB default
  const distinctItems = Math.round(Math.pow(10, logDistinct));
  const hll = useMemo(
    () => evaluateHyperLogLog(distinctItems, hllPrecision),
    [distinctItems, hllPrecision]
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME III · SUB-LINEAR PROBABILISTIC DATA STRUCTURES · SKETCHES LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/storage" className="text-[var(--emerald)] hover:underline">
              LSM Bloom Filters →
            </Link>
            <Link href="/caching" className="text-[var(--cobalt)] hover:underline">
              W-TinyLFU Sketch →
            </Link>
            <Link href="/merkle-anti-entropy" className="text-[var(--signal)] hover:underline">
              Plate 08 · Merkle Trees →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Bloom Filters, Count-Min Sketch &amp; HyperLogLog
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              At billions of keys, exact sets and hash tables run out of RAM. Probe live{' '}
              <strong className="text-[var(--ink)]">Bloom Filter bit arrays</strong> (zero false
              negatives), trace{' '}
              <strong className="text-[var(--ink)]">Count-Min Sketch heavy-hitter matrices</strong>{' '}
              (never underestimates), and compress 100M distinct counts into{' '}
              <strong className="text-[var(--emerald)]">12 KB with HyperLogLog</strong>.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Bloom FPR
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {theoreticalFpr}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                CMS Events
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--ink)]">
                {cms.totalEvents}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                HLL RAM
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--emerald)]">
                {hll.hllMemoryKb} KB
              </div>
            </div>
          </div>
        </header>

        {/* Section 1: Interactive Bloom Filter */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2">
              <Binary className="w-4 h-4 text-[var(--cobalt)]" />
              <h2 className="font-editorial text-2xl">01 · Interactive 32-Bit Bloom Filter</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
              <span className="uppercase text-[var(--ink-muted)]">Hash Functions (k):</span>
              {[1, 2, 3, 4, 5].map((k) => (
                <button
                  key={k}
                  onClick={() => rebuildBloom(k)}
                  className={`w-7 h-7 border transition-colors ${
                    hashK === k
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {k}
                </button>
              ))}
              <button
                onClick={() => setBloom(createBloomFilter(32, hashK))}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper)] uppercase hover:border-[var(--ink)]"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* 32-bit Register Array */}
          <div className="bg-[#111413] p-4 mb-4">
            <div className="flex flex-wrap justify-between font-mono text-[10px] text-[#9A968E] uppercase mb-3">
              <span>
                32-BIT ARRAY · {setBitsCount}/32 BITS SET ({Math.round((setBitsCount / 32) * 100)}%
                SATURATION)
              </span>
              <span>
                PROBE &ldquo;{bloomRes.key}&rdquo; → BITS [{bloomRes.indices.join(', ')}]
              </span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 font-mono text-[10px]">
              {bloom.bits.map((bit, idx) => {
                const probed = bloomRes.indices.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`p-1.5 text-center border transition-colors ${
                      probed
                        ? bit
                          ? 'border-[#FBBF24] bg-[#0F6B50] text-[#F4F0E8] font-bold'
                          : 'border-[#D9441E] bg-[#D9441E]/30 text-[#F4F0E8] font-bold'
                        : bit
                        ? 'border-[#34D399]/60 bg-[#172821] text-[#34D399]'
                        : 'border-[#262B29] bg-[#181C1B] text-[#6B726D]'
                    }`}
                  >
                    <div className="text-[8px] opacity-70">{idx}</div>
                    <div>{bit ? '1' : '0'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 flex gap-2">
              <input
                type="text"
                value={bloomInput}
                onChange={(e) => setBloomInput(e.target.value)}
                placeholder="Key to insert..."
                className="flex-1 px-3 py-1.5 border border-[var(--rule)] bg-[var(--paper)] font-mono text-xs"
              />
              <button
                onClick={() => {
                  setBloom((b) => bloomInsert(b, bloomInput));
                  setBloomProbeKey(bloomInput);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--ink)] text-[var(--paper)] font-mono text-[10px] uppercase font-semibold hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> Insert
              </button>
            </div>

            <div className="lg:col-span-4 flex gap-2">
              <input
                type="text"
                value={bloomProbeKey}
                onChange={(e) => setBloomProbeKey(e.target.value)}
                placeholder="Key to test..."
                className="flex-1 px-3 py-1.5 border border-[var(--rule)] bg-[var(--paper)] font-mono text-xs"
              />
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[var(--cobalt)] text-[var(--cobalt)] font-mono text-[10px] uppercase">
                <Search className="w-3 h-3" /> Live Probe
              </span>
            </div>

            <div className="lg:col-span-4 font-mono text-xs">
              {bloomRes.isFalsePositive ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--signal)] font-semibold">
                  <AlertTriangle className="w-4 h-4" /> FALSE POSITIVE! (Hash collision on unseen key)
                </span>
              ) : bloomRes.probablyPresent ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--emerald)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> PROBABLY PRESENT (Inserted true hit)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[var(--cobalt)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> DEFINITELY ABSENT (Skips SSTable disk I/O!)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2 & 3: Count-Min Sketch + HyperLogLog */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Count-Min Sketch */}
          <div className="lg:col-span-6 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--rule)]">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-[var(--signal)]" />
                  <h2 className="font-editorial text-2xl">02 · Count-Min Sketch (4×10)</h2>
                </div>
                <button
                  onClick={() => setCms(createCountMinSketch(4, 10))}
                  className="font-mono text-[10px] uppercase px-2 py-1 border border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)]"
                >
                  Reset
                </button>
              </div>

              {/* Quick increment buttons */}
              <div className="flex flex-wrap gap-2 mb-4 font-mono text-[10px]">
                {['hot:sku-1', 'api:login', 'user:404', 'bot:scan'].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setCms((s) => cmsIncrement(s, k, 3));
                      setCmsQueryKey(k);
                    }}
                    className={`px-2.5 py-1 border uppercase transition-colors ${
                      cmsQueryKey === k
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--ink)]'
                    }`}
                  >
                    +3 {k}
                  </button>
                ))}
              </div>

              {/* 4x10 Matrix */}
              <div className="bg-[#111413] p-3.5 space-y-1.5 font-mono text-[10px]">
                {cms.matrix.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-11 gap-1 items-center">
                    <span className="text-[#9A968E]">h{rIdx + 1}</span>
                    {row.map((val, cIdx) => {
                      const hit = cmsRes.positions.some((p) => p.row === rIdx && p.col === cIdx);
                      const isMin = hit && val === cmsRes.estimatedCount;
                      return (
                        <div
                          key={cIdx}
                          className={`py-1.5 text-center border ${
                            isMin
                              ? 'border-[#34D399] bg-[#0F6B50] text-[#F4F0E8] font-bold'
                              : hit
                              ? 'border-[#FBBF24] bg-[#FBBF24]/25 text-[#FBBF24] font-semibold'
                              : val > 0
                              ? 'border-[#2D3330] bg-[#1A201E] text-[#D6D2C7]'
                              : 'border-[#1E2321] bg-[#141817] text-[#555B57]'
                          }`}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-[var(--paper)] border border-[var(--rule)] font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Query Key</span>
                <span className="font-semibold">{cmsRes.key}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">min(h₁..h₄) Estimate vs True</span>
                <span className="font-semibold text-[var(--emerald)]">
                  {cmsRes.estimatedCount} vs {cmsRes.trueCount} (err +{cmsRes.overestimation})
                </span>
              </div>
              <p className="font-sans text-[11px] text-[var(--ink-secondary)] pt-1">
                Taking the minimum across 4 independent hash rows suppresses collisions—guaranteeing
                estimate ≥ true count for DDoS heavy-hitter &amp; W-TinyLFU admission filters.
              </p>
            </div>
          </div>

          {/* HyperLogLog */}
          <div className="lg:col-span-6 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[var(--rule)]">
                <Cpu className="w-4 h-4 text-[var(--emerald)]" />
                <h2 className="font-editorial text-2xl">03 · HyperLogLog Cardinality</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="uppercase text-[var(--ink-muted)]">Distinct Items (N)</span>
                    <span className="font-semibold">10^{logDistinct} ({distinctItems.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Distinct Items Power of 10"
                    min={4}
                    max={9}
                    value={logDistinct}
                    onChange={(e) => setLogDistinct(Number(e.target.value))}
                    className="w-full accent-[#D9441E]"
                  />
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="uppercase text-[var(--ink-muted)]">Precision (p bits)</span>
                    <span className="font-semibold">
                      p={hllPrecision} ({hll.registerCountM.toLocaleString()} regs)
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="HyperLogLog Precision (p bits)"
                    min={10}
                    max={16}
                    value={hllPrecision}
                    onChange={(e) => setHllPrecision(Number(e.target.value))}
                    className="w-full accent-[#0F6B50]"
                  />
                </div>
              </div>

              {/* 16-Register Harmonic Mean Bar Chart */}
              <div className="bg-[#111413] p-4 mb-4">
                <div className="font-mono text-[10px] uppercase text-[#9A968E] mb-2">
                  SAMPLE LEADING-ZERO REGISTERS ρ(w) · HARMONIC MEAN SUPPRESSES OUTLIERS
                </div>
                <svg viewBox="0 0 520 115" className="w-full h-auto">
                  {hll.sampleRegisters.map((rho, idx) => {
                    const barH = Math.max(8, (rho / 30) * 82);
                    const x = 10 + idx * 31.5;
                    return (
                      <g key={idx}>
                        <rect
                          x={x}
                          y={95 - barH}
                          width="23"
                          height={barH}
                          fill={rho > 22 ? '#FBBF24' : '#34D399'}
                          fillOpacity="0.82"
                        />
                        <text
                          x={x + 11.5}
                          y={90 - barH}
                          textAnchor="middle"
                          fill="#F4F0E8"
                          fontSize="8.5"
                          fontFamily="monospace"
                        >
                          {rho}
                        </text>
                        <text
                          x={x + 11.5}
                          y={108}
                          textAnchor="middle"
                          fill="#9A968E"
                          fontSize="7.5"
                          fontFamily="monospace"
                        >
                          R{idx}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                <div className="text-[9px] uppercase text-[var(--ink-muted)]">Exact HashSet</div>
                <div className="text-sm font-semibold text-[var(--signal)]">
                  {hll.exactHashSetMb >= 1024
                    ? `${(hll.exactHashSetMb / 1024).toFixed(2)} GB`
                    : `${hll.exactHashSetMb} MB`}
                </div>
              </div>
              <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                <div className="text-[9px] uppercase text-[var(--ink-muted)]">HLL Fixed RAM</div>
                <div className="text-sm font-semibold text-[var(--emerald)]">
                  {hll.hllMemoryKb} KB
                </div>
              </div>
              <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                <div className="text-[9px] uppercase text-[var(--ink-muted)]">Std Error σ</div>
                <div className="text-sm font-semibold text-[var(--cobalt)]">
                  ±{hll.standardErrorPct}%
                </div>
              </div>
              <div className="col-span-3 p-2.5 bg-[var(--paper)] border border-[var(--rule)] font-sans text-[11px] text-[var(--ink-secondary)]">
                Memory compression at 10^{logDistinct} uniques:{' '}
                <strong className="font-mono text-[var(--emerald)]">
                  {hll.compressionRatio.toLocaleString()}× smaller
                </strong>{' '}
                than an exact HashSet—and HLL sketches merge across shards via element-wise{' '}
                <span className="font-mono">max()</span> (a CALM join-semilattice CRDT!).
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
