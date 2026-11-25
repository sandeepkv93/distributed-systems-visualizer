import { ConceptDomainId } from './catalog';

export type DrillCategory = 'Invariant' | 'Complexity' | 'Failure Mode' | 'Paper Theorem';

export interface ProtocolFlashcard {
  id: string;
  conceptId: string;
  domainId: ConceptDomainId;
  category: DrillCategory;
  citation: string;
  formula: string;
  prompt: string;
  answer: string;
  keyTakeaway: string;
}

export const DRILL_MASTER_SEAL_THRESHOLD = 10;

export const PROTOCOL_FLASHCARDS: readonly ProtocolFlashcard[] = [
  {
    id: 'drill-cap-theorem',
    conceptId: 'cap-theorem',
    domainId: 'replication',
    category: 'Paper Theorem',
    citation: 'Gilbert & Lynch 2002',
    formula: 'Under P: Linearizability (C) XOR Total Availability (A)',
    prompt: 'Why is "pick any 2 of C, A, P" technically misleading for real distributed networks?',
    answer:
      'Network partitions (P) are an unavoidable fault of asynchronous networks, not a feature you can opt out of. During normal operation without a partition, a system can be both C and A; when a partition occurs, it must choose between rejecting writes/reads on the minority side (CP) or serving potentially divergent state (AP).',
    keyTakeaway: 'PACELC extends CAP: even without a partition (E), you still trade Latency (L) vs Consistency (C).',
  },
  {
    id: 'drill-lamport-clocks',
    conceptId: 'lamport-clocks',
    domainId: 'time-causality',
    category: 'Invariant',
    citation: 'Lamport 1978',
    formula: 'a -> b  =>  L(a) < L(b)  (converse false)',
    prompt: 'What are the two update rules for a scalar Lamport clock, and what limitation does it have?',
    answer:
      'On any local event or send, increment L := L + 1. On receiving a message carrying timestamp t, set L := max(L, t) + 1. Because it compresses causality into a single integer, L(a) < L(b) does NOT prove a happened-before b—they could be concurrent.',
    keyTakeaway: 'Break ties with process ID (L, pid) to obtain an arbitrary total order consistent with causality.',
  },
  {
    id: 'drill-vector-clocks',
    conceptId: 'vector-clocks',
    domainId: 'time-causality',
    category: 'Complexity',
    citation: 'Fidge 1988 · Mattern 1988',
    formula: 'a || b  <=>  !(V(a) <= V(b)) && !(V(b) <= V(a))',
    prompt: 'How do Vector Clocks detect concurrent updates, and what is their space/metadata cost?',
    answer:
      'Each node maintains an N-element vector merged component-wise on receive (max). Two events are concurrent iff neither vector dominates the other across every index. The exact causality guarantee costs O(N) metadata per message and per stored object.',
    keyTakeaway: 'Production stores like Dynamo bound vector growth via pruning or Dotted Version Vectors.',
  },
  {
    id: 'drill-chandy-lamport',
    conceptId: 'chandy-lamport',
    domainId: 'time-causality',
    category: 'Invariant',
    citation: 'Chandy & Lamport 1985',
    formula: 'FIFO channel + Marker => Consistent Global Cut',
    prompt: 'How does Chandy-Lamport capture in-flight network messages without stopping the world?',
    answer:
      'When a process receives its first Marker, it records its local state, broadcasts Markers on all outgoing channels, and begins logging incoming application messages on every other channel until a Marker arrives on each of those channels. FIFO ordering ensures Markers cleanly delimit pre- vs post-cut traffic.',
    keyTakeaway: 'Used in Apache Flink’s asynchronous barrier snapshotting for exactly-once stream recovery.',
  },
  {
    id: 'drill-eventual-consistency',
    conceptId: 'eventual-consistency',
    domainId: 'replication',
    category: 'Failure Mode',
    citation: 'Vogels 2009',
    formula: 'Convergence requires deterministic merge + anti-entropy',
    prompt: 'Why is Last-Write-Wins (LWW) with physical wall-clock timestamps dangerous under concurrent writes?',
    answer:
      'NTP clock skew between servers can cause a newer write with a slightly slower clock to be silently discarded in favor of an older write with a faster clock—producing irreversible silent data loss with no error returned to the client.',
    keyTakeaway: 'Prefer version vectors, hybrid logical clocks (HLC), or semantic CRDT merges over raw LWW.',
  },
  {
    id: 'drill-crdts',
    conceptId: 'crdts',
    domainId: 'replication',
    category: 'Invariant',
    citation: 'Shapiro et al. 2011',
    formula: 'a ⊔ b: Commutative · Associative · Idempotent',
    prompt: 'What three algebraic laws define a State-Based CRDT (CvRDT) merge function, and why?',
    answer:
      'Commutativity (order of delivery does not matter), Associativity (grouping of merges does not matter), and Idempotency (duplicate messages have zero effect). Together they form a join-semilattice guaranteeing Strong Eventual Consistency with 0-RTT local writes.',
    keyTakeaway: 'OR-Sets solve the add/remove race by tagging each add with a unique dot so concurrent add wins over remove.',
  },
  {
    id: 'drill-gossip-anti-entropy',
    conceptId: 'gossip-anti-entropy',
    domainId: 'replication',
    category: 'Complexity',
    citation: 'Demers et al. 1987',
    formula: 'Dissemination rounds = O(log N)  ·  Push-Pull fastest tail',
    prompt: 'Why does Push-Pull gossip converge quadratically faster than pure Push gossip in the final rounds?',
    answer:
      'Pure Push spreads exponentially at first but stalls in the tail when almost all peers are already infected and random probes wastefully hit informed nodes. Adding Pull lets the few remaining uninformed nodes actively query random peers and immediately recover the latest state.',
    keyTakeaway: 'Gossip scales to thousands of nodes with constant O(fanout) per-node bandwidth per round.',
  },
  {
    id: 'drill-merkle-anti-entropy',
    conceptId: 'merkle-anti-entropy',
    domainId: 'replication',
    category: 'Complexity',
    citation: 'DeCandia et al. 2007',
    formula: 'O(1) equal check · O(k log M) diff exchange',
    prompt: 'How do Merkle trees reduce background anti-entropy bandwidth between two replicas holding millions of keys?',
    answer:
      'Replicas compare a single top-level root hash first—if identical, zero keys are transferred. When hashes differ, they recursively descend only mismatched subtrees in O(log M) rounds to pinpoint the exact divergent leaf ranges.',
    keyTakeaway: 'Used in Cassandra nodetool repair and Dynamo to repair silent bit-rot and missed hinted handoffs.',
  },
  {
    id: 'drill-quorum-replication',
    conceptId: 'quorum-replication',
    domainId: 'replication',
    category: 'Invariant',
    citation: 'Gifford 1979',
    formula: 'W + R > N  =>  |Q_w ∩ Q_r| >= W + R - N >= 1',
    prompt: 'Does setting W + R > N in a Dynamo-style store automatically guarantee linearizability?',
    answer:
      'No! W + R > N guarantees read/write overlap when all replicas are healthy, but sloppy quorums, concurrent writes with clock skew, or a partial write observed by one reader before read-repair finishes can still produce non-linearizable histories.',
    keyTakeaway: 'True linearizability over quorums requires ABD two-phase read-writeback or consensus.',
  },
  {
    id: 'drill-replication-log',
    conceptId: 'replication-log',
    domainId: 'replication',
    category: 'Invariant',
    citation: 'Kreps et al. 2011 (Kafka)',
    formula: 'HW <= min(LEO of all ISR replicas)',
    prompt: 'What is the High Watermark (HW) in a Kafka-style partition, and why can consumers never read past it?',
    answer:
      'The High Watermark is the highest offset replicated across every replica currently in the In-Sync Replica (ISR) set. Exposing uncommitted entries above HW would let consumers observe records that disappear if the leader crashes before replication completes.',
    keyTakeaway: 'Setting acks=all with min.insync.replicas >= 2 prevents acknowledged data loss on single broker failure.',
  },
  {
    id: 'drill-failure-detectors',
    conceptId: 'failure-detectors',
    domainId: 'consensus',
    category: 'Paper Theorem',
    citation: 'Hayashibara 2004 · Das 2002 (SWIM)',
    formula: 'φ(t) = -log10(P_later(t))  ·  Indirect ping-req',
    prompt: 'How does Phi Accrual improve on fixed binary heartbeat timeouts, and how does SWIM reduce false positives?',
    answer:
      'Phi Accrual outputs a continuous suspicion score φ derived from the historical heartbeat inter-arrival distribution, adapting automatically to network jitter. SWIM asks k random peers to indirectly probe an unresponsive node before marking it suspect, masking asymmetric link drops.',
    keyTakeaway: 'In asynchronous networks, FLP guarantees no failure detector can simultaneously be 100% accurate and complete.',
  },
  {
    id: 'drill-consistent-hashing',
    conceptId: 'consistent-hashing',
    domainId: 'partitioning',
    category: 'Complexity',
    citation: 'Karger et al. 1997',
    formula: 'Keys moved on join/leave ≈ K / N',
    prompt: 'What problem occurs with hash(key) mod N when a node crashes, and how do consistent hashing + vnodes solve it?',
    answer:
      'Modulo hashing remaps almost 100% of keys when N changes, causing catastrophic cache stampedes. Consistent hashing maps nodes and keys onto a ring so adding/removing a node shifts only ~K/N keys; virtual nodes smooth arc variance and spread failover across all survivors.',
    keyTakeaway: 'Bounded-load consistent hashing further caps per-server load at (1 + ε) × average during hot-key spikes.',
  },
  {
    id: 'drill-sharding-rebalancing',
    conceptId: 'sharding-rebalancing',
    domainId: 'partitioning',
    category: 'Failure Mode',
    citation: 'Chang et al. 2006 (Bigtable)',
    formula: 'Range = fast scans, hotspot risk · Hash = uniform, scatter-gather scans',
    prompt: 'When should you choose Range Sharding over Hash Sharding, and what operational pitfall must you guard against?',
    answer:
      'Choose Range Sharding when workloads execute ordered range scans (e.g., time-series windows or lexicographic prefix queries). Guard against monotonic-key write hotspots where every new insert lands on the single rightmost tail tablet.',
    keyTakeaway: 'Automatic range splitting (Spanner, CockroachDB, TiKV) isolates hot ranges dynamically.',
  },
  {
    id: 'drill-load-balancing',
    conceptId: 'load-balancing',
    domainId: 'partitioning',
    category: 'Paper Theorem',
    citation: 'Mitzenmacher 2001',
    formula: 'Power of Two Choices (P2C): max load O(log log N)',
    prompt: 'Why does Power of Two Random Choices (P2C) outperform both global round-robin and purely random routing?',
    answer:
      'Pure random routing creates O(log N / log log N) queue spikes, while global least-connections requires expensive synchronized state across all LBs and suffers herd-effect oscillation. Sampling just 2 random backends and picking the less-loaded one drops max queue depth exponentially to O(log log N).',
    keyTakeaway: 'Pair P2C with load shedding and bounded queues to avoid cascading retry storms.',
  },
  {
    id: 'drill-distributed-locking',
    conceptId: 'distributed-locking',
    domainId: 'coordination',
    category: 'Failure Mode',
    citation: 'Burrows 2006 (Chubby) · Kleppmann 2016',
    formula: 'Storage rejects write if token < maxSeenFencingToken',
    prompt: 'Why are TTL leases alone insufficient for mutual exclusion correctness during JVM GC pauses?',
    answer:
      'A client can check its lease, freeze in a stop-the-world GC pause longer than the TTL while another client acquires the lease, and then resume and execute a stale write. Only monotonic fencing tokens verified by the storage server prevent corruption.',
    keyTakeaway: 'Use leases for efficiency (avoiding duplicate work), but fencing tokens for safety.',
  },
  {
    id: 'drill-two-phase-commit',
    conceptId: 'two-phase-commit',
    domainId: 'coordination',
    category: 'Failure Mode',
    citation: 'Gray 1978',
    formula: 'Coordinator crash in Phase 2 => PREPARED participants block',
    prompt: 'Why is Two-Phase Commit called a blocking atomic commit protocol?',
    answer:
      'After a participant votes YES and enters PREPARED, it has promised to honor whichever decision (COMMIT or ABORT) the coordinator logged. If the coordinator crashes before broadcasting the decision, participants cannot unilaterally abort or commit and must hold locks indefinitely until recovery.',
    keyTakeaway: 'Spanner and CockroachDB eliminate 2PC’s single-point blocking by replicating the coordinator via Paxos/Raft.',
  },
  {
    id: 'drill-distributed-transactions',
    conceptId: 'distributed-transactions',
    domainId: 'coordination',
    category: 'Invariant',
    citation: 'Garcia-Molina & Salem 1987',
    formula: 'T1, T2, ..., Tn  with compensations  Cn, ..., C1',
    prompt: 'Which ACID property does the Saga pattern intentionally give up compared to 2PC, and how do engineers cope?',
    answer:
      'Sagas give up Isolation (I): intermediate local commits are immediately visible to other transactions before the saga finishes. Applications must design semantic countermeasures (idempotent steps, pending/reserved states, and compensating refunds) to handle anomalies like dirty reads.',
    keyTakeaway: 'Every compensating transaction C_i must be idempotent and retriable until it succeeds.',
  },
  {
    id: 'drill-network-partitions',
    conceptId: 'network-partitions',
    domainId: 'consensus',
    category: 'Invariant',
    citation: 'Davidson et al. 1985',
    formula: 'Quorum intersection prevents dual-leader split-brain',
    prompt: 'How does quorum majority voting prevent two leaders from committing conflicting writes during a network partition?',
    answer:
      'Because any two strict majorities (> N/2) must intersect in at least one node, at most one side of a network partition can ever form a quorum. The minority partition cannot elect a new leader or commit entries, while a stale isolated leader’s AppendEntries never gather enough ACKs.',
    keyTakeaway: 'Always deploy odd cluster sizes (3, 5, 7) since even sizes (4, 6) tolerate no extra failures while raising quorum cost.',
  },
  {
    id: 'drill-paxos',
    conceptId: 'paxos',
    domainId: 'consensus',
    category: 'Invariant',
    citation: 'Lamport 1998',
    formula: 'Proposer must adopt value of highest accepted ballot in Promise quorum',
    prompt: 'In Paxos Phase 2 (Accept), why must a proposer adopt the value with the highest ballot number returned in Phase 1 Promises?',
    answer:
      'Because that value may already have been chosen by an earlier majority quorum. By adopting the highest-numbered accepted value from a majority of acceptors (which intersects every prior majority), Paxos preserves Agreement across competing proposers.',
    keyTakeaway: 'Basic Paxos can livelock under dueling proposers unless stabilized by randomized backoff or a Multi-Paxos leader.',
  },
  {
    id: 'drill-raft',
    conceptId: 'raft',
    domainId: 'consensus',
    category: 'Invariant',
    citation: 'Ongaro & Ousterhout 2014',
    formula: 'Election Safety · Leader Completeness · Log Matching',
    prompt: 'How does Raft’s election restriction guarantee Leader Completeness without needing to transfer missing entries upward?',
    answer:
      'A voter only grants RequestVote if the candidate’s log is at least as up-to-date as its own (higher lastLogTerm, or equal term and >= lastLogIndex). Since every committed entry resides on a majority and a winning candidate needs a majority of votes, the overlap ensures the new leader holds all committed entries.',
    keyTakeaway: 'Combine with the Figure 8 rule: only commit entries from the current term by counting replicas.',
  },
  {
    id: 'drill-consensus-variants',
    conceptId: 'consensus-variants',
    domainId: 'consensus',
    category: 'Complexity',
    citation: 'Moraru et al. 2013 (EPaxos)',
    formula: 'Multi-Paxos: 1 RTT via leader · EPaxos: 1 RTT leaderless fast quorum',
    prompt: 'What bottleneck in Raft/Multi-Paxos does EPaxos eliminate in geo-distributed WAN deployments?',
    answer:
      'Raft and Multi-Paxos force every write worldwide to forward to a single leader region (adding cross-ocean WAN latency). EPaxos lets any nearby replica commit non-interfering commands in 1 WAN RTT using a fast-path quorum of F + floor((F+1)/2), falling back to 2 RTTs only on dependency conflicts.',
    keyTakeaway: 'Leaderless consensus shines when cross-region keys have low conflict rates; Raft wins on simplicity under high contention.',
  },
  {
    id: 'drill-pbft',
    conceptId: 'pbft',
    domainId: 'consensus',
    category: 'Complexity',
    citation: 'Castro & Liskov 1999',
    formula: 'N = 3f + 1 · Quorum = 2f + 1 · O(N²) messages/slot',
    prompt: 'Why does PBFT require N >= 3f + 1 replicas instead of 2f + 1, and what limits its cluster size?',
    answer:
      'Up to f nodes may stay silent (requiring quorums of size N - f for liveness), AND up to f other nodes in the quorum may lie maliciously. For two quorums to share at least 1 honest node, 2(N - f) - N >= f + 1 => N >= 3f + 1. All-to-all Prepare and Commit rounds cost O(N²) messages, capping classic PBFT around ~20 nodes.',
    keyTakeaway: 'Modern BFT protocols (HotStuff, Tendermint) use threshold signatures to reduce leader rounds to O(N).',
  },
] as const;

export const TOTAL_DRILLS = PROTOCOL_FLASHCARDS.length;

export function filterDrills(domainId: ConceptDomainId | 'all'): ProtocolFlashcard[] {
  if (domainId === 'all') return [...PROTOCOL_FLASHCARDS];
  return PROTOCOL_FLASHCARDS.filter((card) => card.domainId === domainId);
}

export function computeDrillStats(masteredIds: readonly string[]): {
  masteredCount: number;
  totalCount: number;
  percentage: number;
  sealEarned: boolean;
} {
  const validIds = new Set(PROTOCOL_FLASHCARDS.map((c) => c.id));
  const masteredUnique = new Set(masteredIds.filter((id) => validIds.has(id)));
  const masteredCount = masteredUnique.size;
  const totalCount = PROTOCOL_FLASHCARDS.length;
  return {
    masteredCount,
    totalCount,
    percentage: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
    sealEarned: masteredCount >= DRILL_MASTER_SEAL_THRESHOLD,
  };
}
