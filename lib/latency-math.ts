export type TopologyPresetId = 'intra-az' | 'cross-az' | 'cross-region' | 'global';

export interface TopologyPreset {
  id: TopologyPresetId;
  label: string;
  regionExample: string;
  baseRttMs: number;
  jitterMultiplier: number;
  description: string;
}

export const TOPOLOGY_PRESETS: readonly TopologyPreset[] = [
  {
    id: 'intra-az',
    label: 'Intra-AZ LAN',
    regionExample: 'Single AZ / Spine Switch',
    baseRttMs: 0.6,
    jitterMultiplier: 1.8,
    description: 'Sub-millisecond datacenter fabric where disk fsync and serialization dominate.',
  },
  {
    id: 'cross-az',
    label: 'Multi-AZ Region',
    regionExample: 'us-east-1a ↔ 1b ↔ 1c',
    baseRttMs: 3.5,
    jitterMultiplier: 2.2,
    description: 'Standard cloud HA deployment tolerating single availability-zone loss.',
  },
  {
    id: 'cross-region',
    label: 'Continental WAN',
    regionExample: 'Virginia ↔ Iowa ↔ Oregon',
    baseRttMs: 45,
    jitterMultiplier: 1.75,
    description: 'Cross-region quorum replication surviving regional cloud outages.',
  },
  {
    id: 'global',
    label: 'Global Geo-Mesh',
    regionExample: 'US-East ↔ Frankfurt ↔ Tokyo',
    baseRttMs: 150,
    jitterMultiplier: 1.5,
    description: 'Intercontinental speed-of-light fiber latency where extra RTTs cost hundreds of ms.',
  },
] as const;

export interface LatencyInput {
  clusterSize: number;
  baseRttMs: number;
  jitterMultiplier: number;
}

export interface LatencyPhase {
  label: string;
  durationMs: number;
  color: string;
}

export interface ProtocolLatencyEstimate {
  id: string;
  conceptId: string;
  name: string;
  shortName: string;
  faultModel: string;
  complexityBigO: string;
  rtts: number;
  messagesPerWrite: number;
  p50Ms: number;
  p99Ms: number;
  serialOpsPerSec: number;
  minNodes: number;
  viable: boolean;
  viabilityNote: string;
  barrierType: 'local' | 'quorum' | 'all-participants' | 'sequential';
  phases: LatencyPhase[];
  citation: string;
}

function clampInput(input: LatencyInput): LatencyInput {
  return {
    clusterSize: Math.max(3, Math.min(21, Math.round(input.clusterSize))),
    baseRttMs: Math.max(0.2, Math.min(500, input.baseRttMs)),
    jitterMultiplier: Math.max(1.0, Math.min(5.0, input.jitterMultiplier)),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function evaluateProtocolLatencies(rawInput: LatencyInput): ProtocolLatencyEstimate[] {
  const { clusterSize: n, baseRttMs: rtt, jitterMultiplier: jitter } = clampInput(rawInput);
  const majority = Math.floor(n / 2) + 1;
  const fCft = Math.floor((n - 1) / 2);
  const fBft = Math.floor((n - 1) / 3);
  const bftViable = n >= 4;

  // Tail amplification differs sharply between quorum barriers (hedge slow minority) and all-node barriers (2PC)
  const quorumJitter = 1 + (jitter - 1) * 0.72;
  const allBarrierJitter = 1 + (jitter - 1) * (1 + Math.log2(Math.max(2, n)) * 0.16);
  const sequentialJitter = 1 + (jitter - 1) * 0.85;

  const crdtP50 = 0.2;
  const crdtP99 = round1(crdtP50 * 2.5);

  const quorumP50 = round1(0.4 + 1 * rtt);
  const quorumP99 = round1(0.4 + 1 * rtt * quorumJitter);

  const raftP50 = round1(0.6 + 1 * rtt);
  const raftP99 = round1(0.6 + 1 * rtt * quorumJitter);

  const paxosP50 = round1(0.8 + 2 * rtt);
  const paxosP99 = round1(0.8 + 2 * rtt * quorumJitter);

  const tpcP50 = round1(1.0 + 2 * rtt);
  const tpcP99 = round1(1.0 + 2 * rtt * allBarrierJitter);

  const pbftP50 = round1(1.5 + 2.5 * rtt);
  const pbftP99 = round1(1.5 + 2.5 * rtt * quorumJitter);

  const sagaP50 = round1(0.9 + 3 * rtt);
  const sagaP99 = round1(0.9 + 3 * rtt * sequentialJitter);

  const estimates: ProtocolLatencyEstimate[] = [
    {
      id: 'crdts',
      conceptId: 'crdts',
      name: 'CRDTs (Local Semilattice)',
      shortName: 'CRDTs',
      faultModel: 'AP · 0-RTT Async Merge',
      complexityBigO: 'O(1) sync',
      rtts: 0,
      messagesPerWrite: 0,
      p50Ms: crdtP50,
      p99Ms: crdtP99,
      serialOpsPerSec: Math.round(1000 / crdtP50),
      minNodes: 1,
      viable: true,
      viabilityNote: 'Writes apply locally in memory; gossip merges asynchronously off the critical path.',
      barrierType: 'local',
      phases: [{ label: 'Local Merge', durationMs: crdtP50, color: '#34D399' }],
      citation: 'Shapiro et al. 2011',
    },
    {
      id: 'quorum-replication',
      conceptId: 'quorum-replication',
      name: `Dynamo Quorum (W=${majority}/${n})`,
      shortName: 'Quorum',
      faultModel: `Tunable W+R>N (f=${fCft})`,
      complexityBigO: 'O(N)',
      rtts: 1,
      messagesPerWrite: 2 * (n - 1),
      p50Ms: quorumP50,
      p99Ms: quorumP99,
      serialOpsPerSec: Math.round(1000 / quorumP50),
      minNodes: 3,
      viable: true,
      viabilityNote: `Waits for fastest ${majority} of ${n} replicas; hedges slowest ${n - majority} stragglers.`,
      barrierType: 'quorum',
      phases: [
        { label: 'Local Coord', durationMs: 0.4, color: '#9E9B90' },
        { label: `Quorum Write (${majority}/${n})`, durationMs: round1(rtt), color: '#60A5FA' },
      ],
      citation: 'DeCandia et al. 2007',
    },
    {
      id: 'raft',
      conceptId: 'raft',
      name: 'Raft / Multi-Paxos (Steady Leader)',
      shortName: 'Raft',
      faultModel: `CFT 2f+1 (f=${fCft})`,
      complexityBigO: 'O(N)',
      rtts: 1,
      messagesPerWrite: 2 * (n - 1),
      p50Ms: raftP50,
      p99Ms: raftP99,
      serialOpsPerSec: Math.round(1000 / raftP50),
      minNodes: 3,
      viable: true,
      viabilityNote: `Leader appends locally + 1 RTT AppendEntries to ${majority}/${n} majority.`,
      barrierType: 'quorum',
      phases: [
        { label: 'WAL fsync', durationMs: 0.6, color: '#9E9B90' },
        { label: `AppendEntries (${majority}/${n})`, durationMs: round1(rtt), color: '#D9441E' },
      ],
      citation: 'Ongaro & Ousterhout 2014',
    },
    {
      id: 'paxos',
      conceptId: 'paxos',
      name: 'Basic Paxos (Unoptimized)',
      shortName: 'Basic Paxos',
      faultModel: `CFT 2f+1 (f=${fCft})`,
      complexityBigO: 'O(N)',
      rtts: 2,
      messagesPerWrite: 4 * (n - 1),
      p50Ms: paxosP50,
      p99Ms: paxosP99,
      serialOpsPerSec: Math.round(1000 / paxosP50),
      minNodes: 3,
      viable: true,
      viabilityNote: 'Requires Prepare/Promise + Accept/Accepted on every slot without a stable leader.',
      barrierType: 'quorum',
      phases: [
        { label: 'Prepare / Promise', durationMs: round1(rtt), color: '#60A5FA' },
        { label: 'Accept / Accepted', durationMs: round1(rtt + 0.8), color: '#D9441E' },
      ],
      citation: 'Lamport 1998',
    },
    {
      id: 'two-phase-commit',
      conceptId: 'two-phase-commit',
      name: 'Two-Phase Commit (2PC)',
      shortName: '2PC',
      faultModel: 'Atomic · All-Participant Barrier',
      complexityBigO: 'O(N)',
      rtts: 2,
      messagesPerWrite: 4 * (n - 1),
      p50Ms: tpcP50,
      p99Ms: tpcP99,
      serialOpsPerSec: Math.round(1000 / tpcP50),
      minNodes: 2,
      viable: true,
      viabilityNote: `Must wait for ALL ${n - 1} participants; p99 tail is governed by the single slowest node.`,
      barrierType: 'all-participants',
      phases: [
        { label: 'Phase 1: Prepare / Vote', durationMs: round1(rtt + 0.5), color: '#FBBF24' },
        { label: 'Phase 2: Commit / Ack', durationMs: round1(rtt + 0.5), color: '#D9441E' },
      ],
      citation: 'Gray 1978',
    },
    {
      id: 'pbft',
      conceptId: 'pbft',
      name: 'PBFT (Byzantine 3f+1)',
      shortName: 'PBFT',
      faultModel: bftViable ? `BFT 3f+1 (f=${fBft})` : 'Requires N >= 4',
      complexityBigO: 'O(N²)',
      rtts: 2.5,
      messagesPerWrite: (n - 1) + 2 * n * (n - 1),
      p50Ms: pbftP50,
      p99Ms: pbftP99,
      serialOpsPerSec: Math.round(1000 / pbftP50),
      minNodes: 4,
      viable: bftViable,
      viabilityNote: bftViable
        ? `Quadratic all-to-all Prepare & Commit (${(n - 1) + 2 * n * (n - 1)} msgs/op) limits cluster size.`
        : 'Needs at least N=4 replicas to tolerate f=1 Byzantine node.',
      barrierType: 'quorum',
      phases: [
        { label: 'Pre-Prepare', durationMs: round1(0.5 * rtt + 0.5), color: '#9E9B90' },
        { label: 'Prepare (N²)', durationMs: round1(rtt + 0.5), color: '#60A5FA' },
        { label: 'Commit (N²)', durationMs: round1(rtt + 0.5), color: '#D9441E' },
      ],
      citation: 'Castro & Liskov 1999',
    },
    {
      id: 'distributed-transactions',
      conceptId: 'distributed-transactions',
      name: 'Orchestrated Saga (3 Services)',
      shortName: 'Saga (3-Step)',
      faultModel: 'Eventual · Compensating Tx',
      complexityBigO: 'O(steps)',
      rtts: 3,
      messagesPerWrite: 6,
      p50Ms: sagaP50,
      p99Ms: sagaP99,
      serialOpsPerSec: Math.round(1000 / sagaP50),
      minNodes: 3,
      viable: true,
      viabilityNote: 'Zero cross-service locks; end-to-end latency grows linearly with sequential workflow steps.',
      barrierType: 'sequential',
      phases: [
        { label: 'Step 1: Reserve', durationMs: round1(rtt + 0.3), color: '#34D399' },
        { label: 'Step 2: Charge', durationMs: round1(rtt + 0.3), color: '#60A5FA' },
        { label: 'Step 3: Fulfill', durationMs: round1(rtt + 0.3), color: '#FBBF24' },
      ],
      citation: 'Garcia-Molina & Salem 1987',
    },
  ];

  return estimates;
}
