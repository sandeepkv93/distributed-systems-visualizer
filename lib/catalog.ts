import { Scenario } from './types';
import { chandyLamportScenarios } from '@/visualizers/chandy-lamport/scenarios';
import { consensusVariantsScenarios } from '@/visualizers/consensus-variants/scenarios';
import { consistentHashingScenarios } from '@/visualizers/consistent-hashing/scenarios';
import { crdtScenarios } from '@/visualizers/crdts/scenarios';
import { distributedLockingScenarios } from '@/visualizers/distributed-locking/scenarios';
import { distributedTransactionsScenarios } from '@/visualizers/distributed-transactions/scenarios';
import { eventualConsistencyScenarios } from '@/visualizers/eventual-consistency/scenarios';
import { failureDetectorScenarios } from '@/visualizers/failure-detectors/scenarios';
import { gossipAntiEntropyScenarios } from '@/visualizers/gossip-anti-entropy/scenarios';
import { lamportClocksScenarios } from '@/visualizers/lamport-clocks/scenarios';
import { loadBalancingScenarios } from '@/visualizers/load-balancing/scenarios';
import { merkleAntiEntropyScenarios } from '@/visualizers/merkle-anti-entropy/scenarios';
import { networkPartitionsScenarios } from '@/visualizers/network-partitions/scenarios';
import { paxosScenarios } from '@/visualizers/paxos/scenarios';
import { pbftScenarios } from '@/visualizers/pbft/scenarios';
import { quorumReplicationScenarios } from '@/visualizers/quorum-replication/scenarios';
import { raftScenarios } from '@/visualizers/raft/scenarios';
import { replicationLogScenarios } from '@/visualizers/replication-log/scenarios';
import { shardingRebalancingScenarios } from '@/visualizers/sharding-rebalancing/scenarios';
import { twoPhaseCommitScenarios } from '@/visualizers/two-phase-commit/scenarios';
import { vectorClockScenarios } from '@/visualizers/vector-clocks/scenarios';

export type ConceptDomainId =
  | 'time-causality'
  | 'consensus'
  | 'replication'
  | 'partitioning'
  | 'coordination';

export interface ConceptDomain {
  id: ConceptDomainId;
  index: string;
  label: string;
  shortLabel: string;
  summary: string;
}

export const CONCEPT_DOMAINS: readonly ConceptDomain[] = [
  {
    id: 'time-causality',
    index: '01',
    label: 'Time & Causality',
    shortLabel: 'Time',
    summary: 'Logical clocks, partial ordering, and global state cuts without synchronized walls.',
  },
  {
    id: 'consensus',
    index: '02',
    label: 'Consensus & Fault Tolerance',
    shortLabel: 'Consensus',
    summary: 'Agreement under crashes, split-brain partitions, and Byzantine adversaries.',
  },
  {
    id: 'replication',
    index: '03',
    label: 'Replication & Consistency',
    shortLabel: 'Replication',
    summary: 'CAP trade-offs, quorums, append-only logs, CRDT merges, and anti-entropy repair.',
  },
  {
    id: 'partitioning',
    index: '04',
    label: 'Partitioning & Routing',
    shortLabel: 'Routing',
    summary: 'Hash rings, shard movement, and backpressure-aware request routing.',
  },
  {
    id: 'coordination',
    index: '05',
    label: 'Coordination & Transactions',
    shortLabel: 'Transactions',
    summary: 'Lease-based locks, atomic commit protocols, and compensating sagas.',
  },
] as const;

export const CONCEPT_DOMAINS_BY_ID: ReadonlyMap<ConceptDomainId, ConceptDomain> = new Map(
  CONCEPT_DOMAINS.map((domain) => [domain.id, domain])
);

export interface ConceptCatalogEntry {
  id: string;
  plateNumber: string;
  domainId: ConceptDomainId;
  domainLabel: string;
  citation: string;
  mechanism: string;
  name: string;
  navName: string;
  path: string;
  description: string;
  color: string;
  emoji: string;
  scenarios: Scenario[];
  scenarioKeys: string[];
}

export function getScenarioKey(conceptId: string, scenarioId: string): string {
  return `${conceptId}:${scenarioId}`;
}

interface ConceptMetadata {
  id: string;
  domainId: ConceptDomainId;
  citation: string;
  mechanism: string;
  name: string;
  navName?: string;
  description: string;
  color: string;
  emoji: string;
  scenarios?: Scenario[];
}

function buildEntry(meta: ConceptMetadata, index: number): ConceptCatalogEntry {
  const scenarios = meta.scenarios ?? [];
  const domain = CONCEPT_DOMAINS_BY_ID.get(meta.domainId);
  return {
    id: meta.id,
    plateNumber: String(index + 1).padStart(2, '0'),
    domainId: meta.domainId,
    domainLabel: domain?.label ?? 'Distributed Systems',
    citation: meta.citation,
    mechanism: meta.mechanism,
    name: meta.name,
    navName: meta.navName ?? meta.name,
    path: `/${meta.id}`,
    description: meta.description,
    color: meta.color,
    emoji: meta.emoji,
    scenarios,
    scenarioKeys: scenarios.map((scenario) => getScenarioKey(meta.id, scenario.id)),
  };
}

const RAW_CONCEPTS: ConceptMetadata[] = [
  {
    id: 'cap-theorem',
    domainId: 'replication',
    citation: 'Brewer, 2000',
    mechanism: 'Trade-off Bound',
    name: 'CAP Theorem',
    description:
      'Explore trade-offs among Consistency, Availability, and Partition Tolerance with real systems.',
    color: 'bg-pink-600',
    emoji: '🔺',
  },
  {
    id: 'lamport-clocks',
    domainId: 'time-causality',
    citation: 'Lamport, 1978',
    mechanism: 'Scalar Logical Time',
    name: 'Lamport Clocks',
    description:
      'Understand logical clocks and total-order delivery using broadcasts and acknowledgements.',
    color: 'bg-teal-600',
    emoji: '⏱️',
    scenarios: lamportClocksScenarios,
  },
  {
    id: 'vector-clocks',
    domainId: 'time-causality',
    citation: 'Fidge & Mattern, 1988',
    mechanism: 'Causal Partial Order',
    name: 'Vector Clocks',
    description:
      'Track causality, detect concurrency, and compare event orderings with vector clocks.',
    color: 'bg-red-600',
    emoji: '🧭',
    scenarios: vectorClockScenarios,
  },
  {
    id: 'chandy-lamport',
    domainId: 'time-causality',
    citation: 'Chandy & Lamport, 1985',
    mechanism: 'Consistent Cut',
    name: 'Chandy-Lamport Snapshot',
    description:
      'Trace marker messages to record local state and in-flight messages for a global snapshot.',
    color: 'bg-cyan-600',
    emoji: '📸',
    scenarios: chandyLamportScenarios,
  },
  {
    id: 'eventual-consistency',
    domainId: 'replication',
    citation: 'Vogels, 2009',
    mechanism: 'Tunable Quorums',
    name: 'Eventual Consistency',
    description:
      'Write with ONE/QUORUM/ALL and observe replication, conflict, and anti-entropy convergence.',
    color: 'bg-yellow-600',
    emoji: '🌐',
    scenarios: eventualConsistencyScenarios,
  },
  {
    id: 'crdts',
    domainId: 'replication',
    citation: 'Shapiro et al., 2011',
    mechanism: 'Join-Semilattice',
    name: 'CRDTs',
    description:
      'Explore G-Counter, OR-Set, and RGA to see conflict-free merges across replicas.',
    color: 'bg-emerald-700',
    emoji: '🧮',
    scenarios: crdtScenarios,
  },
  {
    id: 'gossip-anti-entropy',
    domainId: 'replication',
    citation: 'Demers et al., 1987',
    mechanism: 'Epidemic Dissemination',
    name: 'Gossip & Anti-Entropy',
    description:
      'Push, pull, and push-pull rounds spread updates across nodes without a central coordinator.',
    color: 'bg-emerald-600',
    emoji: '🫧',
    scenarios: gossipAntiEntropyScenarios,
  },
  {
    id: 'merkle-anti-entropy',
    domainId: 'replication',
    citation: 'DeCandia et al., 2007',
    mechanism: 'Hash-Tree Diffing',
    name: 'Merkle Anti-Entropy',
    description:
      'Use Merkle trees to pinpoint divergence and sync only the necessary keys.',
    color: 'bg-sky-600',
    emoji: '🌳',
    scenarios: merkleAntiEntropyScenarios,
  },
  {
    id: 'quorum-replication',
    domainId: 'replication',
    citation: 'Gifford, 1979',
    mechanism: 'W + R > N Intersection',
    name: 'Quorum Replication',
    description:
      'Tune W/R quorums and watch read-repair fix stale replicas after failures.',
    color: 'bg-orange-600',
    emoji: '⚖️',
    scenarios: quorumReplicationScenarios,
  },
  {
    id: 'replication-log',
    domainId: 'replication',
    citation: 'Kreps et al., 2011',
    mechanism: 'ISR & High-Watermark',
    name: 'Replication Log',
    description:
      'Track a leader and ISR followers, see high-watermarks advance, and observe lag.',
    color: 'bg-slate-600',
    emoji: '📜',
    scenarios: replicationLogScenarios,
  },
  {
    id: 'failure-detectors',
    domainId: 'consensus',
    citation: 'Hayashibara / Das, 2004',
    mechanism: 'Phi Accrual & SWIM',
    name: 'Failure Detectors',
    description:
      'Watch phi accrual and SWIM probes move nodes through alive, suspect, and failed.',
    color: 'bg-orange-700',
    emoji: '🚨',
    scenarios: failureDetectorScenarios,
  },
  {
    id: 'consistent-hashing',
    domainId: 'partitioning',
    citation: 'Karger et al., 1997',
    mechanism: 'Ring & Virtual Nodes',
    name: 'Consistent Hashing',
    description:
      'Distribute keys across a ring and see how virtual nodes minimize reshuffling.',
    color: 'bg-indigo-600',
    emoji: '🧿',
    scenarios: consistentHashingScenarios,
  },
  {
    id: 'sharding-rebalancing',
    domainId: 'partitioning',
    citation: 'Chang et al., 2006',
    mechanism: 'Range & Hash Shards',
    name: 'Sharding + Rebalancing',
    description:
      'Compare range vs hash sharding and watch shard movement as nodes join or leave.',
    color: 'bg-cyan-700',
    emoji: '🧩',
    scenarios: shardingRebalancingScenarios,
  },
  {
    id: 'load-balancing',
    domainId: 'partitioning',
    citation: 'Mitzenmacher, 2001',
    mechanism: 'Backpressure & Shedding',
    name: 'Load Balancing',
    description:
      'Route requests across workers, trigger backpressure, and see drops under load.',
    color: 'bg-amber-700',
    emoji: '🚦',
    scenarios: loadBalancingScenarios,
  },
  {
    id: 'distributed-locking',
    domainId: 'coordination',
    citation: 'Burrows, 2006',
    mechanism: 'Leases & Fencing',
    name: 'Distributed Locking',
    description:
      'Acquire a lease, renew via heartbeats, and see timeouts trigger failover.',
    color: 'bg-lime-600',
    emoji: '🔒',
    scenarios: distributedLockingScenarios,
  },
  {
    id: 'two-phase-commit',
    domainId: 'coordination',
    citation: 'Gray, 1978',
    mechanism: 'Atomic Commit',
    name: 'Two-Phase Commit',
    navName: '2PC',
    description:
      'Watch a coordinator drive prepare/commit across participants and see how failures force aborts.',
    color: 'bg-green-600',
    emoji: '🔗',
    scenarios: twoPhaseCommitScenarios,
  },
  {
    id: 'distributed-transactions',
    domainId: 'coordination',
    citation: 'Garcia-Molina, 1987',
    mechanism: '3PC & Compensating Sagas',
    name: 'Distributed Transactions',
    description:
      'Compare 3PC commit flow with saga steps and compensations on failure.',
    color: 'bg-purple-700',
    emoji: '🧾',
    scenarios: distributedTransactionsScenarios,
  },
  {
    id: 'network-partitions',
    domainId: 'consensus',
    citation: 'Davidson et al., 1985',
    mechanism: 'Split-Brain Healing',
    name: 'Network Partitions',
    description:
      'Split the network, elect leaders per partition, then heal and resolve split-brain.',
    color: 'bg-red-700',
    emoji: '🕸️',
    scenarios: networkPartitionsScenarios,
  },
  {
    id: 'paxos',
    domainId: 'consensus',
    citation: 'Lamport, 1998',
    mechanism: 'Prepare / Accept Quorums',
    name: 'Paxos Consensus',
    navName: 'Paxos',
    description:
      'Follow proposers and acceptors through prepare/accept rounds to reach agreement despite competing proposals.',
    color: 'bg-purple-600',
    emoji: '🗳️',
    scenarios: paxosScenarios,
  },
  {
    id: 'raft',
    domainId: 'consensus',
    citation: 'Ongaro & Ousterhout, 2014',
    mechanism: 'Leader & Log Replication',
    name: 'Raft Consensus',
    description:
      'Pick a leader, replicate logs, and survive failures. See how Raft keeps nodes consistent during elections and recovery.',
    color: 'bg-blue-600',
    emoji: '🧭',
    scenarios: raftScenarios,
  },
  {
    id: 'consensus-variants',
    domainId: 'consensus',
    citation: 'Moraru et al., 2013',
    mechanism: 'Multi-Paxos & EPaxos',
    name: 'Consensus Variants',
    description:
      'Compare reconfiguration in Raft, stable leaders in Multi-Paxos, and EPaxos fast paths.',
    color: 'bg-indigo-700',
    emoji: '🧪',
    scenarios: consensusVariantsScenarios,
  },
  {
    id: 'pbft',
    domainId: 'consensus',
    citation: 'Castro & Liskov, 1999',
    mechanism: '3f + 1 Byzantine Quorum',
    name: 'PBFT',
    description:
      'Follow pre-prepare, prepare, and commit phases plus view changes under byzantine faults.',
    color: 'bg-rose-600',
    emoji: '🛡️',
    scenarios: pbftScenarios,
  },
];

export const CONCEPTS_CATALOG: ConceptCatalogEntry[] = RAW_CONCEPTS.map(buildEntry);

export const CONCEPTS_BY_ID: ReadonlyMap<string, ConceptCatalogEntry> = new Map(
  CONCEPTS_CATALOG.map((entry) => [entry.id, entry])
);

// Legacy display-name aliases to normalize older saved progress entries cleanly
const LEGACY_CONCEPT_NAME_MAP: ReadonlyMap<string, string> = new Map([
  ...CONCEPTS_CATALOG.map((entry): [string, string] => [entry.name.toLowerCase(), entry.id]),
  ['paxos', 'paxos'],
  ['2pc', 'two-phase-commit'],
  ['cap', 'cap-theorem'],
]);

export function normalizeConceptId(concept: string): string {
  const trimmed = concept.trim();
  if (CONCEPTS_BY_ID.has(trimmed)) {
    return trimmed;
  }
  const byAlias = LEGACY_CONCEPT_NAME_MAP.get(trimmed.toLowerCase());
  return byAlias ?? trimmed;
}

export const ALL_SCENARIO_KEYS: readonly string[] = CONCEPTS_CATALOG.flatMap(
  (entry) => entry.scenarioKeys
);

export const VALID_SCENARIO_KEYS: ReadonlySet<string> = new Set(ALL_SCENARIO_KEYS);

export const TOTAL_CONCEPTS = CONCEPTS_CATALOG.length;
export const TOTAL_SCENARIOS = ALL_SCENARIO_KEYS.length;
