'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  DEFAULT_RESILIENCE_CONFIG,
  RESILIENCE_PATTERNS,
  ResilienceConfig,
  simulateResilienceMesh,
} from '@/lib/resilience-lab';

export default function ResilienceLabPage() {
  const [config, setConfig] = useState<ResilienceConfig>(DEFAULT_RESILIENCE_CONFIG);

  const sim = useMemo(() => simulateResilienceMesh(config), [config]);

  const toX = (tick: number) => 56 + (tick / 15) * 570;
  const toY = (pct: number) => 205 - (Math.min(100, Math.max(0, pct)) / 100) * 165;

  const workerPath = sim.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.tick).toFixed(1)} ${toY(t.gatewayWorkersUsedPct).toFixed(1)}`)
    .join(' ');
  const catalogPath = sim.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.tick).toFixed(1)} ${toY(t.catalogAvailabilityPct).toFixed(1)}`)
    .join(' ');
  const aimdPath = sim.ticks
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.tick).toFixed(1)} ${toY(t.adaptiveLimit).toFixed(1)}`)
    .join(' ');

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME IV · SERVICE MESH RESILIENCE · CIRCUIT BREAKERS · BULKHEADS &amp; AIMD</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/queueing" className="text-[var(--cobalt)] hover:underline">
              Queueing &amp; Retry Storms →
            </Link>
            <Link href="/load-balancing" className="text-[var(--signal)] hover:underline">
              Plate 14 · Load Balancing →
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
              Service Mesh Resilience &amp; Fault Isolation
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Inject a severe brownout into <strong className="text-[var(--ink)]">Downstream B</strong>{' '}
              (ticks 4–10) and toggle{' '}
              <strong className="text-[var(--ink)]">3-State Circuit Breakers</strong>,{' '}
              <strong className="text-[var(--ink)]">Bulkhead Thread Isolation</strong>,{' '}
              <strong className="text-[var(--ink)]">AIMD Adaptive Concurrency</strong>, and{' '}
              <strong className="text-[var(--ink)]">Deadline Propagation</strong> to stop a single
              slow dependency from taking down healthy sibling endpoints.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                /catalog Min
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  sim.minCatalogAvailabilityPct === 100
                    ? 'text-[var(--emerald)]'
                    : 'text-[var(--signal)]'
                }`}
              >
                {sim.minCatalogAvailabilityPct}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Peak Workers
              </div>
              <div
                className={`font-mono text-base font-semibold mt-1 ${
                  sim.peakGatewayWorkersPct >= 95 ? 'text-[var(--signal)]' : 'text-[var(--cobalt)]'
                }`}
              >
                {sim.peakGatewayWorkersPct}%
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Zombie CPU
              </div>
              <div className="font-mono text-base font-semibold mt-1 text-[var(--ink)]">
                {sim.avgZombieWorkPct}%
              </div>
            </div>
          </div>
        </header>

        {/* Guardrail Toggle Panel */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Active Mesh Guardrails</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              <button
                onClick={() => setConfig(DEFAULT_RESILIENCE_CONFIG)}
                className="px-2.5 py-1 border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] uppercase"
              >
                All Guardrails On
              </button>
              <button
                onClick={() =>
                  setConfig({
                    circuitBreakerEnabled: false,
                    bulkheadEnabled: false,
                    adaptiveConcurrencyEnabled: false,
                    deadlinePropagationEnabled: false,
                    errorThresholdPct: 45,
                    bulkheadCapPct: 35,
                  })
                }
                className="px-2.5 py-1 border border-[var(--signal)] text-[var(--signal)] bg-[var(--paper)] uppercase hover:bg-[var(--signal)] hover:text-[var(--paper)] transition-colors"
              >
                Unprotected Cascade
              </button>
              <button
                onClick={() =>
                  setConfig({
                    circuitBreakerEnabled: false,
                    bulkheadEnabled: true,
                    adaptiveConcurrencyEnabled: true,
                    deadlinePropagationEnabled: true,
                    errorThresholdPct: 45,
                    bulkheadCapPct: 35,
                  })
                }
                className="px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)] uppercase hover:border-[var(--ink)]"
              >
                Bulkhead + AIMD Only
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {(
              [
                {
                  key: 'circuitBreakerEnabled',
                  label: '3-State Circuit Breaker',
                  desc: 'Fail fast when error rate ≥ threshold',
                },
                {
                  key: 'bulkheadEnabled',
                  label: 'Bulkhead Pool Cap',
                  desc: `Cap /checkout to ${config.bulkheadCapPct}% gateway workers`,
                },
                {
                  key: 'adaptiveConcurrencyEnabled',
                  label: 'AIMD Adaptive Limit',
                  desc: 'Shrink concurrency on RTT spike',
                },
                {
                  key: 'deadlinePropagationEnabled',
                  label: 'Deadline Propagation',
                  desc: 'Cancel expired downstream zombie RPCs',
                },
              ] as const
            ).map((toggle) => {
              const active = config[toggle.key];
              return (
                <button
                  key={toggle.key}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      [toggle.key]: !prev[toggle.key],
                    }))
                  }
                  className={`text-left p-3.5 border transition-colors ${
                    active
                      ? 'border-[var(--emerald)] bg-[#0F6B50]/10 text-[var(--ink)]'
                      : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase mb-1">
                    <span className="font-semibold text-[var(--ink)]">{toggle.label}</span>
                    <span
                      className={`px-1.5 py-0.5 font-semibold ${
                        active ? 'bg-[#0F6B50] text-[#F4F0E8]' : 'bg-[var(--rule)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[11px]">{toggle.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-[var(--rule)]">
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Circuit Breaker Error Trip Threshold</span>
                <span className="font-semibold">{config.errorThresholdPct}%</span>
              </div>
              <input
                type="range"
                aria-label="Circuit Breaker Error Trip Threshold (%)"
                min={20}
                max={80}
                step={5}
                value={config.errorThresholdPct}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, errorThresholdPct: Number(e.target.value) }))
                }
                className="w-full accent-[#D9441E]"
              />
            </div>
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="uppercase text-[var(--ink-muted)]">Bulkhead Max Worker Allocation</span>
                <span className="font-semibold">{config.bulkheadCapPct}% of pool</span>
              </div>
              <input
                type="range"
                aria-label="Bulkhead Max Worker Allocation (%)"
                min={20}
                max={55}
                step={5}
                value={config.bulkheadCapPct}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, bulkheadCapPct: Number(e.target.value) }))
                }
                className="w-full accent-[#1D4B8F]"
              />
            </div>
          </div>
        </section>

        {/* Main Oscilloscope + Circuit Breaker State Machine */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
              <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                <Activity className="w-3.5 h-3.5 text-[#34D399]" />
                BLAST-RADIUS OSCILLOSCOPE (DOWNSTREAM B BROWNOUT TICKS 4–10)
              </span>
              <span className="flex items-center gap-3">
                <span className="text-[#34D399]">— /catalog Avail</span>
                <span className="text-[#D9441E]">— GW Workers</span>
                <span className="text-[#60A5FA]">-- AIMD Limit</span>
              </span>
            </div>

            <svg viewBox="0 0 660 245" className="w-full h-auto">
              {/* Brownout shaded band ticks 4..10 */}
              <rect
                x={toX(4)}
                y={36}
                width={toX(10) - toX(4)}
                height={169}
                fill="#D9441E"
                fillOpacity="0.14"
              />
              <text
                x={(toX(4) + toX(10)) / 2}
                y={50}
                textAnchor="middle"
                fill="#FBBF24"
                fontSize="9"
                fontFamily="monospace"
              >
                DOWNSTREAM B 72% 5XX + 500MS SPIKE
              </text>

              <line x1={56} y1={205} x2={630} y2={205} stroke="#4A4E4B" />
              <line x1={56} y1={36} x2={56} y2={205} stroke="#4A4E4B" />
              {[0, 25, 50, 75, 100].map((pct) => (
                <g key={pct}>
                  <line x1={56} y1={toY(pct)} x2={630} y2={toY(pct)} stroke="#1D2220" />
                  <text x={48} y={toY(pct) + 3} textAnchor="end" fill="#9A968E" fontSize="9" fontFamily="monospace">
                    {pct}%
                  </text>
                </g>
              ))}

              <path d={aimdPath} fill="none" stroke="#60A5FA" strokeWidth="2" strokeDasharray="5 3" />
              <path d={workerPath} fill="none" stroke="#D9441E" strokeWidth="2.4" />
              <path d={catalogPath} fill="none" stroke="#34D399" strokeWidth="2.8" />

              {/* Breaker state timeline strip along bottom */}
              {sim.ticks.map((t) => {
                const color =
                  t.breakerState === 'OPEN'
                    ? '#D9441E'
                    : t.breakerState === 'HALF-OPEN'
                    ? '#FBBF24'
                    : '#34D399';
                return (
                  <rect
                    key={t.tick}
                    x={toX(t.tick) - 8}
                    y={214}
                    width="16"
                    height="7"
                    fill={color}
                  />
                );
              })}
              <text x={343} y={238} textAnchor="middle" fill="#9A968E" fontSize="9" fontFamily="monospace">
                BREAKER TIMELINE STRIP: GREEN = CLOSED · VERMILION = OPEN (FAIL-FAST) · AMBER = HALF-OPEN PROBE
              </text>
            </svg>
          </div>

          <div className="lg:col-span-4 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
                <Shield className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                <span>Circuit Breaker Lifecycle</span>
              </div>
              <h2 className="font-editorial text-2xl mb-3">
                {sim.blastRadiusContained ? 'Blast Radius Contained' : 'Cascading Outage'}
              </h2>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-4">
                {sim.verdict}
              </p>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Breaker Tripped OPEN</span>
                  <span className={sim.breakerTripped ? 'text-[var(--emerald)] font-semibold' : 'text-[var(--ink-muted)]'}>
                    {sim.breakerTripped ? 'YES (FAIL-FAST)' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Half-Open Canary Probe</span>
                  <span className={sim.halfOpenProbed ? 'text-[var(--cobalt)] font-semibold' : 'text-[var(--ink-muted)]'}>
                    {sim.halfOpenProbed ? 'VERIFIED' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Auto-Recovered CLOSED</span>
                  <span className="font-semibold text-[var(--emerald)]">
                    {sim.recoveredToClosed ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 p-3 border text-xs font-mono flex items-center gap-2 ${
                sim.blastRadiusContained
                  ? 'border-[var(--emerald)] bg-[#0F6B50]/10 text-[var(--emerald)]'
                  : 'border-[var(--signal)] bg-[#D9441E]/10 text-[var(--signal)]'
              }`}
            >
              {sim.blastRadiusContained ? (
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>
                {sim.blastRadiusContained
                  ? 'Healthy sibling routes unaffected (100% SLO).'
                  : 'Shared thread pool exhausted — enable Bulkhead or Breaker!'}
              </span>
            </div>
          </div>
        </section>

        {/* Pattern Reference Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {RESILIENCE_PATTERNS.map((pat) => {
            const concept = CONCEPTS_CATALOG.find((c) => c.id === pat.conceptId);
            return (
              <div
                key={pat.id}
                className="p-4 border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--cobalt)] font-semibold">
                    {pat.productionRef}
                  </div>
                  <h3 className="font-editorial text-xl leading-snug">{pat.name}</h3>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    {pat.mechanism}
                  </p>
                  <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                    <strong className="text-[var(--ink)]">Stops:</strong> {pat.failurePrevented}
                  </p>
                </div>
                {concept && (
                  <Link
                    href={concept.path}
                    className="inline-flex items-center justify-between pt-2 border-t border-[var(--rule)] font-mono text-[10px] uppercase text-[var(--signal)] hover:underline"
                  >
                    <span>Plate: {concept.name}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
