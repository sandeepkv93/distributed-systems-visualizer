export type DuelId =
  | 'raft-vs-paxos'
  | '2pc-vs-saga'
  | 'lamport-vs-vector'
  | 'quorum-vs-crdts'
  | 'hashing-vs-sharding'
  | 'raft-vs-pbft';

export interface DuelStepSpec {
  title: string;
  leftNote: string;
  rightNote: string;
  insight: string;
}

export interface DuelComparisonRow {
  axis: string;
  left: string;
  right: string;
}

export interface DuelSpec {
  id: DuelId;
  number: string;
  title: string;
  subtitle: string;
  leftName: string;
  leftPath: string;
  leftPaper: string;
  rightName: string;
  rightPath: string;
  rightPaper: string;
  steps: DuelStepSpec[];
  comparison: DuelComparisonRow[];
}

export const DUELS: readonly DuelSpec[] = [
  {
    id: 'raft-vs-paxos',
    number: '01',
    title: 'Raft vs. Paxos',
    subtitle: 'Strong-leader log replication vs. symmetric proposer/acceptor consensus rounds',
    leftName: 'Raft Consensus',
    leftPath: '/raft',
    leftPaper: 'Ongaro & Ousterhout, 2014',
    rightName: 'Paxos Consensus',
    rightPath: '/paxos',
    rightPaper: 'Lamport, 1998',
    steps: [
      {
        title: 'Initiate Agreement',
        leftNote: 'N0 increments term to 1 and broadcasts RequestVote to all peers.',
        rightNote: 'Proposer P0 broadcasts Phase 1 Prepare(#1) to all 5 acceptors.',
        insight:
          'Both begin with a majority-seeking round, but Raft elects a durable leader while Paxos seeks permission for a single proposal number.',
      },
      {
        title: 'Quorum Responses',
        leftNote: 'Followers grant votes once per term; N0 collects majority.',
        rightNote: 'Acceptors promise not to accept proposals < #1 and reply Promise(#1).',
        insight:
          'Both require ⌊N/2⌋ + 1 = 3 replies so any two quorums intersect at ≥ 1 node.',
      },
      {
        title: 'Establish Authority / Propose',
        leftNote: 'N0 becomes Term 1 Leader — all future writes flow directly through N0.',
        rightNote: 'P0 sends Phase 2 Accept(#1, "SET x=42") to the acceptor quorum.',
        insight:
          'Once elected, Raft skips Phase 1 for subsequent entries; basic Paxos runs Prepare+Accept per value.',
      },
      {
        title: 'Commit Value',
        leftNote: 'Leader N0 appends "SET x=42" and replicates via AppendEntries.',
        rightNote: 'Acceptors accept "SET x=42" and notify Learners — consensus reached.',
        insight: 'Both commit durably once a majority persists the entry.',
      },
      {
        title: 'Fault Injection: Crash Primary',
        leftNote: 'Leader N0 crashes! Cluster stalls until an election timeout triggers Term 2.',
        rightNote: 'P0 and Acceptor A0 crash — 4/5 acceptors remain healthy for P1.',
        insight:
          'Raft must elect a new leader before serving writes; Paxos allows any backup proposer to step in immediately.',
      },
      {
        title: 'Recovery & Next Write',
        leftNote: 'N1 wins Term 2 election and replicates "SET y=99" across remaining 4 nodes.',
        rightNote: 'Proposer P1 runs Prepare/Accept for "SET y=99" and commits on 4/5 acceptors.',
        insight:
          'Both survive minority failures (f < N/2) without losing previously committed state.',
      },
    ],
    comparison: [
      {
        axis: 'Leadership',
        left: 'Strong single leader per term',
        right: 'Leaderless in basic Paxos (any proposer)',
      },
      {
        axis: 'Steady-State RTT',
        left: '1 RTT (AppendEntries)',
        right: '2 RTTs (Prepare + Accept)',
      },
      {
        axis: 'Log Continuity',
        left: 'Strictly sequential, no holes',
        right: 'Out-of-order slots allowed',
      },
      {
        axis: 'Fault Tolerance',
        left: 'Tolerates f < N/2 crashes',
        right: 'Tolerates f < N/2 crashes',
      },
    ],
  },
  {
    id: '2pc-vs-saga',
    number: '02',
    title: 'Two-Phase Commit vs. Saga',
    subtitle: 'Blocking atomic locking vs. non-blocking local commits with compensating rollbacks',
    leftName: 'Two-Phase Commit',
    leftPath: '/two-phase-commit',
    leftPaper: 'Gray, 1978',
    rightName: 'Compensating Saga',
    rightPath: '/distributed-transactions',
    rightPaper: 'Garcia-Molina, 1987',
    steps: [
      {
        title: 'Start Distributed Order',
        leftNote: 'Coordinator broadcasts VoteRequest; participants acquire locks.',
        rightNote: 'Saga starts pipeline — no global locks acquired across services.',
        insight:
          '2PC coordinates all participants up front; Saga breaks work into independent local transactions.',
      },
      {
        title: 'Partial Progress',
        leftNote: 'P0 and P1 vote YES and enter PREPARED (locked, waiting on coordinator).',
        rightNote: 'Step 1 (Inventory) & Step 2 (Payment) commit locally and release locks.',
        insight:
          '2PC preserves full isolation while waiting; Saga exposes intermediate committed state immediately.',
      },
      {
        title: 'Downstream Failure',
        leftNote: 'P2 fails / votes NO — atomic invariant forbids partial commit.',
        rightNote: 'Step 3 (Shipping) fails after Steps 1 & 2 already committed locally.',
        insight:
          '2PC detects failure before any commit; Saga discovers failure mid-flight.',
      },
      {
        title: 'Abort vs. Compensate',
        leftNote: 'Coordinator broadcasts ABORT to roll back P0 & P1 cleanly.',
        rightNote: 'Saga executes compensating transaction for Step 2 (Refund Payment).',
        insight:
          '2PC aborts cleanly via undo logs; Saga requires custom semantic undo actions.',
      },
      {
        title: 'Final Convergence',
        leftNote: 'All participants ABORTED and locks released (atomic all-or-nothing).',
        rightNote: 'Step 1 compensated (Release Inventory) — system eventually consistent.',
        insight:
          'Use 2PC for strict ACID within a tight boundary; use Sagas across loosely-coupled microservices.',
      },
    ],
    comparison: [
      {
        axis: 'Isolation',
        left: 'Strict ACID (locks held across phases)',
        right: 'Eventual (intermediate states visible)',
      },
      {
        axis: 'Blocking Risk',
        left: 'Blocks if coordinator crashes mid-phase',
        right: 'Non-blocking (local commits proceed)',
      },
      {
        axis: 'Failure Undo',
        left: 'Automatic database rollback (ABORT)',
        right: 'Explicit compensating transactions',
      },
      {
        axis: 'Best Fit',
        left: 'Single-region sharded DB / XA',
        right: 'Cross-service workflows & microservices',
      },
    ],
  },
  {
    id: 'lamport-vs-vector',
    number: '03',
    title: 'Lamport vs. Vector Clocks',
    subtitle: 'Scalar logical clocks (1 integer) vs. exact causal partial-order vectors (N integers)',
    leftName: 'Lamport Clocks',
    leftPath: '/lamport-clocks',
    leftPaper: 'Lamport, 1978',
    rightName: 'Vector Clocks',
    rightPath: '/vector-clocks',
    rightPaper: 'Fidge & Mattern, 1988',
    steps: [
      {
        title: 'Independent Event on P0',
        leftNote: 'P0 executes local event → scalar clock ticks to 1.',
        rightNote: 'P0 executes local event → vector clock becomes [1, 0, 0].',
        insight: 'At a single process, both clocks simply increment their own counter.',
      },
      {
        title: 'Concurrent Event on P2',
        leftNote: 'P2 executes local event → scalar clock ticks to 1 (ties with P0).',
        rightNote: 'P2 executes local event → vector clock becomes [0, 0, 1].',
        insight:
          'Vector clocks immediately prove [1,0,0] ∥ [0,0,1] are concurrent (neither ≤ the other).',
      },
      {
        title: 'Divergent Ticks on P0',
        leftNote: 'P0 ticks again → P0=2 > P2=1. Scalar comparison hides concurrency!',
        rightNote: 'P0=[2, 0, 0] vs P2=[0, 0, 1] → still provably CONCURRENT!',
        insight:
          'Key theorem: Lamport gives (a→b ⇒ L(a)<L(b)), NOT the converse. Vector clocks give ⇔.',
      },
      {
        title: 'Causal Message P0 → P1',
        leftNote: 'P0 broadcasts (t=3); P1 updates its scalar clock past 3.',
        rightNote: 'P0 sends [3,0,0] to P1; P1 takes element-wise max → [3, 1, 0].',
        insight:
          'Vector merge captures the entire causal ancestry known to P0 at send time.',
      },
      {
        title: 'Transitive Chain P1 → P2',
        leftNote: 'P1 broadcasts; P2 advances scalar clock into total order.',
        rightNote: 'P1 sends [3,2,0] to P2; P2 merges → [3, 2, 2], proving P0 → P1 → P2.',
        insight:
          'Vector clocks detect exact causality at the cost of O(N) metadata per message.',
      },
    ],
    comparison: [
      { axis: 'Metadata Size', left: 'O(1) — single integer', right: 'O(N) — vector of N process counters' },
      {
        axis: 'Causal Guarantee',
        left: 'a → b ⇒ L(a) < L(b) (one-way)',
        right: 'a → b ⇔ V(a) < V(b) (if and only if)',
      },
      {
        axis: 'Concurrency Detection',
        left: 'Cannot distinguish concurrent vs causal',
        right: 'Exact concurrency detection (V(a) ∥ V(b))',
      },
      {
        axis: 'Total Order',
        left: 'Easy tie-break with (clock, nodeId)',
        right: 'Partial order by design',
      },
    ],
  },
  {
    id: 'quorum-vs-crdts',
    number: '04',
    title: 'Quorum Replication vs. CRDTs',
    subtitle: 'Coordinator-mediated W+R>N quorums vs. coordination-free algebraic lattice merges',
    leftName: 'Quorum Replication',
    leftPath: '/quorum-replication',
    leftPaper: 'DeCandia et al. (Dynamo), 2007',
    rightName: 'Conflict-Free CRDTs',
    rightPath: '/crdts',
    rightPaper: 'Shapiro et al., 2011',
    steps: [
      {
        title: 'Local Write at Origin Replica',
        leftNote: 'N0 writes cart=1 (v1) and fans out Write RPCs to satisfy W=3.',
        rightNote: 'R0 increments its local G-Counter slot [1,0,0] and adds "cart" to OR-Set — zero network wait.',
        insight:
          'Quorum systems coordinate synchronously on the write path; CRDTs commit locally in 0 RTT and synchronize asynchronously.',
      },
      {
        title: 'Concurrent Write Under Split',
        leftNote: 'N2 crashes while N3 accepts a new write cart=2 (v2) — replicas now hold diverging versions.',
        rightNote: 'R1 and R2 independently increment G-Counter and add "promo" without talking to R0.',
        insight:
          'Under failures or partitions, quorum writes risk missing W or creating stale replicas; CRDT replicas stay 100% writable.',
      },
      {
        title: 'Read / Local State Divergence',
        leftNote: 'N0 serves a quorum read R=3, discovers version skew (v1 vs v2), and queues Read Repair.',
        rightNote: 'All 3 CRDT replicas have diverged locally (R0=1, R1=1, R2=1) yet each state is valid.',
        insight:
          'Quorum reads resolve divergence via highest-version win + read repair; CRDTs retain every concurrent update without overwriting.',
      },
      {
        title: 'Convergence Round',
        leftNote: 'Read Repair delivers v2 to lagging nodes — last-writer-wins overwrites v1.',
        rightNote: 'Pairwise Sync messages exchange state across R0↔R1↔R2.',
        insight:
          'Quorum repair converges to a single winning version; CRDT sync merges full semilattice payloads.',
      },
      {
        title: 'Final Algebraic Convergence',
        leftNote: 'N2 recovers and receives latest v2 — all healthy nodes agree on cart=2.',
        rightNote: 'All replicas converge deterministically to G-Counter=3 and OR-Set={cart, promo} regardless of message order.',
        insight:
          'CRDT merges are commutative, associative, and idempotent (Strong Eventual Consistency); Quorums trade availability for linearizable/fresh reads.',
      },
    ],
    comparison: [
      {
        axis: 'Write Coordination',
        left: 'Synchronous fan-out to W replicas',
        right: 'Zero coordination (local 0-RTT write)',
      },
      {
        axis: 'Conflict Resolution',
        left: 'Version / timestamp overwrite or siblings',
        right: 'Deterministic lattice join (never loses increments)',
      },
      {
        axis: 'Partition Behavior',
        left: 'Blocks writes if healthy replicas < W',
        right: 'Always available on every side of a partition',
      },
      {
        axis: 'Data Model',
        left: 'Arbitrary key-value blobs',
        right: 'Constrained to semilattice types (Counters, Sets, RGAs)',
      },
    ],
  },
  {
    id: 'hashing-vs-sharding',
    number: '05',
    title: 'Consistent Hashing vs. Range Sharding',
    subtitle: 'Virtual-node hash ring vs. contiguous key-range partitions during cluster scaling',
    leftName: 'Consistent Hashing',
    leftPath: '/consistent-hashing',
    leftPaper: 'Karger et al., 1997',
    rightName: 'Range Sharding',
    rightPath: '/sharding-rebalancing',
    rightPaper: 'Chang et al. (Bigtable), 2006',
    steps: [
      {
        title: 'Seed 3-Node Cluster',
        leftNote: '3 physical servers each claim 3 virtual tokens on the 32-bit hash ring with 12 keys distributed around the circle.',
        rightNote: '3 nodes own contiguous key ranges [0–32], [33–65], [66–99] across 60 ordered keys.',
        insight:
          'Consistent hashing spreads keys pseudo-randomly; range sharding preserves key ordering for efficient range scans.',
      },
      {
        title: 'Burst Sequential Keys',
        leftNote: '6 new sequential keys (order-100..105) hash evenly across all 3 servers.',
        rightNote: 'Sequential writes cluster inside a single contiguous range boundary — creating a write hotspot.',
        insight:
          'Hashing eliminates monotonic key hotspots at the cost of losing range-scan locality.',
      },
      {
        title: 'Scale Out: Add 4th Node',
        leftNote: 'server-3 joins with 3 virtual nodes; only ~1/4 of keys migrate from clockwise neighbors.',
        rightNote: 'N3 joins; range boundaries split and MoveShard migrations shuffle partitions to rebalance.',
        insight:
          'Consistent hashing moves K/N keys on average; range sharding splits hot tablets or shifts boundary intervals.',
      },
      {
        title: 'Scale Down / Node Failure',
        leftNote: 'server-1 leaves the ring — its virtual segments smoothly fail over to multiple surviving peers.',
        rightNote: 'N1 is removed — remaining nodes absorb its entire contiguous range and rebalance load.',
        insight:
          'Virtual nodes distribute failover load evenly across survivors instead of dumping 100% onto one neighbor.',
      },
      {
        title: 'Post-Rebalance Equilibrium',
        leftNote: 'Ring stays balanced with low max/avg imbalance and zero global reshuffling.',
        rightNote: 'Range shards stabilize across surviving nodes, keeping ordered scans single-hop.',
        insight:
          'Choose Consistent Hashing for key-value caches/Dynamo stores; choose Range Sharding when range queries (`BETWEEN`, prefix scans) dominate.',
      },
    ],
    comparison: [
      {
        axis: 'Range Queries',
        left: 'Scatter-gather across all nodes',
        right: 'Single-node / adjacent-shard scan',
      },
      {
        axis: 'Hotspot Resistance',
        left: 'High — uniform hash distribution',
        right: 'Vulnerable to monotonic timestamp/ID keys',
      },
      {
        axis: 'Rebalance Churn',
        left: 'Minimal — ~K/N keys move on add/remove',
        right: 'Depends on split/merge boundary policy',
      },
      {
        axis: 'Routing Metadata',
        left: 'Stateless hash ring + virtual nodes',
        right: 'Coordinator / tablet routing directory',
      },
    ],
  },
  {
    id: 'raft-vs-pbft',
    number: '06',
    title: 'Raft vs. PBFT',
    subtitle: 'Crash fault tolerance (2f+1, O(N) msgs) vs. Byzantine fault tolerance (3f+1, O(N²) msgs)',
    leftName: 'Raft (CFT)',
    leftPath: '/raft',
    leftPaper: 'Ongaro & Ousterhout, 2014',
    rightName: 'PBFT (BFT)',
    rightPath: '/pbft',
    rightPaper: 'Castro & Liskov, 1999',
    steps: [
      {
        title: 'Leader / Primary Dispatch',
        leftNote: 'Raft N0 wins Term 1 leadership and accepts client command "TX #7".',
        rightNote: 'PBFT primary N0 receives client request "TX #7" and broadcasts PrePrepare to all replicas.',
        insight:
          'Both rely on a designated leader/primary in steady state to assign sequence numbers.',
      },
      {
        title: 'First Replication Round',
        leftNote: 'Leader N0 sends AppendEntries to followers — only O(N) leader-to-follower messages needed.',
        rightNote: 'Replicas verify PrePrepare and broadcast all-to-all Prepare messages — O(N²) cross-checking.',
        insight:
          'Raft trusts nodes not to lie (crash-only); PBFT requires all-to-all Prepare verification to catch an equivocating primary.',
      },
      {
        title: 'Commit / Quorum Threshold',
        leftNote: 'Once 3/5 (⌊N/2⌋ + 1) nodes persist the entry, Raft commits and replies to the client.',
        rightNote: 'After 2f+1 = 3 Prepares, replicas broadcast all-to-all Commit messages (second O(N²) round).',
        insight:
          'Raft commits in 1 steady-state RTT; PBFT needs 3 phases (PrePrepare → Prepare → Commit) to guarantee cross-view durability.',
      },
      {
        title: 'Final Execution',
        leftNote: 'Raft applies "TX #7" across all healthy followers in sequential log order.',
        rightNote: 'Replicas collect 2f+1 Commits and execute "TX #7" deterministically across the 4-node BFT cluster.',
        insight:
          'Tolerating f=1 fault requires N=3 nodes in Raft (2f+1) vs. N=4 nodes in PBFT (3f+1).',
      },
      {
        title: 'Faulty Primary & View Change',
        leftNote: 'Leader N0 crashes → N1 triggers Term 2 election and resumes leadership.',
        rightNote: 'Primary N0 fails/misbehaves → replicas trigger View Change to View 1 (N1 becomes primary).',
        insight:
          'Raft handles fail-stop crashes with low overhead; PBFT defends against malicious/arbitrary behavior at quadratic communication cost.',
      },
    ],
    comparison: [
      {
        axis: 'Fault Model',
        left: 'Crash Fault Tolerant (fail-stop only)',
        right: 'Byzantine Fault Tolerant (malicious / equivocation)',
      },
      {
        axis: 'Minimum Replicas (f faults)',
        left: '2f + 1 (3 nodes for f=1)',
        right: '3f + 1 (4 nodes for f=1)',
      },
      {
        axis: 'Message Complexity',
        left: 'O(N) per log entry (star topology)',
        right: 'O(N²) per request (all-to-all Prepare & Commit)',
      },
      {
        axis: 'Commit Latency',
        left: '1 RTT (leader → followers → ack)',
        right: '3 message phases (PrePrepare, Prepare, Commit)',
      },
    ],
  },
];

export function isDuelId(value: string | null | undefined): value is DuelId {
  if (!value) return false;
  return DUELS.some((d) => d.id === value);
}

export function getDuelById(id: DuelId): DuelSpec {
  return DUELS.find((d) => d.id === id) ?? DUELS[0];
}

export interface DuelDeepLink {
  duelId: DuelId | null;
  step: number | null;
}

export function parseDuelDeepLink(search: string): DuelDeepLink {
  const params = new URLSearchParams(search);
  const rawDuel = params.get('duel');
  const rawStep = params.get('step');

  const duelId = isDuelId(rawDuel) ? rawDuel : null;
  let step: number | null = null;
  if (rawStep !== null && /^\d+$/.test(rawStep.trim())) {
    const parsed = Number.parseInt(rawStep.trim(), 10);
    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      step = parsed;
    }
  }

  return { duelId, step };
}

export function clampDuelStep(duelId: DuelId, step: number): number {
  const maxStep = getDuelById(duelId).steps.length;
  if (!Number.isFinite(step) || step < 0) return 0;
  return Math.min(Math.floor(step), maxStep);
}

export function buildDuelDeepLinkUrl(
  currentHref: string,
  duelId: DuelId,
  step: number
): string {
  const url = new URL(currentHref);
  url.searchParams.set('duel', duelId);
  const clamped = clampDuelStep(duelId, step);
  if (clamped > 0) {
    url.searchParams.set('step', String(clamped));
  } else {
    url.searchParams.delete('step');
  }
  return url.toString();
}
