export type PartitioningOptionId = 'consistent-hashing' | 'range-sharding' | 'single-shard';
export type ReplicationOptionId = 'raft' | 'quorum' | 'crdt' | 'pbft' | 'kafka-isr';
export type TransactionOptionId = 'none' | 'two-phase-commit' | 'saga' | 'fenced-leases';
export type ClockRepairOptionId = 'hlc' | 'truetime' | 'merkle-gossip' | 'wall-lww';

export interface StackSelection {
  partitioning: PartitioningOptionId;
  replication: ReplicationOptionId;
  transactions: TransactionOptionId;
  clocks: ClockRepairOptionId;
}

export interface StackLayerOption<T extends string> {
  id: T;
  name: string;
  tagline: string;
  conceptId: string;
  addedRtts: number;
  citation: string;
}

export interface StackWarning {
  id: string;
  severity: 'critical' | 'warning' | 'advisory';
  title: string;
  detail: string;
  remediation: string;
}

export interface ComposedStackReport {
  capClass: 'CP' | 'AP' | 'Tunable';
  pacelcClass: string;
  consistencyGuarantee: string;
  faultModel: string;
  estimatedWriteRtts: number;
  fitScore: number;
  closestRealSystem: string;
  warnings: StackWarning[];
  linkedConceptIds: string[];
}

export const PARTITIONING_OPTIONS: readonly StackLayerOption<PartitioningOptionId>[] = [
  {
    id: 'consistent-hashing',
    name: 'Consistent Hash Ring + Vnodes',
    tagline: 'Uniform key spread with ~K/N key movement on topology changes',
    conceptId: 'consistent-hashing',
    addedRtts: 0,
    citation: 'Karger et al. 1997',
  },
  {
    id: 'range-sharding',
    name: 'Lexicographic Range Sharding',
    tagline: 'Ordered SQL range scans & automatic tablet splitting',
    conceptId: 'sharding-rebalancing',
    addedRtts: 0,
    citation: 'Chang et al. 2006',
  },
  {
    id: 'single-shard',
    name: 'Single Replicated Cluster',
    tagline: 'No cross-shard routing; ideal for metadata & config stores',
    conceptId: 'network-partitions',
    addedRtts: 0,
    citation: 'Hunt et al. 2010',
  },
] as const;

export const REPLICATION_OPTIONS: readonly StackLayerOption<ReplicationOptionId>[] = [
  {
    id: 'raft',
    name: 'Raft / Multi-Paxos Consensus',
    tagline: '1-RTT linearizable quorum replication (2f+1 crash tolerance)',
    conceptId: 'raft',
    addedRtts: 1,
    citation: 'Ongaro & Ousterhout 2014',
  },
  {
    id: 'quorum',
    name: 'Dynamo Tunable Quorums (W+R>N)',
    tagline: 'Leaderless high-availability replication with read-repair',
    conceptId: 'quorum-replication',
    addedRtts: 1,
    citation: 'DeCandia et al. 2007',
  },
  {
    id: 'crdt',
    name: 'State-Based CRDTs (0-RTT Merge)',
    tagline: 'Coordination-free local writes converging via join-semilattices',
    conceptId: 'crdts',
    addedRtts: 0,
    citation: 'Shapiro et al. 2011',
  },
  {
    id: 'pbft',
    name: 'PBFT Byzantine Quorum (3f+1)',
    tagline: 'Tolerates malicious/arbitrary nodes with O(N²) certificates',
    conceptId: 'pbft',
    addedRtts: 2.5,
    citation: 'Castro & Liskov 1999',
  },
  {
    id: 'kafka-isr',
    name: 'Partitioned ISR Replication Log',
    tagline: 'High-throughput ordered append log with High Watermark',
    conceptId: 'replication-log',
    addedRtts: 1,
    citation: 'Kreps et al. 2011',
  },
] as const;

export const TRANSACTION_OPTIONS: readonly StackLayerOption<TransactionOptionId>[] = [
  {
    id: 'none',
    name: 'Single-Key / Local Atomic Ops',
    tagline: 'Zero cross-shard coordination overhead; max throughput',
    conceptId: 'eventual-consistency',
    addedRtts: 0,
    citation: 'Vogels 2009',
  },
  {
    id: 'two-phase-commit',
    name: 'Two-Phase Commit (2PC)',
    tagline: 'Strict multi-shard atomic commit across replicated ranges',
    conceptId: 'two-phase-commit',
    addedRtts: 2,
    citation: 'Gray 1978',
  },
  {
    id: 'saga',
    name: 'Compensating Saga Workflow',
    tagline: 'Non-blocking microservice steps with reverse compensation',
    conceptId: 'distributed-transactions',
    addedRtts: 2,
    citation: 'Garcia-Molina & Salem 1987',
  },
  {
    id: 'fenced-leases',
    name: 'Leases + Monotonic Fencing Tokens',
    tagline: 'Safe leader/worker mutual exclusion surviving GC pauses',
    conceptId: 'distributed-locking',
    addedRtts: 1,
    citation: 'Burrows 2006',
  },
] as const;

export const CLOCK_REPAIR_OPTIONS: readonly StackLayerOption<ClockRepairOptionId>[] = [
  {
    id: 'hlc',
    name: 'Hybrid Logical Clocks (HLC)',
    tagline: 'Causal ordering bounded close to NTP without commit-wait',
    conceptId: 'vector-clocks',
    addedRtts: 0,
    citation: 'Kulkarni et al. 2014',
  },
  {
    id: 'truetime',
    name: 'Spanner TrueTime (2ε Commit-Wait)',
    tagline: 'Hardware GPS + atomic clocks for external consistency',
    conceptId: 'lamport-clocks',
    addedRtts: 0.5,
    citation: 'Corbett et al. 2012',
  },
  {
    id: 'merkle-gossip',
    name: 'Merkle Trees + Push-Pull Gossip',
    tagline: 'O(log M) background divergence repair across peers',
    conceptId: 'merkle-anti-entropy',
    addedRtts: 0,
    citation: 'Demers 1987 · DeCandia 2007',
  },
  {
    id: 'wall-lww',
    name: 'Raw NTP Wall-Clock LWW',
    tagline: 'Zero protocol metadata; vulnerable to silent clock-skew loss',
    conceptId: 'eventual-consistency',
    addedRtts: 0,
    citation: 'Mills 1991 (NTP)',
  },
] as const;

export interface StackPreset {
  id: string;
  label: string;
  selection: StackSelection;
}

export const STACK_PRESETS: readonly StackPreset[] = [
  {
    id: 'cockroach',
    label: 'NewSQL (CockroachDB-style)',
    selection: {
      partitioning: 'range-sharding',
      replication: 'raft',
      transactions: 'two-phase-commit',
      clocks: 'hlc',
    },
  },
  {
    id: 'spanner',
    label: 'Global External Consistency (Spanner)',
    selection: {
      partitioning: 'range-sharding',
      replication: 'raft',
      transactions: 'two-phase-commit',
      clocks: 'truetime',
    },
  },
  {
    id: 'dynamo',
    label: 'High-Availability KV (Dynamo/Cassandra)',
    selection: {
      partitioning: 'consistent-hashing',
      replication: 'quorum',
      transactions: 'none',
      clocks: 'merkle-gossip',
    },
  },
  {
    id: 'edge-crdt',
    label: 'Offline-First Collaborative Edge',
    selection: {
      partitioning: 'consistent-hashing',
      replication: 'crdt',
      transactions: 'none',
      clocks: 'merkle-gossip',
    },
  },
  {
    id: 'bft-ledger',
    label: 'Byzantine Financial Ledger',
    selection: {
      partitioning: 'single-shard',
      replication: 'pbft',
      transactions: 'none',
      clocks: 'hlc',
    },
  },
] as const;

export function evaluateComposedStack(selection: StackSelection): ComposedStackReport {
  const partOpt = PARTITIONING_OPTIONS.find((o) => o.id === selection.partitioning)!;
  const replOpt = REPLICATION_OPTIONS.find((o) => o.id === selection.replication)!;
  const txOpt = TRANSACTION_OPTIONS.find((o) => o.id === selection.transactions)!;
  const clockOpt = CLOCK_REPAIR_OPTIONS.find((o) => o.id === selection.clocks)!;

  const warnings: StackWarning[] = [];

  // Critical anti-pattern: 2PC over AP / non-consensus layer
  if (
    selection.transactions === 'two-phase-commit' &&
    (selection.replication === 'crdt' || selection.replication === 'quorum')
  ) {
    warnings.push({
      id: 'warn-2pc-ap',
      severity: 'critical',
      title: '2PC Blocking Atomicity Conflicts with AP Replication',
      detail:
        'Two-Phase Commit requires durable linearizable participant logs and a fault-tolerant coordinator. Layering 2PC over CRDTs or leaderless quorums risks split decisions and permanent lock blocking.',
      remediation:
        'Switch replication to Raft/Multi-Paxos (like Spanner/CockroachDB), or replace 2PC with Compensating Sagas.',
    });
  }

  // Critical anti-pattern: TrueTime without consensus
  if (
    selection.clocks === 'truetime' &&
    (selection.replication === 'crdt' || selection.replication === 'quorum')
  ) {
    warnings.push({
      id: 'warn-truetime-no-consensus',
      severity: 'warning',
      title: 'TrueTime 2ε Commit-Wait Without Consensus',
      detail:
        'Waiting 2ε only yields External Consistency when paired with serializable consensus (Raft/Paxos + 2PC). On an AP store it adds latency without eliminating concurrent divergence.',
      remediation: 'Pair TrueTime with Raft + 2PC, or switch clocks to Merkle + Gossip / HLC.',
    });
  }

  // Warning: Wall-Clock LWW data loss
  if (selection.clocks === 'wall-lww') {
    warnings.push({
      id: 'warn-wall-lww',
      severity: selection.replication === 'quorum' || selection.replication === 'crdt' ? 'critical' : 'warning',
      title: 'Silent Data Loss Risk Under NTP Clock Skew',
      detail:
        'Raw physical wall-clock LWW silently drops causally newer writes whenever a node’s NTP clock lags behind a peer.',
      remediation: 'Upgrade to Hybrid Logical Clocks (HLC) or Merkle + Version-Vector anti-entropy.',
    });
  }

  // Warning: PBFT + 2PC latency explosion
  if (selection.replication === 'pbft' && selection.transactions === 'two-phase-commit') {
    warnings.push({
      id: 'warn-pbft-2pc',
      severity: 'warning',
      title: 'High Commit Latency Stacking PBFT + 2PC (4.5+ RTTs)',
      detail:
        'PBFT already incurs 2.5 RTTs and O(N²) all-to-all rounds; wrapping cross-shard 2PC on top amplifies tail latency severely.',
      remediation: 'Execute multi-object state transitions deterministically inside a single PBFT state machine.',
    });
  }

  // Advisory: Redundant 2PC on single shard
  if (selection.partitioning === 'single-shard' && selection.transactions === 'two-phase-commit') {
    warnings.push({
      id: 'warn-single-shard-2pc',
      severity: 'advisory',
      title: 'Cross-Shard 2PC Unnecessary on Single Replicated Group',
      detail:
        'A single Raft/Paxos cluster can commit multi-key transactions atomically in one log entry without 2PC round-trips.',
      remediation: 'Select Single-Key / Local Atomic Ops or upgrade partitioning to Range Sharding.',
    });
  }

  // Advisory: Range sharding monotonic hotspot
  if (selection.partitioning === 'range-sharding') {
    warnings.push({
      id: 'adv-range-hotspot',
      severity: 'advisory',
      title: 'Guard Against Monotonic-Key Tail Hotspots',
      detail:
        'Lexicographic range sharding concentrates timestamp/auto-increment inserts onto the rightmost tablet.',
      remediation: 'Use UUID/hash-prefixed keys or enable automatic load-based range splitting.',
    });
  }

  // Advisory: CRDT or Quorum without anti-entropy
  if (
    (selection.replication === 'crdt' || selection.replication === 'quorum') &&
    selection.clocks !== 'merkle-gossip'
  ) {
    warnings.push({
      id: 'adv-missing-anti-entropy',
      severity: 'advisory',
      title: 'Add Background Anti-Entropy for Partition Healing',
      detail:
        'Leaderless quorums and CRDTs rely on background gossip or Merkle tree sync to heal replicas after prolonged network splits.',
      remediation: 'Consider Merkle Trees + Push-Pull Gossip in Layer 4.',
    });
  }

  const capClass: ComposedStackReport['capClass'] =
    selection.replication === 'crdt'
      ? 'AP'
      : selection.replication === 'quorum'
      ? 'Tunable'
      : 'CP';

  const pacelcClass =
    selection.replication === 'crdt'
      ? 'PA / EL'
      : selection.replication === 'quorum'
      ? 'PA / EL (Tunable to PC/EC)'
      : 'PC / EC';

  const consistencyGuarantee =
    selection.replication === 'raft' && selection.clocks === 'truetime'
      ? 'External Consistency (Strict Serializability)'
      : selection.replication === 'raft' || selection.replication === 'pbft'
      ? 'Linearizable / Serializable'
      : selection.replication === 'kafka-isr'
      ? 'Per-Partition Sequential Order (HW-Bounded)'
      : selection.replication === 'quorum'
      ? 'Tunable Quorum (W+R>N Strict or Eventual)'
      : 'Strong Eventual Consistency (0-RTT Semilattice)';

  const faultModel =
    selection.replication === 'pbft'
      ? 'Byzantine Fault Tolerant (N = 3f + 1)'
      : selection.replication === 'crdt'
      ? 'Partition-Tolerant Offline-First (0-RTT)'
      : selection.replication === 'quorum'
      ? 'Crash-Tolerant Tunable Quorums'
      : 'Crash Fault Tolerant (N = 2f + 1 Majority)';

  const estimatedWriteRtts =
    partOpt.addedRtts + replOpt.addedRtts + txOpt.addedRtts + clockOpt.addedRtts;

  let fitScore = 100;
  for (const w of warnings) {
    if (w.severity === 'critical') fitScore -= 28;
    else if (w.severity === 'warning') fitScore -= 14;
    else fitScore -= 4;
  }
  fitScore = Math.max(20, Math.min(100, fitScore));

  let closestRealSystem = 'Custom Hybrid Architecture';
  if (selection.replication === 'pbft') {
    closestRealSystem = 'Tendermint / CometBFT Consensus Engine';
  } else if (selection.replication === 'crdt') {
    closestRealSystem = 'Automerge / Redis Enterprise CRDT Edge Store';
  } else if (selection.replication === 'kafka-isr') {
    closestRealSystem = 'Apache Kafka / Redpanda Streaming Log';
  } else if (selection.replication === 'quorum') {
    closestRealSystem = 'Amazon Dynamo / Apache Cassandra';
  } else if (selection.replication === 'raft' && selection.clocks === 'truetime') {
    closestRealSystem = 'Google Spanner (Multi-Paxos + 2PC + TrueTime)';
  } else if (selection.replication === 'raft' && selection.partitioning === 'range-sharding') {
    closestRealSystem = 'CockroachDB / TiKV (Multi-Raft + Range Shards + HLC)';
  } else if (selection.replication === 'raft' && selection.partitioning === 'single-shard') {
    closestRealSystem = 'etcd / HashiCorp Consul (Single Raft Group)';
  }

  const linkedConceptIds = Array.from(
    new Set([partOpt.conceptId, replOpt.conceptId, txOpt.conceptId, clockOpt.conceptId])
  );

  return {
    capClass,
    pacelcClass,
    consistencyGuarantee,
    faultModel,
    estimatedWriteRtts,
    fitScore,
    closestRealSystem,
    warnings,
    linkedConceptIds,
  };
}

export function formatStackAdrMarkdown(
  selection: StackSelection,
  report: ComposedStackReport,
  title: string = 'Distributed Data Layer Architecture'
): string {
  const partOpt = PARTITIONING_OPTIONS.find((o) => o.id === selection.partitioning)!;
  const replOpt = REPLICATION_OPTIONS.find((o) => o.id === selection.replication)!;
  const txOpt = TRANSACTION_OPTIONS.find((o) => o.id === selection.transactions)!;
  const clockOpt = CLOCK_REPAIR_OPTIONS.find((o) => o.id === selection.clocks)!;

  const lines: string[] = [
    `# ADR: ${title}`,
    '',
    `- **Classification:** ${report.capClass} (${report.pacelcClass})`,
    `- **Consistency Model:** ${report.consistencyGuarantee}`,
    `- **Fault Model:** ${report.faultModel}`,
    `- **Estimated Write Critical Path:** ${report.estimatedWriteRtts} RTT(s)`,
    `- **Architectural Fit Score:** ${report.fitScore}/100`,
    `- **Closest Production Precedent:** ${report.closestRealSystem}`,
    '',
    '## Chosen 4-Layer Protocol Stack',
    '',
    `| Layer | Selected Mechanism | Citation |`,
    `| --- | --- | --- |`,
    `| 1. Partitioning & Routing | ${partOpt.name} | ${partOpt.citation} |`,
    `| 2. Replication & Consensus | ${replOpt.name} | ${replOpt.citation} |`,
    `| 3. Transactions & Coordination | ${txOpt.name} | ${txOpt.citation} |`,
    `| 4. Clocks & Anti-Entropy | ${clockOpt.name} | ${clockOpt.citation} |`,
    '',
    '## Trade-Offs & Risk Audit',
    '',
  ];

  if (report.warnings.length === 0) {
    lines.push('- No critical architectural conflicts detected across the selected layers.');
  } else {
    for (const w of report.warnings) {
      lines.push(`- **[${w.severity.toUpperCase()}] ${w.title}:** ${w.detail} *Mitigation:* ${w.remediation}`);
    }
  }

  lines.push('');
  lines.push('_Generated with Distributed Systems Atlas · Stack Studio (`/studio`)_');
  return lines.join('\n');
}
