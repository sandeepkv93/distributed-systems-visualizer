import type { ConceptDomainId } from './catalog';
import type { DuelId } from './duels';

export type PaperDecade = '1970s' | '1980s' | '1990s' | '2000s' | '2010s';

export interface PaperEntry {
  id: string;
  year: number;
  decade: PaperDecade;
  authors: string;
  title: string;
  venue: string;
  domainId: ConceptDomainId;
  faultModel: string;
  coreTheorem: string;
  keyTakeaway: string;
  conceptIds: readonly string[];
  duelIds?: readonly DuelId[];
}

export const BIBLIOGRAPHY: readonly PaperEntry[] = [
  {
    id: 'lamport-1978-clocks',
    year: 1978,
    decade: '1970s',
    authors: 'Leslie Lamport',
    title: 'Time, Clocks, and the Ordering of Events in a Distributed System',
    venue: 'Communications of the ACM, 21(7)',
    domainId: 'time-causality',
    faultModel: 'Asynchronous message passing',
    coreTheorem: 'a -> b  =>  L(a) < L(b) (Happens-Before Partial Order)',
    keyTakeaway:
      'Physical clocks drift; causal ordering can be captured with a single monotonic integer per process, plus deterministic tie-breaking for total order.',
    conceptIds: ['lamport-clocks'],
    duelIds: ['lamport-vs-vector'],
  },
  {
    id: 'gray-1978-2pc',
    year: 1978,
    decade: '1970s',
    authors: 'Jim Gray',
    title: 'Notes on Data Base Operating Systems (Two-Phase Commit)',
    venue: 'Operating Systems: An Advanced Course, Springer LNCS 60',
    domainId: 'coordination',
    faultModel: 'Crash-recovery with write-ahead logging',
    coreTheorem: 'Atomic Commit: all healthy participants either COMMIT or ABORT together',
    keyTakeaway:
      'Separating voting (Phase 1) from decision propagation (Phase 2) guarantees ACID atomicity across shards, at the cost of blocking if the coordinator fails mid-prepared.',
    conceptIds: ['two-phase-commit'],
    duelIds: ['2pc-vs-saga'],
  },
  {
    id: 'merkle-1979-trees',
    year: 1979,
    decade: '1970s',
    authors: 'Ralph C. Merkle',
    title: 'A Certified Digital Signature (Merkle Hash Trees)',
    venue: 'Stanford PhD Thesis / CRYPTO 1987',
    domainId: 'replication',
    faultModel: 'Replica state divergence & bandwidth-constrained sync',
    coreTheorem: 'O(log K) subtree comparison isolates divergent keys without transferring full state',
    keyTakeaway:
      'Hierarchical cryptographic hashes allow Dynamo-style replicas to detect and repair differing key ranges in logarithmic network round trips.',
    conceptIds: ['merkle-anti-entropy'],
  },
  {
    id: 'chandy-lamport-1985',
    year: 1985,
    decade: '1980s',
    authors: 'K. Mani Chandy & Leslie Lamport',
    title: 'Distributed Snapshots: Determining Global States of Distributed Systems',
    venue: 'ACM Transactions on Computer Systems (TOCS), 3(1)',
    domainId: 'time-causality',
    faultModel: 'Asynchronous FIFO channels (non-blocking)',
    coreTheorem: 'Marker messages capture a causally consistent global cut without halting execution',
    keyTakeaway:
      'By recording local state upon receiving the first marker and logging in-flight channel messages until markers arrive on every incoming edge, systems snapshot global state live.',
    conceptIds: ['chandy-lamport'],
  },
  {
    id: 'garcia-molina-1987-sagas',
    year: 1987,
    decade: '1980s',
    authors: 'Hector Garcia-Molina & Kenneth Salem',
    title: 'Sagas',
    venue: 'ACM SIGMOD International Conference on Management of Data',
    domainId: 'coordination',
    faultModel: 'Long-lived cross-service workflows & partial failure',
    coreTheorem: 'T1, T2, ..., Tn succeeds OR executes semantic compensations Ck ... C1 in reverse',
    keyTakeaway:
      'Breaking long-lived distributed transactions into independent local commits avoids global lock contention while recovering via explicit compensating actions.',
    conceptIds: ['distributed-transactions'],
    duelIds: ['2pc-vs-saga'],
  },
  {
    id: 'demers-1987-epidemic',
    year: 1987,
    decade: '1980s',
    authors: 'Alan Demers, Dan Greene, Carl Hauser, Wes Irish, John Larson, Scott Shenker et al.',
    title: 'Epidemic Algorithms for Replicated Database Maintenance',
    venue: 'ACM PODC',
    domainId: 'replication',
    faultModel: 'Large-scale decentralized peer churn',
    coreTheorem: 'Push-pull gossip converges across N nodes in O(log N) rounds',
    keyTakeaway:
      'Randomized peer-to-peer anti-entropy spreads updates exponentially fast with constant per-node overhead and no single point of failure.',
    conceptIds: ['gossip-anti-entropy', 'eventual-consistency'],
  },
  {
    id: 'fidge-mattern-1988-vectors',
    year: 1988,
    decade: '1980s',
    authors: 'Colin J. Fidge & Friedemann Mattern',
    title: 'Timestamps in Message-Passing Systems / Virtual Time and Global States',
    venue: 'Australian Computer Science Conf. / Parallel & Distributed Algorithms',
    domainId: 'time-causality',
    faultModel: 'Asynchronous message passing',
    coreTheorem: 'a -> b  <=>  V(a) < V(b) (Isomorphism with Happens-Before)',
    keyTakeaway:
      'Maintaining an O(N) vector of per-process counters captures exact causality and provably distinguishes concurrent writes from causally ordered ones.',
    conceptIds: ['vector-clocks'],
    duelIds: ['lamport-vs-vector'],
  },
  {
    id: 'gray-cheriton-1989-leases',
    year: 1989,
    decade: '1980s',
    authors: 'Cary G. Gray & David R. Cheriton',
    title: 'Leases: An Efficient Fault-Tolerant Mechanism for Distributed File Cache Consistency',
    venue: 'ACM SOSP',
    domainId: 'coordination',
    faultModel: 'Client crashes & bounded clock drift',
    coreTheorem: 'Time-bounded leases guarantee lock reclamation without waiting forever for dead clients',
    keyTakeaway:
      'Granting exclusive ownership for a finite TTL renewed via heartbeats prevents crashed holders from permanently deadlocking shared resources.',
    conceptIds: ['distributed-locking'],
  },
  {
    id: 'chandra-toueg-1996-fd',
    year: 1996,
    decade: '1990s',
    authors: 'Tushar Deepak Chandra & Sam Toueg',
    title: 'Unreliable Failure Detectors for Reliable Distributed Systems',
    venue: 'Journal of the ACM (JACM), 43(2)',
    domainId: 'time-causality',
    faultModel: 'Partial synchrony with crash faults',
    coreTheorem: 'Weakest failure detector <>W circumvents FLP impossibility to solve consensus',
    keyTakeaway:
      'Because asynchronous networks cannot distinguish a crashed node from a slow link, adaptive suspicion detectors (such as Phi Accrual) quantify liveness probabilistically.',
    conceptIds: ['failure-detectors'],
  },
  {
    id: 'karger-1997-hashing',
    year: 1997,
    decade: '1990s',
    authors: 'David Karger, Eric Lehman, Tom Leighton, Rina Panigrahy, Matthew Levine & Daniel Lewin',
    title: 'Consistent Hashing and Random Trees: Distributed Caching Protocols',
    venue: 'ACM STOC',
    domainId: 'partitioning',
    faultModel: 'Dynamic node joins, removals, and skewed workloads',
    coreTheorem: 'Adding or removing a server remaps only K / N keys in expectation',
    keyTakeaway:
      'Mapping both servers (via virtual nodes) and keys onto a circular hash ring eliminates catastrophic cache invalidation during cluster scaling.',
    conceptIds: ['consistent-hashing', 'load-balancing'],
    duelIds: ['hashing-vs-sharding'],
  },
  {
    id: 'lamport-1998-paxos',
    year: 1998,
    decade: '1990s',
    authors: 'Leslie Lamport',
    title: 'The Part-Time Parliament (Paxos)',
    venue: 'ACM Transactions on Computer Systems (TOCS), 16(2)',
    domainId: 'consensus',
    faultModel: 'Crash Fault Tolerant (f < N/2, asynchronous safety)',
    coreTheorem: 'Prepare/Promise + Accept/Accepted guarantees safety across any majority intersection',
    keyTakeaway:
      'Any two majorities share at least one acceptor, allowing stateless proposers to discover and preserve previously chosen values across arbitrary delays and crashes.',
    conceptIds: ['paxos', 'consensus-variants'],
    duelIds: ['raft-vs-paxos'],
  },
  {
    id: 'castro-liskov-1999-pbft',
    year: 1999,
    decade: '1990s',
    authors: 'Miguel Castro & Barbara Liskov',
    title: 'Practical Byzantine Fault Tolerance (PBFT)',
    venue: 'USENIX OSDI',
    domainId: 'consensus',
    faultModel: 'Byzantine / Arbitrary Faults (N >= 3f + 1)',
    coreTheorem: 'Three-phase PrePrepare -> Prepare -> Commit with 2f+1 quorums survives f malicious nodes',
    keyTakeaway:
      'All-to-all Prepare and Commit rounds with cryptographic digests prevent equivocating primaries from splitting honest replicas, backed by deterministic View Changes.',
    conceptIds: ['pbft'],
    duelIds: ['raft-vs-pbft'],
  },
  {
    id: 'gilbert-lynch-2002-cap',
    year: 2002,
    decade: '2000s',
    authors: 'Seth Gilbert & Nancy Lynch',
    title: 'Brewer’s Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services',
    venue: 'ACM SIGACT News, 33(2)',
    domainId: 'consensus',
    faultModel: 'Arbitrary network partitions',
    coreTheorem: 'Under a network partition (P), a service must forfeit either Linearizability (C) or Total Availability (A)',
    keyTakeaway:
      'Formalizes the unavoidable design fork when links sever: reject minority-side operations to preserve safety (CP) or accept diverging writes and reconcile later (AP).',
    conceptIds: ['cap-theorem', 'network-partitions'],
  },
  {
    id: 'chang-2006-bigtable',
    year: 2006,
    decade: '2000s',
    authors: 'Fay Chang, Jeffrey Dean, Sanjay Ghemawat, Wilson C. Hsieh, Deborah A. Wallach et al.',
    title: 'Bigtable: A Distributed Storage System for Structured Data',
    venue: 'USENIX OSDI',
    domainId: 'partitioning',
    faultModel: 'Horizontal tablet splitting & range-partitioned storage',
    coreTheorem: 'Contiguous lexicographic key ranges enable single-hop range scans with dynamic tablet rebalancing',
    keyTakeaway:
      'Range sharding preserves key locality for ordered scans, requiring active split/rebalance policies to mitigate monotonic write hotspots.',
    conceptIds: ['sharding-rebalancing'],
    duelIds: ['hashing-vs-sharding'],
  },
  {
    id: 'decandia-2007-dynamo',
    year: 2007,
    decade: '2000s',
    authors: 'Giuseppe DeCandia, Deniz Hastorun, Madan Jampani, Gunavardhan Kakulapati, Werner Vogels et al.',
    title: 'Dynamo: Amazon’s Highly Available Key-value Store',
    venue: 'ACM SOSP',
    domainId: 'replication',
    faultModel: 'Sloppy quorums, node outages, and always-writable AP storage',
    coreTheorem: 'Tunable quorums satisfy strict read-after-write overlap whenever W + R > N',
    keyTakeaway:
      'Combines consistent hashing, vector clocks, tunable W/R quorums, read repair, and Merkle anti-entropy into an iconic high-availability storage architecture.',
    conceptIds: ['quorum-replication'],
    duelIds: ['quorum-vs-crdts'],
  },
  {
    id: 'shapiro-2011-crdts',
    year: 2011,
    decade: '2010s',
    authors: 'Marc Shapiro, Nuno Preguiça, Carlos Baquero & Marek Zawirski',
    title: 'Conflict-Free Replicated Data Types (CRDTs)',
    venue: 'Symposium on Self-Stabilizing Systems (SSS)',
    domainId: 'replication',
    faultModel: 'Partition-tolerant, coordination-free multi-master replication',
    coreTheorem: 'Join-semilattice merges (commutative, associative, idempotent) guarantee Strong Eventual Consistency',
    keyTakeaway:
      'Designing data structures (G-Counters, OR-Sets, RGAs) whose merge operation forms a bounded semilattice lets replicas accept 0-RTT local writes and converge mathematically.',
    conceptIds: ['crdts'],
    duelIds: ['quorum-vs-crdts'],
  },
  {
    id: 'kreps-2011-kafka',
    year: 2011,
    decade: '2010s',
    authors: 'Jay Kreps, Neha Narkhede & Jun Rao',
    title: 'Kafka: a Distributed Messaging System for Log Processing',
    venue: 'ACM NetDB Workshop',
    domainId: 'replication',
    faultModel: 'Leader-follower append-only log with In-Sync Replicas (ISR)',
    coreTheorem: 'High Watermark (HW) advances only once every In-Sync Replica has replicated the offset',
    keyTakeaway:
      'Treating the partitioned append-only commit log as the primary abstraction unifies durable stream ingestion, follower catch-up, and consumer offset tracking.',
    conceptIds: ['replication-log'],
  },
  {
    id: 'ongaro-2014-raft',
    year: 2014,
    decade: '2010s',
    authors: 'Diego Ongaro & John Ousterhout',
    title: 'In Search of an Understandable Consensus Algorithm (Raft)',
    venue: 'USENIX ATC',
    domainId: 'consensus',
    faultModel: 'Crash Fault Tolerant (2f + 1, strong leader)',
    coreTheorem: 'Election Safety + Log Matching + Leader Completeness guarantee linearizable state machine replication',
    keyTakeaway:
      'Decomposing consensus into leader election, sequential log replication, and safety constraints achieves Paxos-equivalent guarantees with dramatically clearer operational mechanics.',
    conceptIds: ['raft'],
    duelIds: ['raft-vs-paxos', 'raft-vs-pbft'],
  },
];

export const PAPER_DECADES: readonly PaperDecade[] = ['1970s', '1980s', '1990s', '2000s', '2010s'];

export function filterBibliography(options: {
  decade?: PaperDecade | 'all';
  domainId?: ConceptDomainId | 'all';
  query?: string;
}): PaperEntry[] {
  const decade = options.decade ?? 'all';
  const domainId = options.domainId ?? 'all';
  const q = (options.query ?? '').trim().toLowerCase();

  return BIBLIOGRAPHY.filter((paper) => {
    if (decade !== 'all' && paper.decade !== decade) return false;
    if (domainId !== 'all' && paper.domainId !== domainId) return false;
    if (q) {
      const haystack =
        `${paper.year} ${paper.authors} ${paper.title} ${paper.venue} ${paper.coreTheorem} ${paper.keyTakeaway} ${paper.conceptIds.join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
