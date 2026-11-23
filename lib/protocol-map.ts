import { CONCEPTS_BY_ID, ConceptCatalogEntry } from './catalog';

export type MapRelationType = 'builds-on' | 'extends' | 'trade-off' | 'uses';

export interface ProtocolMapNode {
  conceptId: string;
  shortLabel: string;
  tier: 1 | 2 | 3 | 4;
  x: number;
  y: number;
}

export interface ProtocolMapEdge {
  from: string;
  to: string;
  relation: MapRelationType;
  label: string;
}

export const MAP_TIERS: readonly { tier: 1 | 2 | 3 | 4; x: number; label: string }[] = [
  { tier: 1, x: 145, label: '01 · FOUNDATIONS' },
  { tier: 2, x: 440, label: '02 · PRIMITIVES' },
  { tier: 3, x: 740, label: '03 · CORE PROTOCOLS' },
  { tier: 4, x: 1035, label: '04 · COORDINATION & VARIANTS' },
] as const;

export const PROTOCOL_MAP_NODES: readonly ProtocolMapNode[] = [
  // Tier 1 — Foundations (5)
  { conceptId: 'lamport-clocks', shortLabel: 'Lamport Clocks', tier: 1, x: 145, y: 120 },
  { conceptId: 'vector-clocks', shortLabel: 'Vector Clocks', tier: 1, x: 145, y: 250 },
  { conceptId: 'cap-theorem', shortLabel: 'CAP Theorem', tier: 1, x: 145, y: 380 },
  { conceptId: 'failure-detectors', shortLabel: 'Failure Detectors', tier: 1, x: 145, y: 510 },
  { conceptId: 'consistent-hashing', shortLabel: 'Consistent Hash', tier: 1, x: 145, y: 640 },

  // Tier 2 — Core Primitives (6)
  { conceptId: 'chandy-lamport', shortLabel: 'Chandy-Lamport', tier: 2, x: 440, y: 95 },
  { conceptId: 'gossip-anti-entropy', shortLabel: 'Gossip Sync', tier: 2, x: 440, y: 209 },
  { conceptId: 'eventual-consistency', shortLabel: 'Eventual Cons.', tier: 2, x: 440, y: 323 },
  { conceptId: 'quorum-replication', shortLabel: 'Quorum Repl.', tier: 2, x: 440, y: 437 },
  { conceptId: 'network-partitions', shortLabel: 'Net Partitions', tier: 2, x: 440, y: 551 },
  { conceptId: 'sharding-rebalancing', shortLabel: 'Sharding', tier: 2, x: 440, y: 665 },

  // Tier 3 — Protocols & Storage Engines (6)
  { conceptId: 'crdts', shortLabel: 'CRDTs', tier: 3, x: 740, y: 95 },
  { conceptId: 'merkle-anti-entropy', shortLabel: 'Merkle Diff', tier: 3, x: 740, y: 209 },
  { conceptId: 'replication-log', shortLabel: 'Replication Log', tier: 3, x: 740, y: 323 },
  { conceptId: 'paxos', shortLabel: 'Paxos', tier: 3, x: 740, y: 437 },
  { conceptId: 'raft', shortLabel: 'Raft', tier: 3, x: 740, y: 551 },
  { conceptId: 'load-balancing', shortLabel: 'Load Balancing', tier: 3, x: 740, y: 665 },

  // Tier 4 — Coordination & Advanced Systems (5)
  { conceptId: 'distributed-locking', shortLabel: 'Dist. Locking', tier: 4, x: 1035, y: 120 },
  { conceptId: 'two-phase-commit', shortLabel: 'Two-Phase Commit', tier: 4, x: 1035, y: 250 },
  { conceptId: 'distributed-transactions', shortLabel: '3PC & Sagas', tier: 4, x: 1035, y: 380 },
  { conceptId: 'consensus-variants', shortLabel: 'Multi-Paxos / EPaxos', tier: 4, x: 1035, y: 510 },
  { conceptId: 'pbft', shortLabel: 'PBFT', tier: 4, x: 1035, y: 640 },
] as const;

export const PROTOCOL_MAP_EDGES: readonly ProtocolMapEdge[] = [
  // Time & Causality lineage
  { from: 'lamport-clocks', to: 'vector-clocks', relation: 'extends', label: 'Partial order' },
  { from: 'lamport-clocks', to: 'chandy-lamport', relation: 'builds-on', label: 'Causal cuts' },
  { from: 'vector-clocks', to: 'eventual-consistency', relation: 'uses', label: 'Conflict detection' },
  { from: 'vector-clocks', to: 'crdts', relation: 'builds-on', label: 'Lattice clocks' },
  { from: 'chandy-lamport', to: 'replication-log', relation: 'uses', label: 'Checkpoints' },

  // CAP & Replication lineage
  { from: 'cap-theorem', to: 'eventual-consistency', relation: 'trade-off', label: 'AP design' },
  { from: 'cap-theorem', to: 'quorum-replication', relation: 'trade-off', label: 'Tunable W+R' },
  { from: 'cap-theorem', to: 'network-partitions', relation: 'trade-off', label: 'P forces C vs A' },
  { from: 'eventual-consistency', to: 'crdts', relation: 'extends', label: 'Strong eventual' },
  { from: 'eventual-consistency', to: 'merkle-anti-entropy', relation: 'uses', label: 'Background repair' },
  { from: 'gossip-anti-entropy', to: 'merkle-anti-entropy', relation: 'uses', label: 'Digest diffing' },
  { from: 'gossip-anti-entropy', to: 'crdts', relation: 'uses', label: 'State dissemination' },
  { from: 'quorum-replication', to: 'replication-log', relation: 'extends', label: 'Ordered ISR log' },
  { from: 'quorum-replication', to: 'paxos', relation: 'builds-on', label: 'Quorum intersection' },

  // Failure detection & Consensus lineage
  { from: 'failure-detectors', to: 'gossip-anti-entropy', relation: 'uses', label: 'SWIM dissemination' },
  { from: 'failure-detectors', to: 'network-partitions', relation: 'builds-on', label: 'Suspect vs split' },
  { from: 'failure-detectors', to: 'raft', relation: 'uses', label: 'Election timeouts' },
  { from: 'network-partitions', to: 'paxos', relation: 'builds-on', label: 'Safety under split' },
  { from: 'network-partitions', to: 'raft', relation: 'builds-on', label: 'Majority quorum' },
  { from: 'paxos', to: 'raft', relation: 'extends', label: 'Understandable log' },
  { from: 'paxos', to: 'consensus-variants', relation: 'extends', label: 'Multi-Paxos / EPaxos' },
  { from: 'raft', to: 'consensus-variants', relation: 'extends', label: 'Joint consensus' },
  { from: 'paxos', to: 'pbft', relation: 'extends', label: 'Byzantine 3f+1' },

  // Partitioning & Routing lineage
  { from: 'consistent-hashing', to: 'quorum-replication', relation: 'uses', label: 'Preference lists' },
  { from: 'consistent-hashing', to: 'sharding-rebalancing', relation: 'builds-on', label: 'Ring placement' },
  { from: 'sharding-rebalancing', to: 'load-balancing', relation: 'uses', label: 'Hotspot shedding' },
  { from: 'failure-detectors', to: 'load-balancing', relation: 'uses', label: 'Health checks' },

  // Coordination & Transactions lineage
  { from: 'raft', to: 'distributed-locking', relation: 'builds-on', label: 'Fenced leases' },
  { from: 'replication-log', to: 'distributed-locking', relation: 'uses', label: 'Monotonic epochs' },
  { from: 'raft', to: 'two-phase-commit', relation: 'uses', label: 'Durable coordinator' },
  { from: 'replication-log', to: 'two-phase-commit', relation: 'uses', label: 'Write-ahead log' },
  { from: 'two-phase-commit', to: 'distributed-transactions', relation: 'extends', label: '3PC & Sagas' },
  { from: 'distributed-locking', to: 'two-phase-commit', relation: 'uses', label: 'Row locks' },
] as const;

export const PROTOCOL_MAP_NODES_BY_ID: ReadonlyMap<string, ProtocolMapNode> = new Map(
  PROTOCOL_MAP_NODES.map((node) => [node.conceptId, node])
);

export function getUpstreamIds(conceptId: string): string[] {
  return PROTOCOL_MAP_EDGES.filter((e) => e.to === conceptId).map((e) => e.from);
}

export function getDownstreamIds(conceptId: string): string[] {
  return PROTOCOL_MAP_EDGES.filter((e) => e.from === conceptId).map((e) => e.to);
}

export function getEdgesForConcept(conceptId: string): readonly ProtocolMapEdge[] {
  return PROTOCOL_MAP_EDGES.filter((e) => e.from === conceptId || e.to === conceptId);
}

export function getConceptEntry(conceptId: string): ConceptCatalogEntry | null {
  return CONCEPTS_BY_ID.get(conceptId) ?? null;
}
