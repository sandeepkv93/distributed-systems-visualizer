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
  path: string;
  scenarios: Scenario[];
  scenarioKeys: string[];
}

export function getScenarioKey(conceptId: string, scenarioId: string): string {
  return `${conceptId}:${scenarioId}`;
}

function buildEntry(
  id: string,
  name: string,
  scenarios: Scenario[] = []
): ConceptCatalogEntry {
  return {
    id,
    name,
    path: `/${id}`,
    scenarios,
    scenarioKeys: scenarios.map((scenario) => getScenarioKey(id, scenario.id)),
  };
}

export const CONCEPTS_CATALOG: ConceptCatalogEntry[] = [
  buildEntry('cap-theorem', 'CAP Theorem'),
  buildEntry('lamport-clocks', 'Lamport Clocks', lamportClocksScenarios),
  buildEntry('vector-clocks', 'Vector Clocks', vectorClockScenarios),
  buildEntry('chandy-lamport', 'Chandy-Lamport Snapshot', chandyLamportScenarios),
  buildEntry('eventual-consistency', 'Eventual Consistency', eventualConsistencyScenarios),
  buildEntry('crdts', 'CRDTs', crdtScenarios),
  buildEntry('gossip-anti-entropy', 'Gossip & Anti-Entropy', gossipAntiEntropyScenarios),
  buildEntry('merkle-anti-entropy', 'Merkle Anti-Entropy', merkleAntiEntropyScenarios),
  buildEntry('quorum-replication', 'Quorum Replication', quorumReplicationScenarios),
  buildEntry('replication-log', 'Replication Log', replicationLogScenarios),
  buildEntry('failure-detectors', 'Failure Detectors', failureDetectorScenarios),
  buildEntry('consistent-hashing', 'Consistent Hashing', consistentHashingScenarios),
  buildEntry('sharding-rebalancing', 'Sharding + Rebalancing', shardingRebalancingScenarios),
  buildEntry('load-balancing', 'Load Balancing', loadBalancingScenarios),
  buildEntry('distributed-locking', 'Distributed Locking', distributedLockingScenarios),
  buildEntry('two-phase-commit', 'Two-Phase Commit', twoPhaseCommitScenarios),
  buildEntry('distributed-transactions', 'Distributed Transactions', distributedTransactionsScenarios),
  buildEntry('network-partitions', 'Network Partitions', networkPartitionsScenarios),
  buildEntry('paxos', 'Paxos Consensus', paxosScenarios),
  buildEntry('raft', 'Raft Consensus', raftScenarios),
  buildEntry('consensus-variants', 'Consensus Variants', consensusVariantsScenarios),
  buildEntry('pbft', 'PBFT', pbftScenarios),
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
