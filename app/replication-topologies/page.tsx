'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Sliders,
} from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  GEO_REGIONS,
  GeoRegionId,
  ReplicationTopologyId,
  TOPOLOGY_SPECS,
  WAN_RTT_MS,
  evaluateGeoTopology,
} from '@/lib/replication-topologies';

export default function ReplicationTopologiesPage() {
  const [topology, setTopology] = useState<ReplicationTopologyId>('single-leader-sync');
  const [clientRegion, setClientRegion] = useState<GeoRegionId>('ap-south');
  const [failedRegion, setFailedRegion] = useState<GeoRegionId | 'none'>('none');
  const [sloppyQuorum, setSloppyQuorum] = useState(false);

  const result = useMemo(
    () =>
      evaluateGeoTopology({
        topology,
        clientRegion,
        failedRegion,
        sloppyQuorum,
      }),
    [topology, clientRegion, failedRegion, sloppyQuorum]
  );

  const activeSpec =
    TOPOLOGY_SPECS.find((s) => s.id === topology) ?? TOPOLOGY_SPECS[0];

  const allComparisons = useMemo(
    () =>
      TOPOLOGY_SPECS.map((spec) => ({
        spec,
        eval: evaluateGeoTopology({
          topology: spec.id,
          clientRegion,
          failedRegion,
          sloppyQuorum,
        }),
      })),
    [clientRegion, failedRegion, sloppyQuorum]
  );

  const linkPairs: Array<[GeoRegionId, GeoRegionId]> = [
    ['us-east', 'eu-west'],
    ['eu-west', 'ap-south'],
    ['us-east', 'ap-south'],
  ];

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME III · GEO-DISTRIBUTED REPLICATION TOPOLOGIES · 3-CONTINENT WAN LAB</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/quorum-replication" className="text-[var(--cobalt)] hover:underline">
              Plate 09 · Quorum Replication →
            </Link>
            <Link href="/raft" className="text-[var(--signal)] hover:underline">
              Plate 20 · Raft Consensus →
            </Link>
            <Link href="/latency" className="text-[var(--emerald)] hover:underline">
              Protocol Latency →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              Geo-Distributed Replication Topologies
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Compare <strong className="text-[var(--ink)]">Single-Leader (Async vs. Sync)</strong>,{' '}
              <strong className="text-[var(--ink)]">Multi-Leader Active-Active</strong>, and{' '}
              <strong className="text-[var(--ink)]">Leaderless Dynamo Quorums</strong> across
              Virginia, Dublin, and Singapore. Move the client region and inject a full-region
              outage to inspect exact WAN RTT, RPO/RTO, and conflict exposure.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)]">
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Write RTT
              </div>
              <div
                className={`font-mono text-sm font-semibold mt-1 ${
                  result.writeLatencyMs === null
                    ? 'text-[var(--signal)]'
                    : result.writeLatencyMs > 120
                    ? 'text-[var(--signal)]'
                    : 'text-[var(--emerald)]'
                }`}
              >
                {result.writeLatencyMs !== null ? `${result.writeLatencyMs} ms` : 'STALLED'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Read RTT
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-[var(--cobalt)]">
                {result.readLatencyMs !== null ? `${result.readLatencyMs} ms` : 'STALLED'}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                Conflicts
              </div>
              <div
                className={`font-mono text-xs font-semibold mt-1 ${
                  result.conflictRisk === 'None' ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                }`}
              >
                {result.conflictRisk === 'None' ? 'NONE' : 'RISK'}
              </div>
            </div>
          </div>
        </header>

        {/* Controls */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span>Topology, Client Origin &amp; Regional Outage Injection</span>
            </div>
            {topology === 'leaderless-quorum' && (
              <button
                onClick={() => setSloppyQuorum((v) => !v)}
                className={`px-3 py-1 border font-mono text-[10px] uppercase font-semibold ${
                  sloppyQuorum
                    ? 'border-[var(--signal)] bg-[var(--signal)] text-[var(--paper)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-secondary)]'
                }`}
              >
                Sloppy Quorum / Hinted Handoff: {sloppyQuorum ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            {TOPOLOGY_SPECS.map((spec) => (
              <button
                key={spec.id}
                onClick={() => setTopology(spec.id)}
                className={`text-left p-3.5 border transition-colors ${
                  topology === spec.id
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] text-[var(--ink)]'
                }`}
              >
                <div className="font-mono text-[10px] uppercase text-[#FBBF24] mb-1">
                  {spec.shortName}
                </div>
                <div className="font-editorial text-base leading-snug mb-1">{spec.name}</div>
                <div
                  className={`font-mono text-[9px] ${
                    topology === spec.id ? 'text-[#F4F0E8]/70' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {spec.examples}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--rule)]">
            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mb-1.5">
                Client Request Origin Region
              </div>
              <div className="grid grid-cols-3 border border-[var(--rule)] divide-x divide-[var(--rule)]">
                {GEO_REGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setClientRegion(r.id)}
                    className={`py-2 font-mono text-[10px] uppercase transition-colors ${
                      clientRegion === r.id
                        ? 'bg-[var(--cobalt)] text-[var(--paper)] font-semibold'
                        : 'bg-[var(--paper)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {r.label} ({r.city})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mb-1.5">
                Simulate Full-Region Outage
              </div>
              <div className="grid grid-cols-4 border border-[var(--rule)] divide-x divide-[var(--rule)]">
                {(['none', 'us-east', 'eu-west', 'ap-south'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFailedRegion(r)}
                    className={`py-2 font-mono text-[10px] uppercase transition-colors ${
                      failedRegion === r
                        ? r === 'none'
                          ? 'bg-[var(--emerald)] text-[var(--paper)] font-semibold'
                          : 'bg-[var(--signal)] text-[var(--paper)] font-semibold'
                        : 'bg-[var(--paper)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {r === 'none' ? 'All Up' : `Fail ${r.split('-')[0]}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WAN Triangle Oscilloscope + Active Details */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 border border-[var(--ink)] bg-[#111413] p-5 text-[#F4F0E8]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A968E] mb-3">
              <span className="flex items-center gap-1.5 text-[#F4F0E8]">
                <Globe className="w-3.5 h-3.5 text-[#60A5FA]" />
                3-CONTINENT WAN REPLICATION MESH · {activeSpec.shortName.toUpperCase()}
              </span>
              <span>CLIENT IN {clientRegion.toUpperCase()}</span>
            </div>

            <svg viewBox="0 0 690 250" className="w-full h-auto">
              {/* Inter-region fiber links */}
              {linkPairs.map(([a, b]) => {
                const regA = GEO_REGIONS.find((r) => r.id === a)!;
                const regB = GEO_REGIONS.find((r) => r.id === b)!;
                const rtt = WAN_RTT_MS[a][b];
                const broken = failedRegion === a || failedRegion === b;
                const midX = (regA.x + regB.x) / 2;
                const midY = (regA.y + regB.y) / 2;
                const isSyncLink =
                  !broken &&
                  (topology === 'single-leader-sync' || topology === 'leaderless-quorum');
                return (
                  <g key={`${a}-${b}`}>
                    <line
                      x1={regA.x}
                      y1={regA.y}
                      x2={regB.x}
                      y2={regB.y}
                      stroke={broken ? '#D9441E' : isSyncLink ? '#34D399' : '#60A5FA'}
                      strokeWidth={broken ? '1.4' : isSyncLink ? '2.4' : '1.8'}
                      strokeDasharray={broken ? '4 5' : isSyncLink ? undefined : '6 4'}
                      opacity={broken ? 0.45 : 0.85}
                    />
                    <rect x={midX - 28} y={midY - 11} width="56" height="20" fill="#111413" stroke={broken ? '#D9441E' : '#2D3330'} />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill={broken ? '#D9441E' : '#F4F0E8'}
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {broken ? 'SEVERED' : `${rtt}ms`}
                    </text>
                  </g>
                );
              })}

              {/* 3 Region Nodes */}
              {GEO_REGIONS.map((reg) => {
                const isDown = failedRegion === reg.id;
                const isLeader = result.leaderRegions.includes(reg.id);
                const isClient = clientRegion === reg.id;
                const stroke = isDown
                  ? '#D9441E'
                  : isLeader
                  ? '#FBBF24'
                  : topology === 'leaderless-quorum'
                  ? '#34D399'
                  : '#60A5FA';

                return (
                  <g key={reg.id}>
                    {isClient && (
                      <circle
                        cx={reg.x}
                        cy={reg.y}
                        r="48"
                        fill="none"
                        stroke="#60A5FA"
                        strokeDasharray="3 4"
                        strokeWidth="1.4"
                      />
                    )}
                    <circle
                      cx={reg.x}
                      cy={reg.y}
                      r="38"
                      fill={isDown ? '#261412' : '#181C1B'}
                      stroke={stroke}
                      strokeWidth={isLeader ? '2.8' : '2'}
                    />
                    <text x={reg.x} y={reg.y - 6} textAnchor="middle" fill="#F4F0E8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {reg.label}
                    </text>
                    <text x={reg.x} y={reg.y + 8} textAnchor="middle" fill={stroke} fontSize="8.5" fontFamily="monospace">
                      {isDown
                        ? 'OUTAGE'
                        : isLeader
                        ? 'LEADER'
                        : topology === 'leaderless-quorum'
                        ? 'PEER N=3'
                        : 'FOLLOWER'}
                    </text>
                    <text x={reg.x} y={reg.y + 22} textAnchor="middle" fill="#9A968E" fontSize="8" fontFamily="monospace">
                      {reg.city}
                    </text>
                    {isClient && (
                      <text x={reg.x} y={reg.y - 52} textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        CLIENT ORIGIN
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold">
                Active Topology Telemetry
              </div>
              <h2 className="font-editorial text-2xl">{activeSpec.name}</h2>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                {result.explanation}
              </p>

              <div className="space-y-2 font-mono text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Durability (RPO)</span>
                  <span className="font-semibold text-right">{result.rpoLabel}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Failover Time (RTO)</span>
                  <span className="font-semibold">{result.rtoEstimate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--rule)]">
                  <span className="text-[var(--ink-muted)]">Write Conflicts</span>
                  <span
                    className={
                      result.conflictRisk === 'None'
                        ? 'font-semibold text-[var(--emerald)]'
                        : 'font-semibold text-[var(--signal)]'
                    }
                  >
                    {result.conflictRisk}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--rule)] flex flex-wrap gap-2">
              {activeSpec.conceptIds.map((cid) => {
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
        </section>

        {/* All 4 Topologies Side-by-Side Comparison Table */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 overflow-x-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-1">
            Live Comparison Matrix · Client in {clientRegion.toUpperCase()} · Outage: {failedRegion.toUpperCase()}
          </div>
          <h2 className="font-editorial text-2xl mb-4">Replication Topology Trade-Offs</h2>
          <table className="w-full text-left border-collapse font-mono text-xs min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                <th className="py-2.5 pr-4">Topology</th>
                <th className="py-2.5 px-3">Write RTT</th>
                <th className="py-2.5 px-3">Read RTT</th>
                <th className="py-2.5 px-3">Writes Up?</th>
                <th className="py-2.5 px-3">RPO</th>
                <th className="py-2.5 px-3">Write Conflicts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)]">
              {allComparisons.map(({ spec, eval: ev }) => (
                <tr
                  key={spec.id}
                  onClick={() => setTopology(spec.id)}
                  className={`cursor-pointer ${
                    spec.id === topology ? 'bg-[var(--paper)] font-semibold' : 'hover:bg-[var(--paper)]/60'
                  }`}
                >
                  <td className="py-2.5 pr-4 text-[var(--ink)]">{spec.name}</td>
                  <td className="py-2.5 px-3">
                    {ev.writeLatencyMs !== null ? `${ev.writeLatencyMs} ms` : 'STALLED'}
                  </td>
                  <td className="py-2.5 px-3">
                    {ev.readLatencyMs !== null ? `${ev.readLatencyMs} ms` : 'STALLED'}
                  </td>
                  <td className="py-2.5 px-3">
                    {ev.writesAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[var(--emerald)]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> YES
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--signal)]">
                        <AlertTriangle className="w-3.5 h-3.5" /> NO
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">{ev.rpoLabel.split(' (')[0]}</td>
                  <td className="py-2.5 px-3 text-[11px]">{ev.conflictRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
