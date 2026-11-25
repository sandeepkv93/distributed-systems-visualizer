import { ConceptDomainId } from './catalog';

export interface GlossaryEntry {
  id: string;
  term: string;
  symbol?: string;
  domainId: ConceptDomainId;
  definition: string;
  citation?: string;
  conceptIds: readonly string[];
}

export const GLOSSARY_ENTRIES: readonly GlossaryEntry[] = [
  {
    id: 'anti-entropy',
    term: 'Anti-Entropy',
    symbol: 'sync(R_i, R_j)',
    domainId: 'replication',
    definition:
      'Background pairwise state reconciliation (via Gossip or Merkle trees) that detects and repairs silent replica divergence after missed writes or network partitions.',
    citation: 'Demers et al. 1987',
    conceptIds: ['gossip-anti-entropy', 'merkle-anti-entropy'],
  },
  {
    id: 'atomic-commit',
    term: 'Atomic Commit',
    symbol: '∀i,j: dec(i) = dec(j)',
    domainId: 'coordination',
    definition:
      'Guarantee that all participants in a distributed transaction either unanimously commit or unanimously abort—never a mixed outcome.',
    citation: 'Gray 1978',
    conceptIds: ['two-phase-commit', 'distributed-transactions'],
  },
  {
    id: 'backpressure',
    term: 'Backpressure & Load Shedding',
    symbol: 'queue > cap => shed',
    domainId: 'partitioning',
    definition:
      'Explicitly signaling upstream callers to slow down or dropping excess traffic early so overloaded workers keep bounded latency instead of collapsing via retry storms.',
    conceptIds: ['load-balancing'],
  },
  {
    id: 'ballot-number',
    term: 'Ballot / Proposal Number',
    symbol: 'n = (round, proposerId)',
    domainId: 'consensus',
    definition:
      'Globally unique, totally ordered identifier attached to Paxos Prepare and Accept phases so acceptors can safely ignore stale proposers.',
    citation: 'Lamport 1998',
    conceptIds: ['paxos'],
  },
  {
    id: 'byzantine-fault',
    term: 'Byzantine Fault Tolerance (BFT)',
    symbol: 'N >= 3f + 1',
    domainId: 'consensus',
    definition:
      'Ability of a cluster to reach safe agreement even when up to f replicas exhibit arbitrary, equivocating, or malicious behavior.',
    citation: 'Lamport, Shostak & Pease 1982 · Castro & Liskov 1999',
    conceptIds: ['pbft'],
  },
  {
    id: 'cap-theorem',
    term: 'CAP Theorem',
    symbol: 'P => C XOR A',
    domainId: 'replication',
    definition:
      'During a network partition (P), a distributed data store must choose between Linearizable Consistency (C) and Total Availability (A).',
    citation: 'Brewer 2000 · Gilbert & Lynch 2002',
    conceptIds: ['cap-theorem', 'network-partitions'],
  },
  {
    id: 'causal-consistency',
    term: 'Causal Consistency',
    symbol: 'a → b => order(a) < order(b)',
    domainId: 'time-causality',
    definition:
      'Strongest consistency model achievable while remaining available under partitions: causally related operations appear in the same order everywhere, while concurrent writes may differ.',
    citation: 'Ahamad et al. 1995',
    conceptIds: ['vector-clocks', 'crdts'],
  },
  {
    id: 'commit-wait',
    term: 'Commit-Wait (TrueTime)',
    symbol: 'sleep(2ε)',
    domainId: 'time-causality',
    definition:
      'Google Spanner technique where a coordinator delays releasing commit locks for twice the clock uncertainty bound (2ε) so commit timestamps reflect true real-time order.',
    citation: 'Corbett et al. 2012',
    conceptIds: ['lamport-clocks', 'two-phase-commit'],
  },
  {
    id: 'compensating-tx',
    term: 'Compensating Transaction (Saga)',
    symbol: 'T1..Tk => Ck..C1',
    domainId: 'coordination',
    definition:
      'Semantic undo operation executed in reverse order when a downstream Saga step fails, restoring business invariants without holding cross-service locks.',
    citation: 'Garcia-Molina & Salem 1987',
    conceptIds: ['distributed-transactions'],
  },
  {
    id: 'consistent-cut',
    term: 'Consistent Global Cut',
    symbol: 'e2 ∈ Cut ∧ e1 → e2 => e1 ∈ Cut',
    domainId: 'time-causality',
    definition:
      'Global snapshot across processes that never includes the receipt of a message without also including its corresponding send event.',
    citation: 'Chandy & Lamport 1985',
    conceptIds: ['chandy-lamport'],
  },
  {
    id: 'consistent-hashing',
    term: 'Consistent Hashing',
    symbol: 'E[moved] ≈ K / N',
    domainId: 'partitioning',
    definition:
      'Ring-based key mapping where adding or removing a server remaps only ~1/N of the keyspace rather than invalidating nearly all keys as in modulo hashing.',
    citation: 'Karger et al. 1997',
    conceptIds: ['consistent-hashing'],
  },
  {
    id: 'crash-fault-tolerance',
    term: 'Crash Fault Tolerance (CFT)',
    symbol: 'N >= 2f + 1',
    domainId: 'consensus',
    definition:
      'Resilience against up to f fail-stop (silent crash/restart) nodes using strict majority quorums of size f + 1.',
    citation: 'Lamport 1998 · Ongaro & Ousterhout 2014',
    conceptIds: ['raft', 'paxos'],
  },
  {
    id: 'crdt',
    term: 'CRDT (Conflict-Free Replicated Data Type)',
    symbol: 'a ⊔ b = b ⊔ a',
    domainId: 'replication',
    definition:
      'Data structure whose merge operator is commutative, associative, and idempotent (a join-semilattice), guaranteeing Strong Eventual Consistency with 0-RTT local writes.',
    citation: 'Shapiro et al. 2011',
    conceptIds: ['crdts'],
  },
  {
    id: 'election-safety',
    term: 'Election Safety',
    symbol: '|leaders(term)| <= 1',
    domainId: 'consensus',
    definition:
      'Fundamental Raft invariant ensuring at most one leader can ever be elected in a given term, enforced by single-vote-per-term rules and intersecting majorities.',
    citation: 'Ongaro & Ousterhout 2014',
    conceptIds: ['raft', 'network-partitions'],
  },
  {
    id: 'eventual-consistency',
    term: 'Eventual Consistency',
    symbol: 'quiescent => ∀i,j: state_i = state_j',
    domainId: 'replication',
    definition:
      'Liveness guarantee that if no new updates are issued to an object, all healthy replicas will eventually converge to the exact same value.',
    citation: 'Vogels 2009',
    conceptIds: ['eventual-consistency', 'gossip-anti-entropy'],
  },
  {
    id: 'fencing-token',
    term: 'Fencing Token',
    symbol: 'reject if token < maxSeen',
    domainId: 'coordination',
    definition:
      'Strictly monotonic number issued by a lock service on each lease grant and checked by the storage server to block late writes from GC-paused stale lock holders.',
    citation: 'Burrows 2006 · Kleppmann 2016',
    conceptIds: ['distributed-locking'],
  },
  {
    id: 'flp-impossibility',
    term: 'FLP Impossibility Theorem',
    symbol: 'Async + 1 crash => no det. consensus',
    domainId: 'consensus',
    definition:
      'Proof that in a purely asynchronous network, no deterministic consensus algorithm can guarantee both safety and liveness if even a single node may crash.',
    citation: 'Fischer, Lynch & Paterson 1985',
    conceptIds: ['paxos', 'raft', 'failure-detectors'],
  },
  {
    id: 'gossip-protocol',
    term: 'Gossip (Epidemic Dissemination)',
    symbol: 'O(log N) rounds',
    domainId: 'replication',
    definition:
      'Decentralized peer-to-peer state exchange where each node periodically syncs with a small random fanout of peers, reaching cluster-wide convergence in logarithmic rounds.',
    citation: 'Demers et al. 1987',
    conceptIds: ['gossip-anti-entropy'],
  },
  {
    id: 'happens-before',
    term: 'Happens-Before Relation',
    symbol: 'a → b',
    domainId: 'time-causality',
    definition:
      'Strict partial order defined by program order within a process, message send-to-receive pairs, and transitivity—capturing potential causality without physical clocks.',
    citation: 'Lamport 1978',
    conceptIds: ['lamport-clocks', 'vector-clocks'],
  },
  {
    id: 'high-watermark',
    term: 'High Watermark (HW) & LEO',
    symbol: 'HW <= min(ISR LEO)',
    domainId: 'replication',
    definition:
      'In Kafka-style logs, LEO is a replica’s Log End Offset and HW is the highest offset durably replicated across every In-Sync Replica (the ceiling visible to consumers).',
    citation: 'Kreps et al. 2011',
    conceptIds: ['replication-log'],
  },
  {
    id: 'hlc',
    term: 'Hybrid Logical Clock (HLC)',
    symbol: '(l, c)',
    domainId: 'time-causality',
    definition:
      '64-bit timestamp combining a physical wall-clock component l with a logical counter c so causal ordering (a → b ⇒ HLC(a) < HLC(b)) holds even under NTP clock skew.',
    citation: 'Kulkarni et al. 2014',
    conceptIds: ['lamport-clocks', 'vector-clocks'],
  },
  {
    id: 'isr',
    term: 'In-Sync Replicas (ISR)',
    symbol: '|ISR| >= min.insync.replicas',
    domainId: 'replication',
    definition:
      'Dynamic set of log followers caught up within the leader’s lag threshold; only ISR members are eligible for clean leader election without data loss.',
    citation: 'Kreps et al. 2011',
    conceptIds: ['replication-log'],
  },
  {
    id: 'joint-consensus',
    term: 'Joint Consensus Reconfiguration',
    symbol: 'C_old,new = Q(C_old) ∧ Q(C_new)',
    domainId: 'consensus',
    definition:
      'Raft membership-change phase requiring simultaneous majorities from both the old and new configurations so two disjoint majorities can never elect competing leaders.',
    citation: 'Ongaro & Ousterhout 2014',
    conceptIds: ['consensus-variants', 'raft'],
  },
  {
    id: 'lamport-clock',
    term: 'Lamport Logical Clock',
    symbol: 'a → b => L(a) < L(b)',
    domainId: 'time-causality',
    definition:
      'O(1) scalar logical counter incremented on local/send events and updated via max(L, msg) + 1 on receive; preserves causality in one direction but cannot distinguish concurrency.',
    citation: 'Lamport 1978',
    conceptIds: ['lamport-clocks'],
  },
  {
    id: 'leader-completeness',
    term: 'Leader Completeness',
    symbol: 'committed(t1) => present in leader(t2 > t1)',
    domainId: 'consensus',
    definition:
      'Raft safety property guaranteeing any entry committed in a given term will be present in the logs of all leaders elected for higher terms.',
    citation: 'Ongaro & Ousterhout 2014',
    conceptIds: ['raft'],
  },
  {
    id: 'linearizability',
    term: 'Linearizability (Strong Consistency)',
    symbol: 'Real-time atomic single-copy order',
    domainId: 'replication',
    definition:
      'Strongest single-object consistency guarantee: every operation appears to take effect instantaneously at a point between its invocation and response.',
    citation: 'Herlihy & Wing 1990',
    conceptIds: ['raft', 'paxos', 'cap-theorem'],
  },
  {
    id: 'merkle-tree',
    term: 'Merkle Tree (Hash Tree)',
    symbol: 'O(1) equal · O(k log M) diff',
    domainId: 'replication',
    definition:
      'Hierarchical cryptographic hash tree over key ranges enabling two replicas to verify equality with a single root hash and localize divergent keys in logarithmic messages.',
    citation: 'Merkle 1979 · DeCandia et al. 2007',
    conceptIds: ['merkle-anti-entropy'],
  },
  {
    id: 'pacelc',
    term: 'PACELC Theorem',
    symbol: 'if P -> (A|C) else (L|C)',
    domainId: 'replication',
    definition:
      'Extension of CAP observing that even when no partition exists (E), distributed systems still trade off lower Latency (L) against stronger Consistency (C).',
    citation: 'Abadi 2012',
    conceptIds: ['cap-theorem', 'quorum-replication'],
  },
  {
    id: 'phi-accrual',
    term: 'Phi Accrual Failure Detector',
    symbol: 'φ(t) = -log10(P_later(t))',
    domainId: 'consensus',
    definition:
      'Adaptive failure detector emitting a continuous suspicion score φ based on historical heartbeat inter-arrival distributions rather than a brittle binary timeout.',
    citation: 'Hayashibara et al. 2004',
    conceptIds: ['failure-detectors'],
  },
  {
    id: 'power-of-two-choices',
    term: 'Power of Two Random Choices (P2C)',
    symbol: 'max load = O(log log N)',
    domainId: 'partitioning',
    definition:
      'Load-balancing strategy that probes just two random workers and routes to the less loaded one, exponentially reducing worst-case queue skew without global coordination.',
    citation: 'Mitzenmacher 2001',
    conceptIds: ['load-balancing'],
  },
  {
    id: 'quorum-intersection',
    term: 'Quorum Intersection',
    symbol: 'W + R > N  ·  |Q1 ∩ Q2| >= 1',
    domainId: 'replication',
    definition:
      'Mathematical property ensuring every read quorum shares at least one replica with every prior write quorum so readers can discover the latest version.',
    citation: 'Gifford 1979 · DeCandia et al. 2007',
    conceptIds: ['quorum-replication', 'paxos', 'raft'],
  },
  {
    id: 'range-sharding',
    term: 'Range Sharding',
    symbol: '[k_min, k_max] -> Shard_i',
    domainId: 'partitioning',
    definition:
      'Partitioning sorted contiguous key ranges across nodes to support fast ordered scans, requiring dynamic splitting or hash prefixing to prevent monotonic-key write hotspots.',
    citation: 'Chang et al. 2006',
    conceptIds: ['sharding-rebalancing'],
  },
  {
    id: 'read-repair',
    term: 'Read Repair',
    symbol: 'R returns {v2, v1} => push v2 to stale',
    domainId: 'replication',
    definition:
      'Opportunistic reconciliation where a quorum read coordinator detects a lagging replica returning an older version and asynchronously pushes the newer version back to it.',
    citation: 'DeCandia et al. 2007',
    conceptIds: ['quorum-replication', 'eventual-consistency'],
  },
  {
    id: 'safety-vs-liveness',
    term: 'Safety vs. Liveness',
    symbol: 'Safety: nothing bad · Liveness: eventually good',
    domainId: 'consensus',
    definition:
      'Formal dichotomy of protocol properties: Safety (e.g., never commit two conflicting values) must NEVER be violated, while Liveness (making progress) may pause during partitions.',
    citation: 'Alpern & Schneider 1985',
    conceptIds: ['raft', 'paxos', 'pbft'],
  },
  {
    id: 'split-brain',
    term: 'Split-Brain',
    symbol: 'Partition A leader ≠ Partition B leader',
    domainId: 'consensus',
    definition:
      'Hazardous failure state in which a network partition causes two isolated sub-clusters to each believe they hold exclusive leadership and accept conflicting writes.',
    citation: 'Davidson et al. 1985',
    conceptIds: ['network-partitions', 'raft'],
  },
  {
    id: 'vector-clock',
    term: 'Vector Clock',
    symbol: 'a → b <=> V(a) < V(b)',
    domainId: 'time-causality',
    definition:
      'O(N) array of logical counters capturing exact causal equivalence: V(a) < V(b) iff a happened-before b, and incomparable vectors prove true concurrency (a || b).',
    citation: 'Fidge 1988 · Mattern 1988',
    conceptIds: ['vector-clocks'],
  },
  {
    id: 'virtual-nodes',
    term: 'Virtual Nodes (Vnodes)',
    symbol: 'σ_load ∝ 1 / sqrt(V)',
    domainId: 'partitioning',
    definition:
      'Assigning multiple hash-ring tokens per physical server to smooth random arc-length skew and spread failover traffic evenly across all surviving peers.',
    citation: 'Karger et al. 1997 · DeCandia et al. 2007',
    conceptIds: ['consistent-hashing'],
  },
] as const;

export const TOTAL_GLOSSARY_TERMS = GLOSSARY_ENTRIES.length;

export function filterGlossary(
  domainId: ConceptDomainId | 'all',
  letter: string | 'all',
  query: string
): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  return GLOSSARY_ENTRIES.filter((entry) => {
    if (domainId !== 'all' && entry.domainId !== domainId) return false;
    if (letter !== 'all' && entry.term[0].toUpperCase() !== letter.toUpperCase()) return false;
    if (!q) return true;
    const hay = `${entry.term} ${entry.symbol ?? ''} ${entry.definition} ${entry.citation ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}
