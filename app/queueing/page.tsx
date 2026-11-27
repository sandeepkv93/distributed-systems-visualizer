'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Gauge,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import {
  QUEUEING_PRESETS,
  QueueingPresetId,
  buildUtilizationCurve,
  computeFanOutTail,
  computeMMcMetrics,
  simulateRetryStorm,
} from '@/lib/queueing-math';

export default function QueueingLabPage() {
  const [activePreset, setActivePreset] = useState<QueueingPresetId | 'custom'>('healthy-pool');
  const [arrivalRateRps, setArrivalRateRps] = useState(240);
  const [serviceTimeMs, setServiceTimeMs] = useState(10);
  const [servers, setServers] = useState(4);
  const [fanOut, setFanOut] = useState(10);
  const [singleTailPct, setSingleTailPct] = useState(1);
  const [retryMultiplier, setRetryMultiplier] = useState(2);

  const applyPreset = (id: QueueingPresetId) => {
    const preset = QUEUEING_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setArrivalRateRps(preset.arrivalRateRps);
    setServiceTimeMs(preset.serviceTimeMs);
    setServers(preset.servers);
    setFanOut(preset.fanOut);
    setSingleTailPct(preset.singleTailPct);
    setRetryMultiplier(preset.retryMultiplier);
  };

  const mmc = useMemo(
    () => computeMMcMetrics({ arrivalRateRps, serviceTimeMs, servers }),
    [arrivalRateRps, serviceTimeMs, servers]
  );

  const curve = useMemo(
    () => buildUtilizationCurve(serviceTimeMs, servers),
    [serviceTimeMs, servers]
  );

  const fanOutResult = useMemo(
    () => computeFanOutTail(fanOut, singleTailPct),
    [fanOut, singleTailPct]
  );

  const baselineLoadPct = Math.min(95, Math.max(25, Math.round(mmc.utilization * 100)));
  const retryStorm = useMemo(
    () => simulateRetryStorm(baselineLoadPct, retryMultiplier),
    [baselineLoadPct, retryMultiplier]
  );

  // SVG scaling helpers for M/M/c curve
  const maxCurveMs = Math.max(
    serviceTimeMs * 12,
    ...curve.map((pt) => Math.min(serviceTimeMs * 25, pt.singleServerResponseMs))
  );
  const mmcX = (rho: number) => 62 + rho * 540;
  const mmcY = (ms: number) => 210 - (Math.min(ms, maxCurveMs) / maxCurveMs) * 172;

  const singlePath = curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mmcX(pt.rho).toFixed(1)} ${mmcY(pt.singleServerResponseMs).toFixed(1)}`)
    .join(' ');
  const multiPath = curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mmcX(pt.rho).toFixed(1)} ${mmcY(pt.meanResponseMs).toFixed(1)}`)
    .join(' ');

  // SVG scaling for Fan-Out curve
  const fanX = (k: number) => 56 + ((k - 1) / 99) * 530;
  const fanY = (pct: number) => 195 - (Math.min(100, pct) / 100) * 155;
  const unhedgedFanPath = fanOutResult.curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${fanX(pt.k).toFixed(1)} ${fanY(pt.unhedgedPct).toFixed(1)}`)
    .join(' ');
  const hedgedFanPath = fanOutResult.curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${fanX(pt.k).toFixed(1)} ${fanY(pt.hedgedPct).toFixed(1)}`)
    .join(' ');

  // SVG scaling for Retry Storm
  const maxQueue = Math.max(120, retryStorm.peakNaiveQueue);
  const tickX = (t: number) => 56 + (t / 15) * 530;
  const queueY = (q: number) => 195 - (Math.min(maxQueue, q) / maxQueue) * 155;
  const naiveStormPath = retryStorm.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${tickX(t.tick).toFixed(1)} ${queueY(t.naiveQueueDepth).toFixed(1)}`)
    .join(' ');
  const jitterStormPath = retryStorm.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${tickX(t.tick).toFixed(1)} ${queueY(t.jitteredQueueDepth).toFixed(1)}`)
    .join(' ');

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME IV · QUEUEING THEORY · LITTLE&apos;S LAW &amp; TAIL AMPLIFICATION LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/load-balancing" className="text-[var(--signal)] hover:underline">
              Plate 14 · Load Balancing →
            </Link>
            <Link href="/latency" className="text-[var(--cobalt)] hover:underline">
              Protocol Latency →
            </Link>
            <Link href="/runbooks" className="text-[var(--emerald)] hover:underline">
              SRE Runbooks →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Queueing Theory &amp; Tail-Latency Amplification
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Explore why distributed services collapse non-linearly past 80% utilization:{' '}
              <strong className="text-[var(--ink)]">M/M/c Erlang-C wait cliffs</strong>,{' '}
              <strong className="text-[var(--ink)]">Little&apos;s Law (L = λW)</strong>,{' '}
              <strong className="text-[var(--ink)]">microservice fan-out tail amplification</strong>{' '}
              (and hedged backup requests), plus{' '}
              <strong className="text-[var(--ink)]">metastable retry storms</strong>.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Utilization ρ
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  !mmc.stable || mmc.utilization >= 0.85
                    ? 'text-[var(--signal)]'
                    : 'text-[var(--emerald)]'
                }`}
              >
                {(mmc.utilization * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Little L = λW
              </div>
              <div className="font-mono text-base font-semibold mt-1 text-[var(--cobalt)]">
                {mmc.stable ? mmc.littleConcurrency.toFixed(1) : '∞'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Fan-Out Tail
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  fanOutResult.unhedgedTailProbPct > 25
                    ? 'text-[var(--signal)]'
                    : 'text-[var(--ink)]'
                }`}
              >
                {fanOutResult.unhedgedTailProbPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </header>

        {/* Presets & Sliders */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Service Pool &amp; Fan-Out Parameters</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              {QUEUEING_PRESETS.map((p) => (
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
                <span className="uppercase text-[var(--ink-muted)]">Arrival Rate (λ)</span>
                <span className="font-semibold">{arrivalRateRps} req/s</span>
              </div>
              <input
                type="range"
                aria-label="Arrival Rate (λ req/s)"
                min={20}
                max={500}
                step={5}
                value={arrivalRateRps}
                onChange={(e) => {
                  setActivePreset('custom');
                  setArrivalRateRps(Number(e.target.value));
                }}
                className="w-full accent-[#D9441E]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Mean Service Time (1/μ)</span>
                <span className="font-semibold">{serviceTimeMs} ms</span>
              </div>
              <input
                type="range"
                aria-label="Mean Service Time (ms)"
                min={2}
                max={40}
                value={serviceTimeMs}
                onChange={(e) => {
                  setActivePreset('custom');
                  setServiceTimeMs(Number(e.target.value));
                }}
                className="w-full accent-[#1D4B8F]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Worker Servers (c)</span>
                <span className="font-semibold">
                  {servers} workers (cap {Math.round(mmc.totalCapacityRps)} rps)
                </span>
              </div>
              <input
                type="range"
                aria-label="Worker Servers (c)"
                min={1}
                max={8}
                value={servers}
                onChange={(e) => {
                  setActivePreset('custom');
                  setServers(Number(e.target.value));
                }}
                className="w-full accent-[#0F6B50]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Downstream Fan-Out (k)</span>
                <span className="font-semibold">{fanOut} leaf RPCs</span>
              </div>
              <input
                type="range"
                aria-label="Downstream Fan-Out (leaf RPCs)"
                min={1}
                max={100}
                value={fanOut}
                onChange={(e) => {
                  setActivePreset('custom');
                  setFanOut(Number(e.target.value));
                }}
                className="w-full accent-[#D9441E]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Leaf Slow-Tail Rate (p)</span>
                <span className="font-semibold">{singleTailPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                aria-label="Leaf Slow-Tail Rate (%)"
                min={0.5}
                max={5}
                step={0.5}
                value={singleTailPct}
                onChange={(e) => {
                  setActivePreset('custom');
                  setSingleTailPct(Number(e.target.value));
                }}
                className="w-full accent-[#1D4B8F]"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Client Retry Multiplier</span>
                <span className="font-semibold">{retryMultiplier}× retries</span>
              </div>
              <input
                type="range"
                aria-label="Client Retry Multiplier"
                min={1}
                max={4}
                value={retryMultiplier}
                onChange={(e) => {
                  setActivePreset('custom');
                  setRetryMultiplier(Number(e.target.value));
                }}
                className="w-full accent-[#D9441E]"
              />
            </div>
          </div>
        </section>

        {/* Chart 1: M/M/c Hockey-Stick + Little's Law Telemetry */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
              <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                <Gauge className="w-3.5 h-3.5 text-[#D9441E]" />
                01 · M/M/1 vs M/M/{servers} Response-Time Hockey Stick
              </span>
              <span className="flex items-center gap-4">
                <span className="text-[#D9441E]">— M/M/1 (1 worker)</span>
                <span className="text-[#34D399]">— M/M/{servers} (pooled)</span>
              </span>
            </div>

            <svg viewBox="0 0 640 245" className="w-full h-auto">
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 0.9, 1.0].map((r) => (
                <g key={r}>
                  <line
                    x1={mmcX(r)}
                    y1={36}
                    x2={mmcX(r)}
                    y2={210}
                    stroke={r === 0.9 ? '#D9441E' : '#262B29'}
                    strokeDasharray={r === 0.9 ? '4 4' : undefined}
                    strokeWidth="1"
                  />
                  <text
                    x={mmcX(r)}
                    y={226}
                    textAnchor="middle"
                    fill="#9A968E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {Math.round(r * 100)}%
                  </text>
                </g>
              ))}
              <line x1={62} y1={210} x2={608} y2={210} stroke="#4A4E4B" strokeWidth="1" />
              <line x1={62} y1={36} x2={62} y2={210} stroke="#4A4E4B" strokeWidth="1" />
              <text x={335} y={240} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                UTILIZATION ρ = λ / (c·μ)
              </text>
              <text x={18} y={125} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace" transform="rotate(-90 18 125)">
                MEAN W (ms)
              </text>

              <path d={singlePath} fill="none" stroke="#D9441E" strokeWidth="2" strokeDasharray="5 3" />
              <path d={multiPath} fill="none" stroke="#34D399" strokeWidth="2.5" />

              {mmc.stable && (
                <>
                  <line
                    x1={mmcX(mmc.utilization)}
                    y1={36}
                    x2={mmcX(mmc.utilization)}
                    y2={210}
                    stroke="#FBBF24"
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={mmcX(mmc.utilization)}
                    cy={mmcY(mmc.meanResponseMs)}
                    r="5.5"
                    fill="#FBBF24"
                    stroke="#111413"
                    strokeWidth="1.5"
                  />
                  <text
                    x={Math.min(520, mmcX(mmc.utilization) + 10)}
                    y={Math.max(50, mmcY(mmc.meanResponseMs) - 8)}
                    fill="#FBBF24"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    W = {mmc.meanResponseMs.toFixed(1)}ms
                  </text>
                </>
              )}
              {!mmc.stable && (
                <text x={335} y={80} textAnchor="middle" fill="#D9441E" fontSize="12" fontFamily="monospace" fontWeight="bold">
                  SATURATED (ρ ≥ 100%) — UNBOUNDED QUEUE GROWTH
                </text>
              )}
            </svg>
          </div>

          {/* Little's Law & Erlang-C Readout Panel */}
          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
                Erlang-C &amp; Little&apos;s Law Telemetry
              </div>
              <h2 className="font-editorial text-2xl mb-4">L = λ · W</h2>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">P(Queueing) Erlang-C</span>
                  <span className="font-semibold">
                    {mmc.stable ? `${(mmc.erlangC * 100).toFixed(1)}%` : '100%'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Mean Queue Wait (Wq)</span>
                  <span className="font-semibold text-[var(--signal)]">
                    {mmc.stable ? `${mmc.meanQueueWaitMs.toFixed(2)} ms` : '∞'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Mean Response (W)</span>
                  <span className="font-semibold text-[var(--emerald)]">
                    {mmc.stable ? `${mmc.meanResponseMs.toFixed(2)} ms` : '∞'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Approx. p99 Response</span>
                  <span className="font-semibold">
                    {mmc.stable ? `${mmc.p99ResponseMs.toFixed(1)} ms` : '∞'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">In-Flight Concurrency (L)</span>
                  <span className="font-semibold text-[var(--cobalt)]">
                    {mmc.stable ? `${mmc.littleConcurrency.toFixed(2)} reqs` : '∞'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[var(--paper)] border border-[var(--rule)] text-xs text-[var(--ink-secondary)] leading-relaxed">
              Pooling {servers} workers at {(mmc.utilization * 100).toFixed(0)}% utilization absorbs
              burst variance far better than {servers} isolated single-server queues—but past 85%,
              even pooled queues explode vertically.
            </div>
          </div>
        </section>

        {/* Charts 2 & 3: Fan-Out Tail Amplification + Metastable Retry Storm */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fan-out Tail Amplification */}
          <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="bg-[#111413] p-5 text-[#F4F0E8]">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
                <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                  <Activity className="w-3.5 h-3.5 text-[#60A5FA]" />
                  02 · Fan-Out Tail Amplification (1 − (1−p)^k)
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[#D9441E]">— Unhedged</span>
                  <span className="text-[#60A5FA]">— Hedged (+5% load)</span>
                </span>
              </div>
              <svg viewBox="0 0 620 220" className="w-full h-auto">
                <line x1={56} y1={195} x2={590} y2={195} stroke="#4A4E4B" strokeWidth="1" />
                <line x1={56} y1={35} x2={56} y2={195} stroke="#4A4E4B" strokeWidth="1" />
                {[0, 25, 50, 75, 100].map((pct) => (
                  <g key={pct}>
                    <line x1={56} y1={fanY(pct)} x2={590} y2={fanY(pct)} stroke="#222624" />
                    <text x={48} y={fanY(pct) + 3} textAnchor="end" fill="#9A968E" fontSize="9" fontFamily="monospace">
                      {pct}%
                    </text>
                  </g>
                ))}
                <path d={unhedgedFanPath} fill="none" stroke="#D9441E" strokeWidth="2.5" />
                <path d={hedgedFanPath} fill="none" stroke="#60A5FA" strokeWidth="2.5" />
                <circle
                  cx={fanX(fanOut)}
                  cy={fanY(fanOutResult.unhedgedTailProbPct)}
                  r="5"
                  fill="#D9441E"
                  stroke="#F4F0E8"
                />
                <circle
                  cx={fanX(fanOut)}
                  cy={fanY(fanOutResult.hedgedTailProbPct)}
                  r="5"
                  fill="#60A5FA"
                  stroke="#F4F0E8"
                />
                <text x={320} y={214} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  DOWNSTREAM LEAF FAN-OUT (k = {fanOut} RPCs · p = {singleTailPct}%)
                </text>
              </svg>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                  <div className="text-[9px] uppercase text-[var(--ink-muted)]">Unhedged Tail</div>
                  <div className="text-base font-semibold text-[var(--signal)]">
                    {fanOutResult.unhedgedTailProbPct.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                  <div className="text-[9px] uppercase text-[var(--ink-muted)]">Hedged Tail</div>
                  <div className="text-base font-semibold text-[var(--cobalt)]">
                    {fanOutResult.hedgedTailProbPct.toFixed(2)}%
                  </div>
                </div>
                <div className="p-2.5 bg-[var(--paper)] border border-[var(--rule)]">
                  <div className="text-[9px] uppercase text-[var(--ink-muted)]">Tail Reduction</div>
                  <div className="text-base font-semibold text-[var(--emerald)]">
                    {fanOutResult.reductionFactor.toFixed(1)}×
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                With <strong className="text-[var(--ink)]">k = {fanOut}</strong> parallel leaves
                each having a {singleTailPct}% slow tail,{' '}
                <strong className="text-[var(--signal)]">
                  {fanOutResult.unhedgedTailProbPct.toFixed(1)}%
                </strong>{' '}
                of parent requests wait on at least one straggler. Firing a hedged backup request
                after p95 latency cuts tail probability by{' '}
                <strong className="text-[var(--emerald)]">
                  {fanOutResult.reductionFactor.toFixed(1)}×
                </strong>{' '}
                for only ~{fanOutResult.expectedHedgeOverheadPct}% extra load.
              </p>
            </div>
          </div>

          {/* Retry Storm & Metastable Failure */}
          <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="bg-[#111413] p-5 text-[#F4F0E8]">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
                <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />
                  03 · Metastable Retry Storm (Brownout Ticks 3–6)
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[#D9441E]">— Naive Retries</span>
                  <span className="text-[#34D399]">— Jitter + Budget</span>
                </span>
              </div>
              <svg viewBox="0 0 620 220" className="w-full h-auto">
                {/* Brownout shaded band ticks 3..6 */}
                <rect
                  x={tickX(3)}
                  y={36}
                  width={tickX(6) - tickX(3)}
                  height={159}
                  fill="#D9441E"
                  fillOpacity="0.14"
                />
                <text
                  x={(tickX(3) + tickX(6)) / 2}
                  y={50}
                  textAnchor="middle"
                  fill="#FBBF24"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  BROWNOUT (-45% CAP)
                </text>
                <line x1={56} y1={195} x2={590} y2={195} stroke="#4A4E4B" strokeWidth="1" />
                <line x1={56} y1={35} x2={56} y2={195} stroke="#4A4E4B" strokeWidth="1" />
                <path d={naiveStormPath} fill="none" stroke="#D9441E" strokeWidth="2.5" />
                <path d={jitterStormPath} fill="none" stroke="#34D399" strokeWidth="2.5" />
                <text x={320} y={214} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                  TIME TICKS (0–15) · BASELINE LOAD {baselineLoadPct}% · {retryMultiplier}× RETRIES
                </text>
              </svg>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    retryStorm.naiveMetastableCollapsed
                      ? 'text-[var(--signal)]'
                      : 'text-[var(--ink-secondary)]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Naive Queue Peak: {retryStorm.peakNaiveQueue}{' '}
                  {retryStorm.naiveMetastableCollapsed ? '(METASTABLE COLLAPSE)' : '(Recovered)'}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--emerald)]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Jittered Peak: {retryStorm.peakJitteredQueue} (Stable)
                </span>
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Even after the transient brownout ends at tick 7, naive synchronized retries keep
                offered load above 100% capacity—trapping the cluster in a{' '}
                <strong className="text-[var(--ink)]">metastable failure state</strong>. Combining
                exponential backoff, full jitter, a 12% retry budget, and bounded load shedding
                restores steady state immediately.
              </p>
              <div className="pt-2 border-t border-[var(--rule)] flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider">
                <Link
                  href="/load-balancing"
                  className="inline-flex items-center gap-1 text-[var(--signal)] hover:underline"
                >
                  Simulate Backpressure <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-1 text-[var(--cobalt)] hover:underline"
                >
                  Inspect Real Outages <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
