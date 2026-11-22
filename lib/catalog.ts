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

export interface ConceptCatalogEntry {
  id: string;
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
  name: string;
  navName?: string;
  description: string;
  color: string;
  emoji: string;
  scenarios?: Scenario[];
}

function buildEntry(meta: ConceptMetadata): ConceptCatalogEntry {
  const scenarios = meta.scenarios ?? [];
  return {
    id: meta.id,
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

export const CONCEPTS_CATALOG: ConceptCatalogEntry[] = [
  buildEntry({
    id: 'cap-theorem',
    name: 'CAP Theorem',
    description:
      'Explore trade-offs among Consistency, Availability, and Partition Tolerance with real systems.',
    color: 'bg-pink-600',
    emoji: '🔺',
  }),
  buildEntry({
    id: 'lamport-clocks',
    name: 'Lamport Clocks',
    description:
      'Understand logical clocks and total-order delivery using broadcasts and acknowledgements.',
    color: 'bg-teal-600',
    emoji: '⏱️',
    scenarios: lamportClocksScenarios,
  }),
  buildEntry({
    id: 'vector-clocks',
    name: 'Vector Clocks',
    description:
      'Track causality, detect concurrency, and compare event orderings with vector clocks.',
    color: 'bg-red-600',
    emoji: '🧭',
    scenarios: vectorClockScenarios,
  }),
  buildEntry({
    id: 'chandy-lamport',
    name: 'Chandy-Lamport Snapshot',
    description:
      'Trace marker messages to record local state and in-flight messages for a global snapshot.',
    color: 'bg-cyan-600',
    emoji: '📸',
    scenarios: chandyLamportScenarios,
  }),
  buildEntry({
    id: 'eventual-consistency',
    name: 'Eventual Consistency',
    description:
      'Write with ONE/QUORUM/ALL and observe replication, conflict, and anti-entropy convergence.',
    color: 'bg-yellow-600',
    emoji: '🌐',
    scenarios: eventualConsistencyScenarios,
  }),
  buildEntry({
    id: 'crdts',
    name: 'CRDTs',
    description:
      'Explore G-Counter, OR-Set, and RGA to see conflict-free merges across replicas.',
    color: 'bg-emerald-700',
    emoji: '🧮',
    scenarios: crdtScenarios,
  }),
  buildEntry({
    id: 'gossip-anti-entropy',
    name: 'Gossip & Anti-Entropy',
    description:
      'Push, pull, and push-pull rounds spread updates across nodes without a central coordinator.',
    color: 'bg-emerald-600',
    emoji: '🫧',
    scenarios: gossipAntiEntropyScenarios,
  }),
  buildEntry({
    id: 'merkle-anti-entropy',
    name: 'Merkle Anti-Entropy',
    description:
      'Use Merkle trees to pinpoint divergence and sync only the necessary keys.',
    color: 'bg-sky-600',
    emoji: '🌳',
    scenarios: merkleAntiEntropyScenarios,
  }),
  buildEntry({
    id: 'quorum-replication',
    name: 'Quorum Replication',
    description:
      'Tune W/R quorums and watch read-repair fix stale replicas after failures.',
    color: 'bg-orange-600',
    emoji: '⚖️',
    scenarios: quorumReplicationScenarios,
  }),
  buildEntry({
    id: 'replication-log',
    name: 'Replication Log',
    description:
      'Track a leader and ISR followers, see high-watermarks advance, and observe lag.',
    color: 'bg-slate-600',
    emoji: '📜',
    scenarios: replicationLogScenarios,
  }),
  buildEntry({
    id: 'failure-detectors',
    name: 'Failure Detectors',
    description:
      'Watch phi accrual and SWIM probes move nodes through alive, suspect, and failed.',
    color: 'bg-orange-700',
    emoji: '🚨',
    scenarios: failureDetectorScenarios,
  }),
  buildEntry({
    id: 'consistent-hashing',
    name: 'Consistent Hashing',
    description:
      'Distribute keys across a ring and see how virtual nodes minimize reshuffling.',
    color: 'bg-indigo-600',
    emoji: '🧿',
    scenarios: consistentHashingScenarios,
  }),
  buildEntry({
    id: 'sharding-rebalancing',
    name: 'Sharding + Rebalancing',
    description:
      'Compare range vs hash sharding and watch shard movement as nodes join or leave.',
    color: 'bg-cyan-700',
    emoji: '🧩',
    scenarios: shardingRebalancingScenarios,
  }),
  buildEntry({
    id: 'load-balancing',
    name: 'Load Balancing',
    description:
      'Route requests across workers, trigger backpressure, and see drops under load.',
    color: 'bg-amber-700',
    emoji: '🚦',
    scenarios: loadBalancingScenarios,
  }),
  buildEntry({
    id: 'distributed-locking',
    name: 'Distributed Locking',
    description:
      'Acquire a lease, renew via heartbeats, and see timeouts trigger failover.',
    color: 'bg-lime-600',
    emoji: '🔒',
    scenarios: distributedLockingScenarios,
  }),
  buildEntry({
    id: 'two-phase-commit',
    name: 'Two-Phase Commit',
    navName: '2PC',
    description:
      'Watch a coordinator drive prepare/commit across participants and see how failures force aborts.',
    color: 'bg-green-600',
    emoji: '🔗',
    scenarios: twoPhaseCommitScenarios,
  }),
  buildEntry({
    id: 'distributed-transactions',
    name: 'Distributed Transactions',
    description:
      'Compare 3PC commit flow with saga steps and compensations on failure.',
    color: 'bg-purple-700',
    emoji: '🧾',
    scenarios: distributedTransactionsScenarios,
  }),
  buildEntry({
    id: 'network-partitions',
    name: 'Network Partitions',
    description:
      'Split the network, elect leaders per partition, then heal and resolve split-brain.',
    color: 'bg-red-700',
    emoji: '🕸️',
    scenarios: networkPartitionsScenarios,
  }),
  buildEntry({
    id: 'paxos',
    name: 'Paxos Consensus',
    navName: 'Paxos',
    description:
      'Follow proposers and acceptors through prepare/accept rounds to reach agreement despite competing proposals.',
    color: 'bg-purple-600',
    emoji: '🗳️',
    scenarios: paxosScenarios,
  }),
  buildEntry({
    id: 'raft',
    name: 'Raft Consensus',
    description:
      'Pick a leader, replicate logs, and survive failures. See how Raft keeps nodes consistent during elections and recovery.',
    color: 'bg-blue-600',
    emoji: '🧭',
    scenarios: raftScenarios,
  }),
  buildEntry({
    id: 'consensus-variants',
    name: 'Consensus Variants',
    description:
      'Compare reconfiguration in Raft, stable leaders in Multi-Paxos, and EPaxos fast paths.',
    color: 'bg-indigo-700',
    emoji: '🧪',
    scenarios: consensusVariantsScenarios,
  }),
  buildEntry({
    id: 'pbft',
    name: 'PBFT',
    description:
      'Follow pre-prepare, prepare, and commit phases plus view changes under byzantine faults.',
    color: 'bg-rose-600',
    emoji: '🛡️',
    scenarios: pbftScenarios,
  }),
];

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
