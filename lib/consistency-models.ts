export type ConsistencyModelId =
  | 'linearizability'
  | 'sequential'
  | 'causal'
  | 'read-your-writes'
  | 'monotonic-reads'
  | 'eventual';

export type AnomalyVerdict = 'forbidden' | 'permitted';

export interface ConsistencyModelSpec {
  id: ConsistencyModelId;
  rank: number;
  name: string;
  shortName: string;
  citation: string;
  guarantee: string;
  costSummary: string;
  enforcingConceptIds: readonly string[];
}

export interface ExecutionOp {
  id: string;
  client: string;
  label: string;
  kind: 'write' | 'read' | 'anomaly';
  start: number; // 0..100 timeline percentage
  end: number;   // 0..100 timeline percentage
  replica?: string;
}

export interface CausalLink {
  fromOpId: string;
  toOpId: string;
  label: string;
}

export interface ConsistencyAnomaly {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  clients: readonly string[];
  operations: readonly ExecutionOp[];
  causalLinks?: readonly CausalLink[];
  verdicts: Readonly<Record<ConsistencyModelId, AnomalyVerdict>>;
  whyItHappens: string;
  howToPrevent: string;
  enforcingConceptIds: readonly string[];
}

export const CONSISTENCY_MODELS: readonly ConsistencyModelSpec[] = [
  {
    id: 'linearizability',
    rank: 1,
    name: 'Linearizability',
    shortName: 'Linearizable',
    citation: 'Herlihy & Wing 1990',
    guarantee: 'Every operation appears to take effect atomically at a single point between its invocation and response in real time.',
    costSummary: 'Requires consensus or strict quorum coordination; sacrifices availability under network partition (CP).',
    enforcingConceptIds: ['raft', 'paxos', 'quorum-replication'],
  },
  {
    id: 'sequential',
    rank: 2,
    name: 'Sequential Consistency',
    shortName: 'Sequential',
    citation: 'Lamport 1979',
    guarantee: 'All processes observe the same global total order of operations, preserving each process’s local program order (no real-time bound).',
    costSummary: 'Avoids wall-clock real-time sync, but still requires global write ordering across replicas.',
    enforcingConceptIds: ['raft', 'replication-log'],
  },
  {
    id: 'causal',
    rank: 3,
    name: 'Causal Consistency',
    shortName: 'Causal',
    citation: 'Ahamad et al. 1995',
    guarantee: 'Causally related operations (a -> b) are seen in the same order everywhere; concurrent writes may appear in different orders.',
    costSummary: 'Strongest model achievable while remaining available under partitions (AP + causal metadata).',
    enforcingConceptIds: ['vector-clocks', 'crdts'],
  },
  {
    id: 'read-your-writes',
    rank: 4,
    name: 'Read-Your-Writes',
    shortName: 'RYW Session',
    citation: 'Terry et al. 1994',
    guarantee: 'A client’s own reads always reflect all writes previously completed by that same client session.',
    costSummary: 'Achievable via sticky primary routing or minimum-version session tokens without cross-client coordination.',
    enforcingConceptIds: ['replication-log', 'quorum-replication'],
  },
  {
    id: 'monotonic-reads',
    rank: 5,
    name: 'Monotonic Reads',
    shortName: 'Monotonic Reads',
    citation: 'Terry et al. 1994',
    guarantee: 'Once a client observes state version v, subsequent reads by that client will never return an older version < v.',
    costSummary: 'Achievable via sticky replica affinity or client-tracked version watermarks.',
    enforcingConceptIds: ['eventual-consistency', 'replication-log'],
  },
  {
    id: 'eventual',
    rank: 6,
    name: 'Eventual Consistency',
    shortName: 'Eventual',
    citation: 'Vogels 2009',
    guarantee: 'If no new updates arrive for a key, all healthy replicas eventually converge to the identical value.',
    costSummary: '0-RTT local reads & writes with maximum availability; requires anti-entropy or CRDT merge for convergence.',
    enforcingConceptIds: ['eventual-consistency', 'gossip-anti-entropy', 'merkle-anti-entropy', 'crdts'],
  },
] as const;

export const CONSISTENCY_ANOMALIES: readonly ConsistencyAnomaly[] = [
  {
    id: 'stale-read-realtime',
    number: '01',
    title: 'Real-Time Stale Read',
    subtitle: 'Separates Linearizability from Sequential Consistency',
    clients: ['Client A', 'Client B'],
    operations: [
      { id: 'op1', client: 'Client A', label: 'W(x, 1) -> ok', kind: 'write', start: 8, end: 36, replica: 'Leader' },
      { id: 'op2', client: 'Client B', label: 'R(x) -> 0 (stale)', kind: 'anomaly', start: 54, end: 84, replica: 'Async Follower' },
    ],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'permitted',
      causal: 'permitted',
      'read-your-writes': 'permitted',
      'monotonic-reads': 'permitted',
      eventual: 'permitted',
    },
    whyItHappens:
      'Client B starts its read strictly after Client A’s write completed in wall-clock time, yet hits a lagging follower that still holds x=0. Sequential consistency permits this because Client B had no causal link to A (the global order [R(x)->0, W(x,1)] is valid), whereas Linearizability forbids returning 0 once W(x,1) returned.',
    howToPrevent:
      'Serve reads through a linearizable Raft ReadIndex / leader lease or enforce strict Dynamo quorum overlap (W + R > N) with synchronous read repair.',
    enforcingConceptIds: ['raft', 'quorum-replication', 'cap-theorem'],
  },
  {
    id: 'concurrent-write-divergence',
    number: '02',
    title: 'Concurrent Write Divergence',
    subtitle: 'Separates Sequential Consistency from Causal Consistency',
    clients: ['Client A', 'Client B', 'Client C', 'Client D'],
    operations: [
      { id: 'cw1', client: 'Client A', label: 'W(x, 1)', kind: 'write', start: 8, end: 30, replica: 'DC-West' },
      { id: 'cw2', client: 'Client B', label: 'W(x, 2)', kind: 'write', start: 12, end: 34, replica: 'DC-East' },
      { id: 'cw3', client: 'Client C', label: 'R(x) -> 1', kind: 'read', start: 44, end: 64, replica: 'DC-West' },
      { id: 'cw4', client: 'Client C', label: 'R(x) -> 2', kind: 'anomaly', start: 70, end: 90, replica: 'DC-West' },
      { id: 'cw5', client: 'Client D', label: 'R(x) -> 2', kind: 'read', start: 46, end: 66, replica: 'DC-East' },
      { id: 'cw6', client: 'Client D', label: 'R(x) -> 1', kind: 'anomaly', start: 72, end: 92, replica: 'DC-East' },
    ],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'forbidden',
      causal: 'permitted',
      'read-your-writes': 'permitted',
      'monotonic-reads': 'permitted',
      eventual: 'permitted',
    },
    whyItHappens:
      'W(x,1) and W(x,2) are causally concurrent (neither happened-before the other). Causal consistency permits DC-West and DC-East to apply them in opposite orders (C sees 1 then 2; D sees 2 then 1), whereas Sequential and Linearizable systems require a single total write order agreed on by all observers.',
    howToPrevent:
      'Order all writes through a single Raft/Paxos consensus log, or use deterministic conflict resolution (e.g., join-semilattice CRDTs) if concurrent multi-region writes are required.',
    enforcingConceptIds: ['raft', 'paxos', 'crdts'],
  },
  {
    id: 'causal-inversion',
    number: '03',
    title: 'Causal Inversion (Reply Before Question)',
    subtitle: 'Separates Causal Consistency from Session & Eventual Models',
    clients: ['Alice', 'Bob', 'Carol'],
    operations: [
      { id: 'ci1', client: 'Alice', label: 'W(q, "Why?")', kind: 'write', start: 6, end: 22, replica: 'R1' },
      { id: 'ci2', client: 'Bob', label: 'R(q) -> "Why?"', kind: 'read', start: 26, end: 42, replica: 'R1' },
      { id: 'ci3', client: 'Bob', label: 'W(a, "Because")', kind: 'write', start: 46, end: 62, replica: 'R2' },
      { id: 'ci4', client: 'Carol', label: 'R(a) -> "Because"', kind: 'read', start: 66, end: 80, replica: 'R2' },
      { id: 'ci5', client: 'Carol', label: 'R(q) -> null', kind: 'anomaly', start: 82, end: 96, replica: 'R3' },
    ],
    causalLinks: [
      { fromOpId: 'ci1', toOpId: 'ci2', label: 'a -> b' },
      { fromOpId: 'ci3', toOpId: 'ci4', label: 'b -> c' },
    ],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'forbidden',
      causal: 'forbidden',
      'read-your-writes': 'permitted',
      'monotonic-reads': 'permitted',
      eventual: 'permitted',
    },
    whyItHappens:
      'Bob’s answer causally depends on Alice’s question (W(q) -> R(q) -> W(a)). Because async replication delivers W(a) to Carol’s replica before W(q), Carol sees the reply without the question. Neither RYW nor Monotonic Reads catches this because Carol wrote nothing and only read each key once.',
    howToPrevent:
      'Attach Vector Clocks / causal dependency metadata to updates and buffer delivery of W(a) on replica R3 until all causal dependencies (W(q)) have been applied.',
    enforcingConceptIds: ['vector-clocks', 'lamport-clocks', 'raft'],
  },
  {
    id: 'ryw-violation',
    number: '04',
    title: 'Read-Your-Writes Violation',
    subtitle: 'User updates profile on primary, refreshes onto stale replica',
    clients: ['User Session'],
    operations: [
      { id: 'ryw1', client: 'User Session', label: 'W(bio, "v2") -> ok', kind: 'write', start: 12, end: 40, replica: 'Primary' },
      { id: 'ryw2', client: 'User Session', label: 'R(bio) -> "v1" (missing own write)', kind: 'anomaly', start: 56, end: 86, replica: 'Replica-B' },
    ],
    causalLinks: [{ fromOpId: 'ryw1', toOpId: 'ryw2', label: 'program order' }],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'forbidden',
      causal: 'forbidden',
      'read-your-writes': 'forbidden',
      'monotonic-reads': 'permitted',
      eventual: 'permitted',
    },
    whyItHappens:
      'The user writes to the primary, receives 200 OK, and immediately reloads the page; a load balancer routes the read to an asynchronous follower that has not yet replayed the WAL offset. Monotonic Reads is not violated (this is the first read), but Read-Your-Writes is broken.',
    howToPrevent:
      'Return the leader’s commit LSN/offset on write and require replicas to catch up to that LSN before serving the client’s next read, or pin recent writers to the primary.',
    enforcingConceptIds: ['replication-log', 'quorum-replication', 'load-balancing'],
  },
  {
    id: 'monotonic-read-regression',
    number: '05',
    title: 'Monotonic Read Regression',
    subtitle: 'Client observes v2 on a fresh replica, then regresses to v1',
    clients: ['Writer', 'Reader'],
    operations: [
      { id: 'mr1', client: 'Writer', label: 'W(status, "Shipped")', kind: 'write', start: 8, end: 28, replica: 'Primary' },
      { id: 'mr2', client: 'Reader', label: 'R(status) -> "Shipped"', kind: 'read', start: 36, end: 58, replica: 'Replica-1 (fresh)' },
      { id: 'mr3', client: 'Reader', label: 'R(status) -> "Pending"', kind: 'anomaly', start: 66, end: 92, replica: 'Replica-2 (lagging)' },
    ],
    causalLinks: [{ fromOpId: 'mr2', toOpId: 'mr3', label: 'session regression' }],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'forbidden',
      causal: 'forbidden',
      'read-your-writes': 'permitted',
      'monotonic-reads': 'forbidden',
      eventual: 'permitted',
    },
    whyItHappens:
      'A stateless round-robin load balancer sends the Reader’s first GET to an up-to-date follower and the second GET to a lagging follower—causing UI state to visibly jump backward in time. Read-Your-Writes is vacuously satisfied because the Reader never issued a write.',
    howToPrevent:
      'Route each client session consistently to the same replica via session affinity or pass a client-side minimum-version watermark that rejects stale followers.',
    enforcingConceptIds: ['eventual-consistency', 'replication-log', 'load-balancing'],
  },
  {
    id: 'permanent-divergence',
    number: '06',
    title: 'Permanent Replica Divergence',
    subtitle: 'Dropped gossip/sync breaks even Eventual Consistency',
    clients: ['Replica R1', 'Replica R2'],
    operations: [
      { id: 'pd1', client: 'Replica R1', label: 'Local W(k, "A")', kind: 'write', start: 8, end: 28, replica: 'R1' },
      { id: 'pd2', client: 'Replica R2', label: 'Local W(k, "B")', kind: 'write', start: 10, end: 30, replica: 'R2' },
      { id: 'pd3', client: 'Replica R1', label: 'Quiescent R(k) -> "A" forever', kind: 'anomaly', start: 58, end: 92, replica: 'R1' },
      { id: 'pd4', client: 'Replica R2', label: 'Quiescent R(k) -> "B" forever', kind: 'anomaly', start: 58, end: 92, replica: 'R2' },
    ],
    verdicts: {
      linearizability: 'forbidden',
      sequential: 'forbidden',
      causal: 'forbidden',
      'read-your-writes': 'forbidden',
      'monotonic-reads': 'forbidden',
      eventual: 'forbidden',
    },
    whyItHappens:
      'If two replicas accept concurrent local writes during a partition and lack deterministic conflict resolution + background anti-entropy repair, their states remain permanently split even after all writes stop and the network heals—violating even Eventual Consistency.',
    howToPrevent:
      'Run periodic Merkle Tree / Gossip anti-entropy repair paired with deterministic merge semantics (CRDT join-semilattices or version-vector reconciliation).',
    enforcingConceptIds: ['merkle-anti-entropy', 'gossip-anti-entropy', 'crdts'],
  },
] as const;

export function getConsistencyAnomalyById(id?: string | null): ConsistencyAnomaly {
  if (!id) return CONSISTENCY_ANOMALIES[0];
  return CONSISTENCY_ANOMALIES.find((a) => a.id === id) ?? CONSISTENCY_ANOMALIES[0];
}
