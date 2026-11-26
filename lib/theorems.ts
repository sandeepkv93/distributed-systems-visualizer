import { CONCEPTS_CATALOG } from './catalog';

export type TheoremId =
  | 'flp'
  | 'cap-pacelc'
  | 'cft-2f1'
  | 'bft-3f1'
  | 'calm'
  | 'clock-sync';

export type SynchronyModel = 'asynchronous' | 'partial-sync' | 'synchronous';
export type FaultModel = 'none' | 'crash' | 'byzantine';
export type PacelcClass = 'PA/EL' | 'PA/EC' | 'PC/EL' | 'PC/EC';

export interface SystemAssumptions {
  synchrony: SynchronyModel;
  faultModel: FaultModel;
  partitioned: boolean;
  monotonic: boolean;
  nodes: number;
  faults: number;
}

export interface TheoremSpec {
  id: TheoremId;
  code: string;
  name: string;
  authors: string;
  year: number;
  formalStatement: string;
  plainEnglish: string;
  escapeHatch: string;
  conceptIds: string[];
  visualMode: 'flp-tree' | 'pacelc-matrix' | 'quorum-bounds' | 'calm-lattice';
  proofSketch: string[];
}

export interface TheoremEvaluation {
  theoremId: TheoremId;
  status: 'triggered' | 'circumvented' | 'satisfied';
  headline: string;
  explanation: string;
}

export interface SystemFeasibilitySummary {
  deterministicConsensusPossible: boolean;
  coordinationFreePossible: boolean;
  quorumSafetyHolds: boolean;
  minNodesRequired: number;
  evaluations: TheoremEvaluation[];
}

export interface PacelcSystem {
  id: string;
  name: string;
  classification: PacelcClass;
  partitionChoice: 'Availability (PA)' | 'Consistency (PC)';
  normalChoice: 'Low Latency (EL)' | 'Strong Consistency (EC)';
  notes: string;
  conceptId: string;
}

export const DEFAULT_ASSUMPTIONS: SystemAssumptions = {
  synchrony: 'asynchronous',
  faultModel: 'crash',
  partitioned: true,
  monotonic: false,
  nodes: 5,
  faults: 1,
};

export const THEOREMS: readonly TheoremSpec[] = [
  {
    id: 'flp',
    code: 'THM-01',
    name: 'FLP Impossibility',
    authors: 'Fischer, Lynch & Paterson',
    year: 1985,
    formalStatement:
      'In an asynchronous message-passing model with f ≥ 1 crash faults, no deterministic protocol guarantees Agreement, Validity, and Termination simultaneously.',
    plainEnglish:
      'If messages can be arbitrarily delayed, a node can never distinguish a crashed peer from a very slow peer—so an adversary can keep delaying the decisive message forever.',
    escapeHatch:
      'Adopt Partial Synchrony (Raft/Paxos timeouts after GST), randomize decisions (Ben-Or / HoneyBadger), or use unreliable failure detectors (◇S).',
    conceptIds: ['raft', 'paxos', 'failure-detectors'],
    visualMode: 'flp-tree',
    proofSketch: [
      'Assume a deterministic asynchronous consensus protocol exists that tolerates 1 crash.',
      'Prove at least one initial configuration C₀ is bivalent (both 0 and 1 remain reachable).',
      'Show every bivalent configuration C has a delaying schedule reaching another bivalent C′.',
      'By induction, an infinite fair execution never decides—contradicting Termination.',
    ],
  },
  {
    id: 'cap-pacelc',
    code: 'THM-02',
    name: 'CAP & PACELC Theorems',
    authors: 'Brewer (2000) · Gilbert & Lynch (2002) · Abadi (2012)',
    year: 2012,
    formalStatement:
      'If Partition (P), trade Availability (A) vs. Linearizability (C); Else (E), even without partitions, trade Latency (L) vs. Consistency (C).',
    plainEnglish:
      'Partitions force a hard stop-or-diverge choice, but day-to-day architecture is dominated by the E-branch: waiting for cross-DC consensus RTTs versus returning immediately from local replicas.',
    escapeHatch:
      'Partition data by tenant/key for local Raft groups, use causal/CRDT semantics for PA/EL workloads, or place consensus leaders near users.',
    conceptIds: ['cap-theorem', 'network-partitions', 'eventual-consistency'],
    visualMode: 'pacelc-matrix',
    proofSketch: [
      'Split cluster into disjoint halves G₁ and G₂ during a network partition.',
      'A write W(x=1) lands in G₁ while a read R(x) arrives at G₂.',
      'If G₂ responds immediately (Availability), it cannot observe W(x=1), violating Linearizability.',
      'Even with no partition (E), replicating synchronously across WAN adds at least 1 RTT of latency.',
    ],
  },
  {
    id: 'cft-2f1',
    code: 'THM-03',
    name: 'Crash Fault Quorum Bound (2f + 1)',
    authors: 'Lamport · Chandra & Toueg',
    year: 1996,
    formalStatement:
      'Tolerating f crash failures while guaranteeing safety and liveness requires N ≥ 2f + 1 replicas so any two majority quorums intersect in ≥ 1 replica.',
    plainEnglish:
      'With only 2f nodes, a 50/50 split lets neither side tell if the other half crashed or is merely partitioned—meaning you either stall or suffer split-brain.',
    escapeHatch:
      'Deploy odd cluster sizes (3, 5, 7) or add a lightweight witness/arbiter node to break even-node ties without storing full state.',
    conceptIds: ['quorum-replication', 'raft', 'paxos'],
    visualMode: 'quorum-bounds',
    proofSketch: [
      'Suppose N = 2f and partition the cluster into two equal halves of size f.',
      'Each half must make progress independently because the other f nodes might have crashed.',
      'Two disjoint halves can then commit conflicting decisions—violating Agreement.',
      'Therefore N ≥ 2f + 1 is strictly necessary and sufficient for crash-fault consensus.',
    ],
  },
  {
    id: 'bft-3f1',
    code: 'THM-04',
    name: 'Byzantine Fault Lower Bound (3f + 1)',
    authors: 'Lamport, Shostak & Pease (1982) · Bracha & Toueg (1985)',
    year: 1982,
    formalStatement:
      'Tolerating f arbitrary/equivocating replicas in partial synchrony requires N ≥ 3f + 1 replicas and quorum size Q = 2f + 1.',
    plainEnglish:
      'You must proceed without hearing from f slow/silent nodes, yet another f nodes inside the quorum that did reply may lie—so the remaining overlap must still contain at least one honest replica.',
    escapeHatch:
      'Restrict to crash-fault trust boundaries (2f + 1), or use hardware trusted execution environments (TEE attestations) to prevent equivocation.',
    conceptIds: ['pbft', 'consensus-variants'],
    visualMode: 'quorum-bounds',
    proofSketch: [
      'A quorum Q must be ≤ N − f so the system remains live when f Byzantine nodes go silent.',
      'Any two quorums Q₁ and Q₂ overlap in at least 2Q − N replicas.',
      'To prevent f equivocating replicas from bridging conflicting values, overlap must exceed f.',
      'Thus 2(N − f) − N > f ⇒ N > 3f ⇒ N ≥ 3f + 1.',
    ],
  },
  {
    id: 'calm',
    code: 'THM-05',
    name: 'CALM Theorem',
    authors: 'Hellerstein, Alvaro, Conway et al.',
    year: 2010,
    formalStatement:
      'A program has a consistent, coordination-free distributed implementation if and only if it is logically monotonic.',
    plainEnglish:
      'If adding more inputs can never retract earlier outputs (set union, counters, grow-only facts), replicas can merge in any order without locks or consensus. Non-monotonic checks ("account balance ≥ 0", "username unused") strictly require coordination.',
    escapeHatch:
      'Refactor hot paths into monotonic CRDT state + append-only events; isolate non-monotonic invariants (debits, uniqueness) into narrow consensus boundaries.',
    conceptIds: ['crdts', 'eventual-consistency', 'gossip-anti-entropy'],
    visualMode: 'calm-lattice',
    proofSketch: [
      'Monotonic operations form a join-semilattice (associative, commutative, idempotent).',
      'Message reordering or duplication cannot alter the least upper bound—zero coordination needed.',
      'Non-monotonic operations (negation, aggregation, deletion) depend on knowing all absent inputs.',
      'Observing absence in an open asynchronous system requires a synchronization barrier (consensus).',
    ],
  },
  {
    id: 'clock-sync',
    code: 'THM-06',
    name: 'Clock Synchronization Uncertainty Bound',
    authors: 'Lundelius & Lynch (1984) · Corbett et al. (2012)',
    year: 1984,
    formalStatement:
      'No algorithm can synchronize physical clocks tighter than half the asymmetric network delay jitter u/2; external consistency without coordination requires waiting 2ε.',
    plainEnglish:
      'Variable message delays make exact physical clock alignment impossible. Systems either track causality logically (Lamport/Vector/HLC) or pay a 2ε Commit-Wait penalty (Google Spanner TrueTime).',
    escapeHatch:
      'Use Hybrid Logical Clocks (HLC) to preserve causal order with zero wait, or bound ε via GPS/atomic clocks in controlled datacenters.',
    conceptIds: ['lamport-clocks', 'vector-clocks', 'chandy-lamport'],
    visualMode: 'calm-lattice',
    proofSketch: [
      'Round-trip time RTT = d_forward + d_return hides asymmetry between outbound and inbound hops.',
      'Two nodes exchanging timestamps cannot reduce clock offset error below (max_d − min_d) / 2.',
      'With bounded clock uncertainty ±ε, two events closer than 2ε have overlapping physical intervals.',
      'Spanner waits out 2ε before releasing commit locks so wall-clock order implies real-time order.',
    ],
  },
];

export const PACELC_SYSTEMS: readonly PacelcSystem[] = [
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB (Default)',
    classification: 'PA/EL',
    partitionChoice: 'Availability (PA)',
    normalChoice: 'Low Latency (EL)',
    notes: 'Eventual reads return immediately from nearest replica; strongly consistent reads opt into PC/EC per request.',
    conceptId: 'quorum-replication',
  },
  {
    id: 'cassandra',
    name: 'Apache Cassandra (CL=ONE)',
    classification: 'PA/EL',
    partitionChoice: 'Availability (PA)',
    normalChoice: 'Low Latency (EL)',
    notes: 'Leaderless sloppy quorums & hinted handoff prioritize write availability and single-hop latency.',
    conceptId: 'eventual-consistency',
  },
  {
    id: 'crdt-collab',
    name: 'CRDT Collaborative Store',
    classification: 'PA/EL',
    partitionChoice: 'Availability (PA)',
    normalChoice: 'Low Latency (EL)',
    notes: 'Local 0-RTT edits always succeed and merge deterministically via join-semilattice state.',
    conceptId: 'crdts',
  },
  {
    id: 'mongodb-default',
    name: 'MongoDB (Read Secondary)',
    classification: 'PA/EC',
    partitionChoice: 'Availability (PA)',
    normalChoice: 'Strong Consistency (EC)',
    notes: 'Can read stale secondaries during split while normally funneling writes through a single primary.',
    conceptId: 'replication-log',
  },
  {
    id: 'pnuts',
    name: 'Yahoo! PNUTS',
    classification: 'PC/EL',
    partitionChoice: 'Consistency (PC)',
    normalChoice: 'Low Latency (EL)',
    notes: 'Preserves per-record timeline consistency on partitions while serving low-latency local timeline reads in normal operation.',
    conceptId: 'replication-log',
  },
  {
    id: 'spanner',
    name: 'Google Spanner',
    classification: 'PC/EC',
    partitionChoice: 'Consistency (PC)',
    normalChoice: 'Strong Consistency (EC)',
    notes: 'Paxos groups + TrueTime 2ε Commit-Wait enforce strict external consistency in both normal and partitioned states.',
    conceptId: 'paxos',
  },
  {
    id: 'cockroachdb',
    name: 'CockroachDB',
    classification: 'PC/EC',
    partitionChoice: 'Consistency (PC)',
    normalChoice: 'Strong Consistency (EC)',
    notes: 'Multi-Raft ranges refuse minority writes under partition and pay consensus RTT on every committed write.',
    conceptId: 'raft',
  },
  {
    id: 'etcd',
    name: 'etcd / ZooKeeper',
    classification: 'PC/EC',
    partitionChoice: 'Consistency (PC)',
    normalChoice: 'Strong Consistency (EC)',
    notes: 'Linearizable Raft/Zab metadata store: sacrifices minority availability to guarantee single-leader lock safety.',
    conceptId: 'distributed-locking',
  },
];

export function evaluateSystemAssumptions(
  assumptions: SystemAssumptions
): SystemFeasibilitySummary {
  const { synchrony, faultModel, partitioned, monotonic, nodes, faults } = assumptions;

  const flpTriggered = synchrony === 'asynchronous' && faultModel !== 'none' && faults >= 1;
  const minNodesRequired =
    faultModel === 'none'
      ? 1
      : faultModel === 'byzantine'
      ? 3 * faults + 1
      : 2 * faults + 1;
  const quorumSafetyHolds = nodes >= minNodesRequired;
  const deterministicConsensusPossible = !flpTriggered && quorumSafetyHolds;
  const coordinationFreePossible = monotonic && faultModel !== 'byzantine';

  const evaluations: TheoremEvaluation[] = [
    {
      theoremId: 'flp',
      status: flpTriggered ? 'triggered' : 'circumvented',
      headline: flpTriggered
        ? 'TRIGGERED · Deterministic consensus impossible'
        : synchrony === 'partial-sync'
        ? 'CIRCUMVENTED · Partial synchrony (GST) restores liveness'
        : synchrony === 'synchronous'
        ? 'CIRCUMVENTED · Bounded Δ permits deterministic consensus'
        : 'SATISFIED · Fault-free model avoids adversary',
      explanation: flpTriggered
        ? `Asynchronous delivery with f=${faults} ${faultModel} fault(s) lets an adversary delay the decisive vote indefinitely.`
        : 'Timing bounds or randomized coin flips break the infinite bivalent schedule.',
    },
    {
      theoremId: 'cap-pacelc',
      status: partitioned ? 'triggered' : 'satisfied',
      headline: partitioned
        ? 'P-BRANCH ACTIVE · Must sacrifice A or C'
        : 'E-BRANCH ACTIVE · Trade Latency (L) vs Consistency (C)',
      explanation: partitioned
        ? 'Active network partition forbids simultaneous linearizability and 100% availability across isolated shards.'
        : 'Even with a healthy network, strong consistency pays cross-replica consensus RTTs (PC/EC vs PA/EL).',
    },
    {
      theoremId: 'cft-2f1',
      status:
        faultModel === 'crash' && nodes < 2 * faults + 1
          ? 'triggered'
          : 'satisfied',
      headline:
        nodes >= 2 * faults + 1
          ? `SATISFIED · N=${nodes} ≥ 2(${faults})+1=${2 * faults + 1}`
          : `VIOLATED · N=${nodes} < 2(${faults})+1=${2 * faults + 1}`,
      explanation:
        nodes >= 2 * faults + 1
          ? 'Majority quorums strictly intersect in at least 1 replica under crash faults.'
          : 'Insufficient replicas: a crash or split-brain can stall progress or fork committed history.',
    },
    {
      theoremId: 'bft-3f1',
      status:
        faultModel === 'byzantine' && nodes < 3 * faults + 1
          ? 'triggered'
          : faultModel === 'byzantine'
          ? 'satisfied'
          : 'circumvented',
      headline:
        faultModel !== 'byzantine'
          ? 'NOT REQUIRED · Crash-only trust boundary'
          : nodes >= 3 * faults + 1
          ? `SATISFIED · N=${nodes} ≥ 3(${faults})+1=${3 * faults + 1}`
          : `VIOLATED · N=${nodes} < 3(${faults})+1=${3 * faults + 1}`,
      explanation:
        faultModel !== 'byzantine'
          ? 'Assuming non-malicious nodes lowers the replication bound from 3f+1 to 2f+1.'
          : nodes >= 3 * faults + 1
          ? 'Any two 2f+1 quorums overlap in at least f+1 nodes, guaranteeing ≥1 honest witness.'
          : 'Equivocating Byzantine nodes can convince two quorums to commit contradictory blocks.',
    },
    {
      theoremId: 'calm',
      status: monotonic ? 'satisfied' : 'triggered',
      headline: monotonic
        ? 'COORDINATION-FREE · Monotonic program converges without locks'
        : 'COORDINATION REQUIRED · Non-monotonic logic needs consensus',
      explanation: monotonic
        ? 'Monotonic semilattice operations (CRDTs, append-only sets) converge deterministically regardless of network delay or partition.'
        : 'Non-monotonic checks (uniqueness, balance ≥ 0, deletes) require waiting for a global consensus barrier.',
    },
    {
      theoremId: 'clock-sync',
      status: synchrony === 'synchronous' ? 'circumvented' : 'triggered',
      headline:
        synchrony === 'synchronous'
          ? 'BOUNDED · Known Δ bounds physical clock skew'
          : 'UNBOUNDED DRIFT · Wall clocks cannot establish causality',
      explanation:
        synchrony === 'synchronous'
          ? 'Tight delay bounds limit clock uncertainty ε, enabling deterministic timestamp ordering.'
          : 'Unbounded asymmetric jitter requires Lamport/Vector/HLC logical clocks or TrueTime 2ε Commit-Wait.',
    },
  ];

  return {
    deterministicConsensusPossible,
    coordinationFreePossible,
    quorumSafetyHolds,
    minNodesRequired,
    evaluations,
  };
}

export function getTheoremById(id: string): TheoremSpec {
  return THEOREMS.find((t) => t.id === id) ?? THEOREMS[0];
}

export function getConceptPath(conceptId: string): string {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId)?.path ?? '/';
}
