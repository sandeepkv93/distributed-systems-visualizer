import { ConceptDomainId } from './catalog';

export type RunbookSeverity = 'SEV-1' | 'SEV-2';

export interface FailureRunbook {
  id: string;
  code: string;
  title: string;
  severity: RunbookSeverity;
  domainId: ConceptDomainId;
  conceptId: string;
  reproScenarioId: string;
  incidentId?: string;
  breachedInvariant: string;
  telemetrySignals: readonly string[];
  rootCause: string;
  immediateMitigation: readonly string[];
  permanentFix: string;
}

export const FAILURE_RUNBOOKS: readonly FailureRunbook[] = [
  {
    id: 'rb-split-brain',
    code: 'RB-01',
    title: 'Split-Brain Dual-Leader Partition',
    severity: 'SEV-1',
    domainId: 'consensus',
    conceptId: 'network-partitions',
    reproScenarioId: 'split-brain',
    incidentId: 'split-brain-stale-read',
    breachedInvariant: 'Election Safety: |leaders(term)| <= 1',
    telemetrySignals: [
      'Two nodes simultaneously logging leader=true across separated AZs',
      'Divergent write WAL hashes after BGP/switch flap heals',
      'Clients observing non-monotonic reads depending on AZ routing',
    ],
    rootCause:
      'Symmetric network bisection combined with non-quorum failover or stale un-fenced leader leases allows a minority partition to keep accepting requests.',
    immediateMitigation: [
      'Fence or isolate the minority-AZ leader immediately via load-balancer drain / STONITH.',
      'Verify majority quorum health (floor(N/2) + 1 peers reachable) before re-enabling writes.',
      'Audit post-split write offsets on the demoted node before rejoining.',
    ],
    permanentFix:
      'Enforce strict odd-sized majority quorums (3 or 5 nodes across 3 AZs), enable Raft Pre-Vote + ReadIndex checks, and require monotonic fencing tokens at the storage tier.',
  },
  {
    id: 'rb-raft-election-storm',
    code: 'RB-02',
    title: 'Raft Leader Churn & Election Storm',
    severity: 'SEV-1',
    domainId: 'consensus',
    conceptId: 'raft',
    reproScenarioId: 'leader-failure',
    incidentId: 'split-brain-stale-read',
    breachedInvariant: 'Quorum Liveness: healthy >= floor(N/2) + 1 & bounded RTT < electionTimeout',
    telemetrySignals: [
      'Raft term counter incrementing every few seconds without stable leader',
      'Spiking RequestVote RPC rate and p99 write timeouts / 503 Unavailable',
      'Disk fsync latency exceeding heartbeat interval on leader WAL volume',
    ],
    rootCause:
      'Disk fsync stalls, noisy-neighbor CPU throttling, or cross-AZ packet jitter delay leader heartbeats past followers’ election timeout, triggering cascading split-vote elections.',
    immediateMitigation: [
      'Check leader disk IOPS / fsync latency and network loss between consensus peers.',
      'Temporarily widen election timeout (e.g., 10x heartbeat RTT) to stabilize leadership.',
      'Step down a degraded leader onto a healthy follower with low disk latency.',
    ],
    permanentFix:
      'Isolate consensus WAL onto dedicated NVMe/provisioned-IOPS disks, enable Raft Pre-Vote (prevents partitioned nodes from bumping cluster term), and tune heartbeat << electionTimeout.',
  },
  {
    id: 'rb-2pc-prepared-freeze',
    code: 'RB-03',
    title: '2PC Prepared-Lock Blocking Window',
    severity: 'SEV-1',
    domainId: 'coordination',
    conceptId: 'two-phase-commit',
    reproScenarioId: 'coordinator-failure-before-commit',
    incidentId: '2pc-coordinator-crash',
    breachedInvariant: 'Coordinator Liveness: coord UP while participants hold PREPARED locks',
    telemetrySignals: [
      'Participants stuck in PREPARED / IN-DOUBT state for > 30s',
      'Connection pool exhaustion and lock-wait timeouts cascading across hot rows',
      'Coordinator process OOM-killed or node terminated mid-Phase 2',
    ],
    rootCause:
      'The single transaction coordinator crashed after participants voted YES (entering PREPARED) and before delivering Phase 2 COMMIT/ABORT decisions; participants cannot safely decide unilaterally.',
    immediateMitigation: [
      'Restore the coordinator instance with its persistent transaction decision WAL intact so it replays Phase 2.',
      'Never manually force-abort one participant without verifying no sibling already committed.',
      'Only if coordinator WAL is permanently destroyed, inspect all participants’ logs uniformly before heuristic resolution.',
    ],
    permanentFix:
      'Replicate the transaction coordinator inside a Raft/Paxos consensus group (Spanner/CockroachDB pattern), or replace cross-service 2PC with asynchronous Compensating Sagas.',
  },
  {
    id: 'rb-quorum-stale-read',
    code: 'RB-04',
    title: 'Disjoint / Sloppy Quorum Stale Reads',
    severity: 'SEV-2',
    domainId: 'replication',
    conceptId: 'quorum-replication',
    reproScenarioId: 'read-repair',
    incidentId: 'quorum-stale-overlap',
    breachedInvariant: 'Strict Quorum Overlap: W + R > N',
    telemetrySignals: [
      'Read-repair counter spiking alongside customer reports of reverting state',
      'Config drift showing W + R <= N (e.g., N=5, W=2, R=2 or LOCAL_ONE reads)',
      'Hinted-handoff queues accumulating during replica restarts',
    ],
    rootCause:
      'Read and write quorums fail to intersect (W + R <= N) or sloppy quorums route writes to temporary fallback nodes outside the primary preference list.',
    immediateMitigation: [
      'Raise read/write consistency level so W + R > N (e.g., W=QUORUM, R=QUORUM on N=3 or N=5).',
      'Trigger synchronous read-repair and drain hinted-handoff backlogs on recovered nodes.',
    ],
    permanentFix:
      'Enforce W + R > N in client policy checks, schedule regular Merkle tree anti-entropy repairs, and use Raft/Paxos where strict linearizability is mandatory.',
  },
  {
    id: 'rb-gc-lease-split',
    code: 'RB-05',
    title: 'GC-Pause Lease Expiry & Stale Write Corruption',
    severity: 'SEV-1',
    domainId: 'coordination',
    conceptId: 'distributed-locking',
    reproScenarioId: 'lease-expiry',
    breachedInvariant: 'Mutual Exclusion: |activeWriters| <= 1 via monotonic fencing token',
    telemetrySignals: [
      'Worker logs showing JVM/Go stop-the-world pause > lease TTL',
      'Two workers emitting mutations for the same job/shard within overlapping windows',
      'Lock manager audit showing lease transferred before old owner stopped writing',
    ],
    rootCause:
      'A lease holder froze past its TTL, lost ownership to a new client, and woke up to issue an unfenced write that overwrote the new owner’s state.',
    immediateMitigation: [
      'Kill/restart paused worker pods and audit downstream storage rows modified during the overlap window.',
      'Increase lease TTL headroom (> 3x max observed GC pause) as a temporary buffer.',
    ],
    permanentFix:
      'Attach strictly monotonic fencing tokens issued by the consensus lock service to every storage mutation and reject any write with token < maxSeenToken at the storage layer.',
  },
  {
    id: 'rb-kafka-isr-shrink',
    code: 'RB-06',
    title: 'Replication Log ISR Shrinkage & Under-Replicated Partitions',
    severity: 'SEV-2',
    domainId: 'replication',
    conceptId: 'replication-log',
    reproScenarioId: 'isr-shrink',
    breachedInvariant: 'ISR Redundancy: |ISR| >= min.insync.replicas (typically >= 2)',
    telemetrySignals: [
      'UnderReplicatedPartitions > 0 and ISR shrinking to size 1',
      'Producers receiving NotEnoughReplicasException when acks=all',
      'Follower fetch lag growing steadily behind leader Log End Offset (LEO)',
    ],
    rootCause:
      'Slow broker disk, network saturation, or GC pause prevents a follower from fetching within replica.lag.time.max.ms, causing the leader to evict it from the ISR.',
    immediateMitigation: [
      'Inspect lagging broker disk utilization, page cache hit rate, and NIC saturation.',
      'Do NOT enable unclean.leader.election=true on durable topics (risks silent data loss).',
      'Throttle non-critical partition reassignments so catch-up fetch traffic clears.',
    ],
    permanentFix:
      'Run replication factor >= 3 with min.insync.replicas=2 and acks=all; alert on follower fetch lag before ISR eviction occurs.',
  },
  {
    id: 'rb-hot-shard-saturation',
    code: 'RB-07',
    title: 'Monotonic-Key Range-Shard Hotspot Saturation',
    severity: 'SEV-2',
    domainId: 'partitioning',
    conceptId: 'sharding-rebalancing',
    reproScenarioId: 'range-scale-out',
    incidentId: 'range-shard-hotspot',
    breachedInvariant: 'Load Balance: maxShardLoad <= 1.5 × avgShardLoad',
    telemetrySignals: [
      'One shard node at 95%+ CPU while sibling shards sit under 15% CPU',
      'P99 insert latency climbing despite adding fresh nodes to the cluster',
      'All writes targeting the rightmost key range (timestamp or serial ID)',
    ],
    rootCause:
      'Range sharding on a monotonically increasing primary key concentrates 100% of live writes onto the single tail tablet regardless of total cluster size.',
    immediateMitigation: [
      'Enable request shedding / rate-limiting on the hot tenant to protect healthy shards.',
      'Manually split the hot range if key prefix cardinality permits.',
    ],
    permanentFix:
      'Prefix monotonic keys with a deterministic hash/tenant bucket (`hash(tenant) % B + timestamp`) or switch write-heavy non-scan workloads to Consistent Hashing with virtual nodes.',
  },
  {
    id: 'rb-gossip-convergence-stall',
    code: 'RB-08',
    title: 'Gossip Anti-Entropy Convergence Tail Stall',
    severity: 'SEV-2',
    domainId: 'replication',
    conceptId: 'gossip-anti-entropy',
    reproScenarioId: 'failure-and-recovery',
    breachedInvariant: 'Epidemic Convergence: divergentNodes == 0 within O(log N) rounds',
    telemetrySignals: [
      'Cluster membership views disagreeing across a subset of recovered nodes',
      'Long convergence tail where 1–2 peers remain stale after a rolling restart',
      'Pure push-gossip packet rate high while stale-node count stays flat',
    ],
    rootCause:
      'Pure Push gossip loses efficiency in the tail when most peers are already informed, or packet loss drops single-fanout rumor rounds to a recently recovered node.',
    immediateMitigation: [
      'Trigger an explicit Pull / Push-Pull anti-entropy sync on lagging nodes.',
      'Verify UDP/TCP gossip port reachability and MTU settings across subnets.',
    ],
    permanentFix:
      'Use Push-Pull gossip (quadratic tail convergence) with fanout >= 2 and periodic Merkle-tree anti-entropy digests for guaranteed state healing.',
  },
] as const;

export function filterRunbooks(
  domainId: ConceptDomainId | 'all',
  severity: RunbookSeverity | 'all',
  query: string
): FailureRunbook[] {
  const q = query.trim().toLowerCase();
  return FAILURE_RUNBOOKS.filter((rb) => {
    if (domainId !== 'all' && rb.domainId !== domainId) return false;
    if (severity !== 'all' && rb.severity !== severity) return false;
    if (!q) return true;
    const haystack = [
      rb.code,
      rb.title,
      rb.breachedInvariant,
      rb.rootCause,
      rb.permanentFix,
      ...rb.telemetrySignals,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
