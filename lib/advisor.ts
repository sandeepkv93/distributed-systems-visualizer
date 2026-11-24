import type { DuelId } from './duels';

export type FaultModelReq = 'crash' | 'byzantine';
export type ConsistencyReq = 'linearizable' | 'causal' | 'eventual';
export type PartitionStanceReq = 'cp' | 'ap';
export type WriteLatencyReq = 'local-0rtt' | 'single-rtt' | 'multi-rtt';
export type WorkloadReq =
  | 'state-machine'
  | 'kv-storage'
  | 'range-scan'
  | 'cross-service-txn'
  | 'shared-collab';

export interface AdvisorConstraints {
  faultModel: FaultModelReq;
  consistency: ConsistencyReq;
  partitionStance: PartitionStanceReq;
  writeLatency: WriteLatencyReq;
  workload: WorkloadReq;
}

export const DEFAULT_ADVISOR_CONSTRAINTS: AdvisorConstraints = {
  faultModel: 'crash',
  consistency: 'linearizable',
  partitionStance: 'cp',
  writeLatency: 'single-rtt',
  workload: 'state-machine',
};

export interface AdvisorPreset {
  id: string;
  label: string;
  summary: string;
  constraints: AdvisorConstraints;
}

export const ADVISOR_PRESETS: readonly AdvisorPreset[] = [
  {
    id: 'metadata-consensus',
    label: 'Metadata & Leader Store',
    summary: 'etcd / CockroachDB raft group',
    constraints: {
      faultModel: 'crash',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'single-rtt',
      workload: 'state-machine',
    },
  },
  {
    id: 'global-collab',
    label: 'Offline-First / Global State',
    summary: 'Zero-coordination CRDT sync',
    constraints: {
      faultModel: 'crash',
      consistency: 'eventual',
      partitionStance: 'ap',
      writeLatency: 'local-0rtt',
      workload: 'shared-collab',
    },
  },
  {
    id: 'byzantine-ledger',
    label: 'Untrusted Consortium',
    summary: 'Malicious replicas (3f + 1)',
    constraints: {
      faultModel: 'byzantine',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'multi-rtt',
      workload: 'state-machine',
    },
  },
  {
    id: 'microservice-saga',
    label: 'Microservice Checkout',
    summary: 'Non-blocking cross-service workflow',
    constraints: {
      faultModel: 'crash',
      consistency: 'eventual',
      partitionStance: 'ap',
      writeLatency: 'single-rtt',
      workload: 'cross-service-txn',
    },
  },
  {
    id: 'dynamo-kv',
    label: 'Tunable High-Avail KV',
    summary: 'Leaderless W + R > N storage',
    constraints: {
      faultModel: 'crash',
      consistency: 'causal',
      partitionStance: 'ap',
      writeLatency: 'single-rtt',
      workload: 'kv-storage',
    },
  },
  {
    id: 'range-analytics',
    label: 'Ordered Range Database',
    summary: 'Lexicographic prefix & BETWEEN scans',
    constraints: {
      faultModel: 'crash',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'single-rtt',
      workload: 'range-scan',
    },
  },
];

export interface ProtocolProfile {
  conceptId: string;
  name: string;
  platePath: string;
  citation: string;
  summary: string;
  supportsByzantine: boolean;
  consistencyLevels: readonly ConsistencyReq[];
  partitionStances: readonly PartitionStanceReq[];
  writeLatencies: readonly WriteLatencyReq[];
  workloads: readonly WorkloadReq[];
  quorumFormula: string;
  tradeoffNote: string;
  duelId?: DuelId;
  showBenchLink?: boolean;
}

export const ADVISOR_CANDIDATES: readonly ProtocolProfile[] = [
  {
    conceptId: 'raft',
    name: 'Raft Consensus',
    platePath: '/raft',
    citation: 'Ongaro & Ousterhout, 2014',
    summary: 'Strong-leader replicated state machine with sequential log matching and 1-RTT steady-state commits.',
    supportsByzantine: false,
    consistencyLevels: ['linearizable', 'causal'],
    partitionStances: ['cp'],
    writeLatencies: ['single-rtt', 'multi-rtt'],
    workloads: ['state-machine', 'kv-storage'],
    quorumFormula: 'N = 2f + 1 · Majority ⌊N/2⌋ + 1',
    tradeoffNote: 'Stalls writes on the minority side of a partition and requires a leader election on primary crash.',
    duelId: 'raft-vs-paxos',
    showBenchLink: true,
  },
  {
    conceptId: 'paxos',
    name: 'Paxos Consensus',
    platePath: '/paxos',
    citation: 'Lamport, 1998',
    summary: 'Symmetric proposer/acceptor consensus guaranteeing safety across overlapping acceptor majorities.',
    supportsByzantine: false,
    consistencyLevels: ['linearizable'],
    partitionStances: ['cp'],
    writeLatencies: ['multi-rtt'],
    workloads: ['state-machine'],
    quorumFormula: 'N = 2f + 1 · Prepare + Accept (2 RTT)',
    tradeoffNote: 'Basic Paxos incurs 2 RTTs per value and risks proposer dueling without a stable Multi-Paxos leader.',
    duelId: 'raft-vs-paxos',
    showBenchLink: true,
  },
  {
    conceptId: 'pbft',
    name: 'PBFT (Byzantine Consensus)',
    platePath: '/pbft',
    citation: 'Castro & Liskov, 1999',
    summary: 'Three-phase all-to-all cryptographic consensus tolerating malicious or equivocating replicas.',
    supportsByzantine: true,
    consistencyLevels: ['linearizable'],
    partitionStances: ['cp'],
    writeLatencies: ['multi-rtt'],
    workloads: ['state-machine'],
    quorumFormula: 'N = 3f + 1 · Quorum 2f + 1 · O(N²) msgs',
    tradeoffNote: 'Quadratic O(N²) message fan-out limits committee size and adds 3 message phases per request.',
    duelId: 'raft-vs-pbft',
    showBenchLink: true,
  },
  {
    conceptId: 'quorum-replication',
    name: 'Dynamo Quorum Replication',
    platePath: '/quorum-replication',
    citation: 'DeCandia et al., 2007',
    summary: 'Leaderless replica set with tunable W and R quorums, version vectors, and background read repair.',
    supportsByzantine: false,
    consistencyLevels: ['causal', 'eventual', 'linearizable'],
    partitionStances: ['ap', 'cp'],
    writeLatencies: ['single-rtt'],
    workloads: ['kv-storage'],
    quorumFormula: 'Strong overlap when W + R > N',
    tradeoffNote: 'Lowering W + R <= N boosts availability and speed at the cost of stale reads until read repair runs.',
    duelId: 'quorum-vs-crdts',
    showBenchLink: true,
  },
  {
    conceptId: 'crdts',
    name: 'Conflict-Free CRDTs',
    platePath: '/crdts',
    citation: 'Shapiro et al., 2011',
    summary: 'Coordination-free replicated data types whose algebraic semilattice merges guarantee convergence.',
    supportsByzantine: false,
    consistencyLevels: ['eventual', 'causal'],
    partitionStances: ['ap'],
    writeLatencies: ['local-0rtt'],
    workloads: ['shared-collab', 'kv-storage'],
    quorumFormula: '0-RTT local write · Join-semilattice SEC',
    tradeoffNote: 'Constrained to semilattice data types (counters, sets, sequences) and cannot enforce global uniqueness invariants.',
    duelId: 'quorum-vs-crdts',
  },
  {
    conceptId: 'two-phase-commit',
    name: 'Two-Phase Commit (2PC)',
    platePath: '/two-phase-commit',
    citation: 'Gray, 1978',
    summary: 'Atomic coordinator protocol guaranteeing all-or-nothing ACID commits across multiple shards.',
    supportsByzantine: false,
    consistencyLevels: ['linearizable'],
    partitionStances: ['cp'],
    writeLatencies: ['multi-rtt'],
    workloads: ['cross-service-txn'],
    quorumFormula: 'Unanimous N/N YES votes required',
    tradeoffNote: 'Blocking protocol: if the coordinator crashes while participants are PREPARED, locks stay held until recovery.',
    duelId: '2pc-vs-saga',
  },
  {
    conceptId: 'distributed-transactions',
    name: 'Compensating Sagas',
    platePath: '/distributed-transactions',
    citation: 'Garcia-Molina & Salem, 1987',
    summary: 'Non-blocking multi-service workflow composed of local transactions paired with explicit rollback compensations.',
    supportsByzantine: false,
    consistencyLevels: ['eventual'],
    partitionStances: ['ap'],
    writeLatencies: ['single-rtt', 'multi-rtt'],
    workloads: ['cross-service-txn'],
    quorumFormula: 'Local commits + reverse compensations',
    tradeoffNote: 'Lacks ACID isolation — intermediate states are visible to other services before a failure unwinds.',
    duelId: '2pc-vs-saga',
  },
  {
    conceptId: 'consistent-hashing',
    name: 'Consistent Hashing Ring',
    platePath: '/consistent-hashing',
    citation: 'Karger et al., 1997',
    summary: 'Virtual-node circular hash partitioner spreading point lookups uniformly with minimal K/N rebalance churn.',
    supportsByzantine: false,
    consistencyLevels: ['eventual', 'causal'],
    partitionStances: ['ap'],
    writeLatencies: ['single-rtt'],
    workloads: ['kv-storage'],
    quorumFormula: 'Expected K/N key migration on scale',
    tradeoffNote: 'Destroys lexicographic key ordering, turning range queries into expensive scatter-gather scans.',
    duelId: 'hashing-vs-sharding',
  },
  {
    conceptId: 'sharding-rebalancing',
    name: 'Contiguous Range Sharding',
    platePath: '/sharding-rebalancing',
    citation: 'Chang et al. (Bigtable), 2006',
    summary: 'Lexicographically ordered contiguous shard partitions enabling single-hop range scans and dynamic splits.',
    supportsByzantine: false,
    consistencyLevels: ['linearizable', 'causal'],
    partitionStances: ['cp'],
    writeLatencies: ['single-rtt'],
    workloads: ['range-scan', 'kv-storage'],
    quorumFormula: 'Contiguous key intervals [start..end]',
    tradeoffNote: 'Vulnerable to monotonic timestamp/ID write hotspots on the tail shard without salting or splitting.',
    duelId: 'hashing-vs-sharding',
  },
];

export type FitTier = 'optimal' | 'viable' | 'tradeoff' | 'disqualified';

export interface ProtocolRecommendation {
  profile: ProtocolProfile;
  score: number;
  fitTier: FitTier;
  matchedReasons: string[];
  disqualifiers: string[];
}

export function evaluateProtocolRecommendations(
  constraints: AdvisorConstraints
): ProtocolRecommendation[] {
  const results: ProtocolRecommendation[] = ADVISOR_CANDIDATES.map((profile) => {
    let points = 0;
    const matchedReasons: string[] = [];
    const disqualifiers: string[] = [];

    // 1. Fault Model (25 pts — hard disqualifier if Byzantine required)
    if (constraints.faultModel === 'byzantine') {
      if (profile.supportsByzantine) {
        points += 25;
        matchedReasons.push('Tolerates malicious / Byzantine equivocation (3f + 1)');
      } else {
        disqualifiers.push('Crash-only fault model — cannot survive malicious / Byzantine nodes');
      }
    } else {
      if (!profile.supportsByzantine) {
        points += 25;
        matchedReasons.push('Efficient crash-fault model without quadratic BFT overhead');
      } else {
        points += 14;
        matchedReasons.push('Survives crash faults (though BFT O(N²) overhead is heavier than CFT)');
      }
    }

    // 2. Workload Alignment (30 pts)
    if (profile.workloads[0] === constraints.workload) {
      points += 30;
      matchedReasons.push(`Primary architecture fit for ${formatWorkload(constraints.workload)}`);
    } else if (profile.workloads.includes(constraints.workload)) {
      points += 20;
      matchedReasons.push(`Supports ${formatWorkload(constraints.workload)} workloads`);
    } else {
      disqualifiers.push(`Not designed as primary engine for ${formatWorkload(constraints.workload)}`);
    }

    // 3. Consistency Model (20 pts)
    if (profile.consistencyLevels[0] === constraints.consistency) {
      points += 20;
      matchedReasons.push(`Native ${constraints.consistency} consistency guarantee`);
    } else if (profile.consistencyLevels.includes(constraints.consistency)) {
      points += 13;
      matchedReasons.push(`Configurable for ${constraints.consistency} consistency`);
    } else if (constraints.consistency === 'linearizable') {
      disqualifiers.push('Cannot guarantee strict linearizability / ACID isolation');
    } else {
      points += 6;
    }

    // 4. Partition Stance (15 pts)
    if (profile.partitionStances[0] === constraints.partitionStance) {
      points += 15;
      matchedReasons.push(
        constraints.partitionStance === 'cp'
          ? 'Preserves CP safety under partitions'
          : 'Preserves AP availability during partitions'
      );
    } else if (profile.partitionStances.includes(constraints.partitionStance)) {
      points += 10;
      matchedReasons.push(`Can be tuned for ${constraints.partitionStance.toUpperCase()} behavior`);
    } else {
      disqualifiers.push(
        constraints.partitionStance === 'ap'
          ? 'Blocks minority writes during partitions (CP-first)'
          : 'Allows diverging writes during partitions (AP-first)'
      );
    }

    // 5. Write Latency Budget (10 pts)
    if (profile.writeLatencies.includes(constraints.writeLatency)) {
      points += 10;
      matchedReasons.push(`Meets ${formatLatency(constraints.writeLatency)} write latency budget`);
    } else if (constraints.writeLatency === 'local-0rtt') {
      disqualifiers.push('Requires network round-trips before acknowledging writes (cannot do 0-RTT)');
    } else if (
      constraints.writeLatency === 'single-rtt' &&
      profile.writeLatencies.includes('local-0rtt')
    ) {
      points += 10;
      matchedReasons.push('Exceeds latency budget with 0-RTT local writes');
    } else {
      points += 4;
    }

    const score = Math.max(0, Math.min(100, points));
    let fitTier: FitTier;
    if (disqualifiers.length > 0 && (constraints.faultModel === 'byzantine' && !profile.supportsByzantine)) {
      fitTier = 'disqualified';
    } else if (disqualifiers.length >= 2 || score < 45) {
      fitTier = 'disqualified';
    } else if (disqualifiers.length === 0 && score >= 82) {
      fitTier = 'optimal';
    } else if (disqualifiers.length === 0 && score >= 65) {
      fitTier = 'viable';
    } else {
      fitTier = 'tradeoff';
    }

    return {
      profile,
      score,
      fitTier,
      matchedReasons,
      disqualifiers,
    };
  });

  const tierRank: Record<FitTier, number> = {
    optimal: 3,
    viable: 2,
    tradeoff: 1,
    disqualified: 0,
  };

  return results.sort((a, b) => {
    if (tierRank[b.fitTier] !== tierRank[a.fitTier]) {
      return tierRank[b.fitTier] - tierRank[a.fitTier];
    }
    return b.score - a.score;
  });
}

function formatWorkload(w: WorkloadReq): string {
  switch (w) {
    case 'state-machine':
      return 'replicated state machines';
    case 'kv-storage':
      return 'key-value storage';
    case 'range-scan':
      return 'ordered range queries';
    case 'cross-service-txn':
      return 'cross-service transactions';
    case 'shared-collab':
      return 'collaborative multi-master state';
  }
}

function formatLatency(l: WriteLatencyReq): string {
  switch (l) {
    case 'local-0rtt':
      return '0-RTT local';
    case 'single-rtt':
      return '1-RTT';
    case 'multi-rtt':
      return 'multi-RTT';
  }
}
