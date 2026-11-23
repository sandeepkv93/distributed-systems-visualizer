import type { SpaceTimeActor, SpaceTimeFrame } from './spacetime';

export type IncidentSeverity = 'SEV-1' | 'SEV-2';

export interface IncidentMetric {
  label: string;
  value: string;
  alert?: boolean;
}

export interface IncidentCase {
  id: string;
  code: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  conceptId: string;
  summary: string;
  telemetry: IncidentMetric[];
  actors: SpaceTimeActor[];
  frames: SpaceTimeFrame[];
  logLines: string[];
  rootCauseQuestion: string;
  rootCauseOptions: readonly string[];
  correctRootCauseIndex: number;
  mitigationQuestion: string;
  mitigationOptions: readonly string[];
  correctMitigationIndex: number;
  postmortemVerdict: string;
  relatedPlatePath: string;
  relatedPlateLabel: string;
  secondaryLabPath: string;
  secondaryLabLabel: string;
}

export const INCIDENTS: readonly IncidentCase[] = [
  {
    id: 'split-brain-stale-read',
    code: 'INC-01',
    severity: 'SEV-1',
    title: 'Split-Brain Stale Read During Asymmetric Partition',
    service: 'metadata-store-us-east',
    conceptId: 'raft',
    summary:
      'After a top-of-rack switch flap isolated N0 from N1–N4, checkout clients pinned to N0 observed stale feature flags for 90 seconds even after the majority elected N1 in Term 2 and committed new writes.',
    telemetry: [
      { label: 'PARTITION', value: '{N0} | {N1..N4}', alert: true },
      { label: 'TERMS SEEN', value: 'T1 & T2', alert: true },
      { label: 'STALE READS', value: '1,420 req', alert: true },
      { label: 'COMMIT QUORUM', value: '3 / 5 (N1)' },
    ],
    actors: [
      { id: 'N0', label: 'N0 (Old Ldr)', color: '#F87171', failed: true },
      { id: 'N1', label: 'N1 (T2 Ldr)', color: '#D9441E' },
      { id: 'N2', label: 'N2', color: '#34D399' },
      { id: 'N3', label: 'N3', color: '#34D399' },
    ],
    frames: [
      { id: 'inc1-1', from: 'N0', to: 'N1', label: 'Heartbeat T1', status: 'dropped', color: '#F87171' },
      { id: 'inc1-2', from: 'N1', to: 'N2', label: 'RequestVote T2', status: 'success', color: '#FBBF24' },
      { id: 'inc1-3', from: 'N1', to: 'N3', label: 'RequestVote T2', status: 'success', color: '#FBBF24' },
      { id: 'inc1-4', from: 'N2', to: 'N1', label: 'VoteGranted T2', status: 'success', color: '#34D399' },
      { id: 'inc1-5', from: 'N1', to: 'N2', label: 'AppendEntries flag=ON', status: 'success', color: '#60A5FA' },
      { id: 'inc1-6', from: 'N1', to: 'N3', label: 'AppendEntries flag=ON', status: 'success', color: '#60A5FA' },
      { id: 'inc1-7', from: 'N0', to: 'N2', label: 'AppendEntries T1', status: 'dropped', color: '#F87171' },
    ],
    logLines: [
      '14:02:11.042 WARN  [N0] Heartbeat ack timeout from peers N1,N2,N3,N4 (term=1)',
      '14:02:11.310 INFO  [N1] Election won for term=2 with 4/5 votes; assuming leadership',
      '14:02:11.488 INFO  [N1] Committed index=48 cmd="SET checkout_v2=ON" across majority',
      '14:02:12.019 ERROR [client-7] Read from N0 returned checkout_v2=OFF (stale local state)',
    ],
    rootCauseQuestion: 'Why did N0 serve stale values even though Raft guarantees Election Safety?',
    rootCauseOptions: [
      'N0 served reads directly from its local state machine without verifying it still held a majority quorum.',
      'Raft allows two leaders to commit conflicting entries in the same term.',
      'N1 forgot to increment its term number before sending RequestVote.',
      'Followers N2 and N3 voted for both N0 and N1 inside Term 2.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'Which Raft read protocol eliminates stale reads from a partitioned deposed leader?',
    mitigationOptions: [
      'Serve reads from any random follower to bypass N0.',
      'Require ReadIndex (leader confirms leadership via a majority heartbeat round) or strictly bounded leader leases before replying.',
      'Increase the election timeout from 300ms to 30 seconds.',
      'Disable log compaction during network partitions.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'Raft guarantees Election Safety (at most one leader per term) and prevents deposed leader N0 from committing new writes. However, linearizable reads still require N0 to verify it has not been deposed via a ReadIndex heartbeat round to a majority quorum before serving state.',
    relatedPlatePath: '/raft',
    relatedPlateLabel: 'Reproduce on Plate 20 · Raft',
    secondaryLabPath: '/duel?duel=raft-vs-paxos',
    secondaryLabLabel: 'Compare in Raft vs. Paxos Duel',
  },
  {
    id: 'quorum-stale-overlap',
    code: 'INC-02',
    severity: 'SEV-1',
    title: 'Silent Stale Read Under W=2, R=2, N=5 Config Drift',
    service: 'shopping-cart-kv',
    conceptId: 'quorum-replication',
    summary:
      'To shave 8ms off tail latency, an engineer tuned a 5-replica Dynamo store from W=3, R=3 down to W=2, R=2. Within minutes, customers saw newly added cart items vanish on page refresh.',
    telemetry: [
      { label: 'CONFIG', value: 'N=5 · W=2 · R=2', alert: true },
      { label: 'W + R vs N', value: '4 <= 5 (DISJOINT)', alert: true },
      { label: 'MIN OVERLAP', value: '0 REPLICAS', alert: true },
      { label: 'P99 WRITE', value: '6.4 ms' },
    ],
    actors: [
      { id: 'N0', label: 'N0 (v2)', color: '#60A5FA' },
      { id: 'N1', label: 'N1 (v2)', color: '#60A5FA' },
      { id: 'N2', label: 'N2 (v1)', color: '#FBBF24' },
      { id: 'N3', label: 'N3 (v1)', color: '#FBBF24' },
      { id: 'N4', label: 'N4 (v1)', color: '#FBBF24' },
    ],
    frames: [
      { id: 'inc2-1', from: 'N0', to: 'N1', label: 'Write cart=v2 (ack 2/2)', status: 'success', color: '#60A5FA' },
      { id: 'inc2-2', from: 'N0', to: 'N2', label: 'Async Write v2', status: 'dropped', color: '#F87171' },
      { id: 'inc2-3', from: 'N3', to: 'N4', label: 'Read R=2 -> v1', status: 'success', color: '#FBBF24' },
      { id: 'inc2-4', from: 'N4', to: 'N3', label: 'Resp cart=v1 (stale)', status: 'success', color: '#F87171' },
    ],
    logLines: [
      '09:14:02.115 INFO  [N0] Client WRITE cart:8841=v2 acked by {N0, N1} (W=2 satisfied)',
      '09:14:02.119 WARN  [N0] Background replicate v2 -> N2 timed out on congested link',
      '09:14:02.141 INFO  [N3] Client READ cart:8841 queried {N3, N4} (R=2 satisfied)',
      '09:14:02.142 ERROR [audit] Returned cart:8841=v1 immediately after v2 write succeeded',
    ],
    rootCauseQuestion: 'What mathematical quorum invariant was broken by the N=5, W=2, R=2 tuning?',
    rootCauseOptions: [
      'W + R <= N (2 + 2 = 4 <= 5), so the write set and read set had zero guaranteed intersection.',
      'N must always be an even number for Dynamo-style replication.',
      'R must always be strictly larger than W to prevent stale reads.',
      'Read repair cannot run when all 5 replicas are online.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'Which configuration restores strict read-after-write overlap while keeping reads fast?',
    mitigationOptions: [
      'Keep W=2, R=2 and increase N to 7.',
      'Set W=4, R=2 (so W + R = 6 > 5) or W=3, R=3 so every read quorum intersects the latest write quorum.',
      'Set W=1, R=1 and disable version vectors.',
      'Route all writes to N0 only with no replication.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'By the pigeonhole principle, strong quorum overlap requires W + R > N. With N=5 and W=2, R=2, sets {N0, N1} and {N3, N4} are completely disjoint. Restoring W=3, R=3 (or W=4, R=2 for read-heavy workloads) guarantees at least one up-to-date replica in every read quorum.',
    relatedPlatePath: '/quorum-replication',
    relatedPlateLabel: 'Inspect on Quorum Replication Plate',
    secondaryLabPath: '/bench',
    secondaryLabLabel: 'Verify Overlap in Quorum Bench',
  },
  {
    id: '2pc-coordinator-crash',
    code: 'INC-03',
    severity: 'SEV-1',
    title: 'Blocked Database Locks After 2PC Coordinator Crash',
    service: 'payments-xa-bridge',
    conceptId: 'two-phase-commit',
    summary:
      'The transaction coordinator process was OOM-killed right after participants P0 and P1 voted YES and persisted PREPARED. Both shards held exclusive locks on hot ledger rows for 14 minutes until manual intervention.',
    telemetry: [
      { label: 'COORDINATOR', value: 'CRASHED (OOM)', alert: true },
      { label: 'P0 / P1 STATE', value: 'PREPARED (LOCKED)', alert: true },
      { label: 'WAIT QUEUE', value: '8,910 txns', alert: true },
      { label: 'PROTOCOL', value: 'Classic 2PC' },
    ],
    actors: [
      { id: 'COORD', label: 'Coordinator', color: '#F87171', failed: true },
      { id: 'P0', label: 'P0 (Ledger)', color: '#FBBF24' },
      { id: 'P1', label: 'P1 (Escrow)', color: '#FBBF24' },
      { id: 'P2', label: 'P2 (Audit)', color: '#60A5FA' },
    ],
    frames: [
      { id: 'inc3-1', from: 'COORD', to: 'P0', label: 'VoteRequest tx#91', status: 'success', color: '#60A5FA' },
      { id: 'inc3-2', from: 'COORD', to: 'P1', label: 'VoteRequest tx#91', status: 'success', color: '#60A5FA' },
      { id: 'inc3-3', from: 'P0', to: 'COORD', label: 'VoteYES (PREPARED)', status: 'success', color: '#34D399' },
      { id: 'inc3-4', from: 'P1', to: 'COORD', label: 'VoteYES (PREPARED)', status: 'success', color: '#34D399' },
      { id: 'inc3-5', from: 'COORD', to: 'P0', label: 'Decision (LOST)', status: 'dropped', color: '#F87171' },
      { id: 'inc3-6', from: 'COORD', to: 'P1', label: 'Decision (LOST)', status: 'dropped', color: '#F87171' },
    ],
    logLines: [
      '21:08:44.002 INFO  [P0] Acquired row locks on acct:440; voted YES -> PREPARED',
      '21:08:44.005 INFO  [P1] Acquired row locks on escrow:440; voted YES -> PREPARED',
      '21:08:44.011 FATAL [COORD] OutOfMemoryError before flushing decision to WAL',
      '21:08:59.012 WARN  [P0] Still uncertain in PREPARED state; refusing to release locks',
    ],
    rootCauseQuestion: 'Why couldn’t P0 and P1 simply time out and unilaterally abort tx#91?',
    rootCauseOptions: [
      'Once a participant votes YES (PREPARED), it surrendered autonomy: the coordinator might have already told another participant to COMMIT before crashing.',
      'SQL databases do not support rolling back prepared transactions.',
      'P0 and P1 lost network connectivity to each other.',
      '2PC forbids participants from keeping undo logs on disk.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'What architectural change prevents a single coordinator crash from blocking participants?',
    mitigationOptions: [
      'Reduce the participant lock timeout to 50ms and auto-commit.',
      'Replicate the coordinator state via a consensus group (Raft/Paxos over 2PC) or refactor cross-service workflows into non-blocking compensating Sagas.',
      'Skip Phase 1 voting and broadcast COMMIT immediately.',
      'Run the coordinator without a write-ahead log so restarts are faster.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'Classic 2PC is fundamentally a blocking protocol during the uncertainty window after VoteYES. Production systems (such as Spanner or CockroachDB) eliminate this single point of failure by replicating the coordinator on Raft/Paxos, or by using non-blocking Sagas where cross-service isolation can be relaxed.',
    relatedPlatePath: '/two-phase-commit',
    relatedPlateLabel: 'Inspect on Two-Phase Commit Plate',
    secondaryLabPath: '/duel?duel=2pc-vs-saga',
    secondaryLabLabel: 'Compare in 2PC vs. Saga Duel',
  },
  {
    id: 'pbft-undersized-cluster',
    code: 'INC-04',
    severity: 'SEV-1',
    title: 'Byzantine Safety Breach After Downsizing PBFT Cluster to N=3',
    service: 'settlement-consortium-bft',
    conceptId: 'pbft',
    summary:
      'During cost optimization, an operator shrank a 4-node PBFT consortium to 3 nodes. When compromised primary N0 sent conflicting PrePrepare messages to N1 and N2, the network deadlocked and diverged.',
    telemetry: [
      { label: 'CLUSTER SIZE', value: 'N = 3 (NEED 4)', alert: true },
      { label: 'MAX BFT FAULTS', value: 'f = 0', alert: true },
      { label: 'BYZANTINE NODE', value: 'N0 EQUIVOCATING', alert: true },
      { label: 'VIEW', value: 'v0 STALLED' },
    ],
    actors: [
      { id: 'N0', label: 'N0 (Byz Prim)', color: '#F87171', failed: true },
      { id: 'N1', label: 'N1 (Honest)', color: '#60A5FA' },
      { id: 'N2', label: 'N2 (Honest)', color: '#34D399' },
    ],
    frames: [
      { id: 'inc4-1', from: 'N0', to: 'N1', label: 'PrePrepare seq=1 PAY_A', status: 'success', color: '#F87171' },
      { id: 'inc4-2', from: 'N0', to: 'N2', label: 'PrePrepare seq=1 PAY_B', status: 'success', color: '#F87171' },
      { id: 'inc4-3', from: 'N1', to: 'N2', label: 'Prepare PAY_A', status: 'success', color: '#FBBF24' },
      { id: 'inc4-4', from: 'N2', to: 'N1', label: 'Prepare PAY_B', status: 'success', color: '#FBBF24' },
    ],
    logLines: [
      '03:11:02.104 WARN  [ops] Scaled PBFT consortium from N=4 down to N=3 replicas',
      '03:11:19.440 ERROR [N1] Digest mismatch: received PAY_A from N0, PAY_B from N2',
      '03:11:19.442 ERROR [N2] Digest mismatch: cannot distinguish whether N0 or N1 lied',
      '03:11:20.000 FATAL [consensus] Quorum intersection has 0 guaranteed honest majority',
    ],
    rootCauseQuestion: 'Why does tolerating even a single Byzantine node (f=1) strictly require N >= 4?',
    rootCauseOptions: [
      'With N = 3f + 1 = 4, quorums of size 2f + 1 = 3 intersect in f + 1 = 2 nodes, guaranteeing at least 1 honest witness to catch equivocation.',
      'PBFT cannot assign view numbers when N is an odd integer.',
      'Cryptographic signatures require at least 4 nodes to validate.',
      'Three nodes cannot send all-to-all Prepare messages.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'What is the minimum cluster sizing to tolerate f=1 and f=2 Byzantine replicas respectively?',
    mitigationOptions: [
      'N=3 for f=1, and N=5 for f=2 (same as Raft).',
      'N=4 for f=1 (quorum 3), and N=7 for f=2 (quorum 5), following N = 3f + 1.',
      'N=2 for f=1, and N=4 for f=2.',
      'N=6 for f=1, and N=12 for f=2.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'Crash consensus needs 2f + 1 nodes, but Byzantine consensus needs 3f + 1 because f faulty nodes may stay silent (requiring liveness from N - f nodes) AND up to f nodes inside any quorum intersection may lie (requiring 2(N - f) - N > f, hence N >= 3f + 1).',
    relatedPlatePath: '/pbft',
    relatedPlateLabel: 'Inspect on PBFT Plate',
    secondaryLabPath: '/bench',
    secondaryLabLabel: 'Verify 3f+1 Bounds in Quorum Bench',
  },
  {
    id: 'lamport-false-causality',
    code: 'INC-05',
    severity: 'SEV-2',
    title: 'False Causal Dependency Alert in Security Audit Pipeline',
    service: 'iam-audit-correlator',
    conceptId: 'lamport-clocks',
    summary:
      'An automated fraud rule flagged a password-reset on P0 (Lamport clock L=2) as having been causally triggered by a failed login on P2 (L=1), even though P0 and P2 never exchanged any messages.',
    telemetry: [
      { label: 'P0 CLOCK', value: 'L(P0) = 2', alert: true },
      { label: 'P2 CLOCK', value: 'L(P2) = 1' },
      { label: 'MESSAGES', value: '0 EXCHANGED', alert: true },
      { label: 'TRUE RELATION', value: 'CONCURRENT (||)' },
    ],
    actors: [
      { id: 'P0', label: 'P0 (Auth-EU)', color: '#60A5FA' },
      { id: 'P1', label: 'P1 (Relay)', color: '#9E9B90' },
      { id: 'P2', label: 'P2 (Auth-US)', color: '#FBBF24' },
    ],
    frames: [
      { id: 'inc5-1', from: 'P0', to: 'P0', label: 'Local evt A (L=1)', status: 'success', color: '#60A5FA' },
      { id: 'inc5-2', from: 'P2', to: 'P2', label: 'Local evt B (L=1)', status: 'success', color: '#FBBF24' },
      { id: 'inc5-3', from: 'P0', to: 'P0', label: 'Local evt C (L=2)', status: 'success', color: '#60A5FA' },
      { id: 'inc5-4', from: 'P0', to: 'P1', label: 'Export L=2 > L(B)=1', status: 'success', color: '#D9441E' },
    ],
    logLines: [
      '11:45:00.100 INFO  [P0] local_event(A) -> scalar L=1',
      '11:45:00.102 INFO  [P2] local_event(B) -> scalar L=1 (isolated region)',
      '11:45:00.118 INFO  [P0] local_event(C) -> scalar L=2',
      '11:45:00.205 ALERT [correlator] False positive: assumed L(B) < L(C) implies B -> C',
    ],
    rootCauseQuestion: 'Which logical clock theorem did the fraud rule mistakenly invert?',
    rootCauseOptions: [
      'Lamport clocks only guarantee the one-way implication (a -> b => L(a) < L(b)); L(a) < L(b) does NOT prove a caused b.',
      'Lamport clocks decrease when messages cross data centers.',
      'Lamport clocks cannot assign timestamps to local events.',
      'Scalar clocks require NTP synchronization to remain monotonic.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'Which logical clock structure detects true concurrency vs. causality with zero false positives?',
    mitigationOptions: [
      'Add a random tie-breaker UUID to each Lamport timestamp.',
      'Replace scalar Lamport timestamps with Vector Clocks (O(N) vector), where a -> b <=> V(a) < V(b) and incomparable vectors prove concurrency.',
      'Use local wall-clock milliseconds from Date.now().',
      'Increment Lamport clocks by 10 instead of 1 on local events.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'Lamport clocks compress causal history into a single O(1) integer, which loses concurrency information. In the trace above, Vector Clocks assign V(C)=[2,0,0] and V(B)=[0,0,1] — neither dominates the other, proving they are concurrent (B || C).',
    relatedPlatePath: '/lamport-clocks',
    relatedPlateLabel: 'Inspect on Lamport Clocks Plate',
    secondaryLabPath: '/duel?duel=lamport-vs-vector',
    secondaryLabLabel: 'Compare in Lamport vs. Vector Duel',
  },
  {
    id: 'range-shard-hotspot',
    code: 'INC-06',
    severity: 'SEV-2',
    title: 'Write Hotspot Saturation on Monotonic Range Shard',
    service: 'telemetry-ingest-db',
    conceptId: 'sharding-rebalancing',
    summary:
      'After switching event primary keys to monotonically increasing timestamps, shard N2 [66–99] hit 99% CPU and dropped writes while shards N0 [0–32] and N1 [33–65] idled at 4% utilization.',
    telemetry: [
      { label: 'N2 CPU', value: '99.4% SATURATED', alert: true },
      { label: 'N0 / N1 CPU', value: '4.1% IDLE', alert: true },
      { label: 'KEY PATTERN', value: 'MONOTONIC TS' },
      { label: 'SHARDING', value: 'CONTIGUOUS RANGE' },
    ],
    actors: [
      { id: 'INGEST', label: 'Ingest GW', color: '#D9441E' },
      { id: 'N0', label: 'N0 [0-32]', color: '#9E9B90' },
      { id: 'N1', label: 'N1 [33-65]', color: '#9E9B90' },
      { id: 'N2', label: 'N2 [66-99]', color: '#F87171', failed: true },
    ],
    frames: [
      { id: 'inc6-1', from: 'INGEST', to: 'N2', label: 'PUT ts=94', status: 'success', color: '#D9441E' },
      { id: 'inc6-2', from: 'INGEST', to: 'N2', label: 'PUT ts=95', status: 'success', color: '#D9441E' },
      { id: 'inc6-3', from: 'INGEST', to: 'N2', label: 'PUT ts=96', status: 'dropped', color: '#F87171' },
      { id: 'inc6-4', from: 'INGEST', to: 'N2', label: 'PUT ts=97', status: 'dropped', color: '#F87171' },
    ],
    logLines: [
      '18:22:01.004 INFO  [router] Contiguous range map: N0=[0..32], N1=[33..65], N2=[66..99]',
      '18:22:02.411 WARN  [N2] Write queue depth 4,820; 100% of new timestamp keys map to N2',
      '18:22:03.002 INFO  [monitor] Cluster avg CPU=35%, max shard CPU=99.4% (imbalance 2.84x)',
      '18:22:03.119 ERROR [INGEST] 503 Service Unavailable writing monotonic keys to N2',
    ],
    rootCauseQuestion: 'Why did adding a 4th range shard fail to relieve the write hotspot immediately?',
    rootCauseOptions: [
      'All newly generated monotonic keys fall at the upper edge of the keyspace, continuously concentrating 100% of active writes onto whichever single shard owns the tail range.',
      'Range sharding cannot store more than 3 nodes.',
      'Timestamps cannot be indexed in sorted order.',
      'N0 and N1 rejected writes because of Byzantine faults.',
    ],
    correctRootCauseIndex: 0,
    mitigationQuestion: 'How do high-throughput ingest systems eliminate monotonic write hotspots while staying scalable?',
    mitigationOptions: [
      'Disable replication on N2 so writes finish faster.',
      'Hash-partition the key (Consistent Hashing with virtual nodes) or prepend a salt/tenant hash prefix to spread writes uniformly across all shards.',
      'Make key ranges wider so fewer splits happen.',
      'Route writes randomly without updating the routing directory.',
    ],
    correctMitigationIndex: 1,
    postmortemVerdict:
      'Contiguous range sharding excels at ordered range scans (`BETWEEN`), but monotonic keys (timestamps, auto-increment IDs) inevitably create a single-shard write hotspot. Hash partitioning (consistent hashing with virtual nodes) or salted composite keys (`hash(tenant) || timestamp`) spread ingest evenly across the entire fleet.',
    relatedPlatePath: '/sharding-rebalancing',
    relatedPlateLabel: 'Inspect on Sharding & Rebalancing Plate',
    secondaryLabPath: '/duel?duel=hashing-vs-sharding',
    secondaryLabLabel: 'Compare in Hashing vs. Sharding Duel',
  },
];

export const TOTAL_INCIDENTS = INCIDENTS.length;

export function getIncidentById(id: string | null | undefined): IncidentCase {
  return INCIDENTS.find((inc) => inc.id === id) ?? INCIDENTS[0];
}
