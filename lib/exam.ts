import { ConceptDomainId, CONCEPT_DOMAINS } from './catalog';

export interface ExamQuestion {
  id: string;
  number: string;
  domainId: ConceptDomainId;
  conceptId: string;
  citation: string;
  formula: string;
  prompt: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface DomainExamScore {
  domainId: ConceptDomainId;
  domainIndex: string;
  domainLabel: string;
  correct: number;
  total: number;
}

export interface QuestionGradeDetail {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

export interface ExamGradeResult {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  answeredCount: number;
  byDomain: DomainExamScore[];
  details: QuestionGradeDetail[];
}

export const EXAM_PASS_THRESHOLD = 8;

export const EXAM_QUESTIONS: readonly ExamQuestion[] = [
  {
    id: 'exam-vc-causality',
    number: '01',
    domainId: 'time-causality',
    conceptId: 'vector-clocks',
    citation: 'Fidge 1988 · Mattern 1988',
    formula: 'a -> b  <=>  V(a) < V(b)',
    prompt:
      'Event A has scalar Lamport timestamp L(A) = 4 and Event B has L(B) = 7 on different processes. What can you rigorously conclude about their causal relationship?',
    options: [
      'A definitely happened-before B (A -> B).',
      'B did not happen-before A, so either A -> B or A and B are concurrent (A || B).',
      'A and B are guaranteed to be concurrent because they occurred on distinct processes.',
      'A and B must share a common causal ancestor with timestamp 3.',
    ],
    correctIndex: 1,
    explanation:
      'Lamport clocks satisfy the one-way clock condition (a -> b => L(a) < L(b)). The contrapositive tells us L(A) < L(B) rules out B -> A, but cannot distinguish A -> B from concurrency (A || B). Exact causal equivalence requires O(N) Vector Clocks.',
  },
  {
    id: 'exam-cl-fifo',
    number: '02',
    domainId: 'time-causality',
    conceptId: 'chandy-lamport',
    citation: 'Chandy & Lamport 1985',
    formula: 'e2 in Cut && e1 -> e2  =>  e1 in Cut',
    prompt:
      'Why does the Chandy-Lamport distributed snapshot algorithm require FIFO communication channels between processes?',
    options: [
      'So that processes can agree on a single synchronized physical wall-clock timestamp.',
      'To pause all application traffic until every process acknowledges the snapshot.',
      'So that a Marker acts as an exact fence separating pre-snapshot messages from post-snapshot messages on each incoming channel.',
      'To guarantee that only one process ever initiates a snapshot across the cluster.',
    ],
    correctIndex: 2,
    explanation:
      'Because channels are FIFO, any application message sent before a Marker arrives before that Marker, and any message sent after arrives after. Recording messages that arrive on an incoming channel between local state capture and receiving that channel’s Marker captures exact in-flight channel state without pausing the system.',
  },
  {
    id: 'exam-raft-fig8',
    number: '03',
    domainId: 'consensus',
    conceptId: 'raft',
    citation: 'Ongaro & Ousterhout 2014 (Figure 8)',
    formula: 'commit(prevTerm) only via currentTerm majority',
    prompt:
      'In Raft, a newly elected leader in Term 4 discovers an uncommitted log entry from Term 2 that is already replicated on a majority of servers. Why must the leader NOT commit that Term 2 entry simply by counting replicas?',
    options: [
      'Because Raft followers reject AppendEntries RPCs containing entries from earlier terms.',
      'Because a future leader in Term 3 or Term 5 with a higher-term entry at the same index could still be elected and overwrite it, unless an entry from the leader’s current term (Term 4) is committed on a majority.',
      'Because Raft requires 100% of servers—not just a majority—to acknowledge entries from prior terms.',
      'Because log compaction deletes entries from previous terms immediately after an election.',
    ],
    correctIndex: 1,
    explanation:
      'Raft’s famous Figure 8 safety hazard shows that an old-term entry present on a majority can still be overwritten if a later leader with a higher-term entry wins election. Raft resolves this by only committing entries from the current term by counting replicas, which indirectly commits all preceding entries via the Log Matching Property.',
  },
  {
    id: 'exam-pbft-quorum',
    number: '04',
    domainId: 'consensus',
    conceptId: 'pbft',
    citation: 'Castro & Liskov 1999',
    formula: 'N = 3f + 1  ·  |Q1 ∩ Q2| >= f + 1',
    prompt:
      'A PBFT cluster uses N = 7 replicas to tolerate f = 2 Byzantine (arbitrary/malicious) nodes, with quorum size 2f + 1 = 5. What is the minimum number of HONEST replicas guaranteed to lie in the intersection of any two quorums?',
    options: [
      'At least 1 honest replica (intersection has >= 3 replicas, at most 2 are Byzantine).',
      'At least 2 honest replicas (intersection has >= 4 replicas).',
      '0 honest replicas—PBFT requires 4f + 1 nodes for honest quorum overlap.',
      'At least 3 honest replicas because Byzantine nodes cannot join quorums.',
    ],
    correctIndex: 0,
    explanation:
      'Any two quorums of size 2f + 1 = 5 in an N = 3f + 1 = 7 cluster intersect in at least (2f + 1) + (2f + 1) - (3f + 1) = f + 1 = 3 replicas. Since at most f = 2 replicas are Byzantine, at least (f + 1) - f = 1 honest replica is guaranteed to witness both quorums and prevent conflicting certificates.',
  },
  {
    id: 'exam-quorum-overlap',
    number: '05',
    domainId: 'replication',
    conceptId: 'quorum-replication',
    citation: 'Gifford 1979 · DeCandia et al. 2007',
    formula: 'W + R > N  (overlap >= W + R - N)',
    prompt:
      'A Dynamo-style key-value store replicates each key across N = 5 replicas. Which (W, R) configuration guarantees strict quorum intersection between every acknowledged write and subsequent read while minimizing read latency?',
    options: [
      'W = 2, R = 2 (total 4 <= 5)',
      'W = 3, R = 2 (total 5 <= 5)',
      'W = 4, R = 2 (total 6 > 5, overlap >= 1)',
      'W = 1, R = 4 (total 5 <= 5)',
    ],
    correctIndex: 2,
    explanation:
      'Strict quorum overlap requires W + R > N. With N = 5, W = 3, R = 2 sums to 5 (allowing disjoint write set {N1,N2,N3} and read set {N4,N5} to return stale data). W = 4, R = 2 sums to 6 > 5, guaranteeing at least 1 overlapping replica while keeping R = 2 fast.',
  },
  {
    id: 'exam-crdt-semilattice',
    number: '06',
    domainId: 'replication',
    conceptId: 'crdts',
    citation: 'Shapiro et al. 2011',
    formula: 'merge(a, b): Commutative · Associative · Idempotent',
    prompt:
      'Which algebraic properties must a state-based CRDT merge operator (⊔) satisfy to guarantee Strong Eventual Consistency (SEC) under arbitrary packet duplication, reordering, and temporary partitions?',
    options: [
      'Linearizability, serializability, and strict two-phase locking.',
      'Commutativity, associativity, and idempotency (forming a join-semilattice).',
      'Invertibility, distributivity, and synchronized physical clocks.',
      'Monotonic leader leases and FIFO total-order broadcast.',
    ],
    correctIndex: 1,
    explanation:
      'Because a join-semilattice merge is commutative (order-independent), associative (grouping-independent), and idempotent (duplicate-safe), any two replicas that have received the same set of updates—in any order and with any number of retries—deterministically converge to the exact same state with 0-RTT local writes.',
  },
  {
    id: 'exam-ch-vnodes',
    number: '07',
    domainId: 'partitioning',
    conceptId: 'consistent-hashing',
    citation: 'Karger et al. 1997',
    formula: 'E[moved keys] ≈ K / N',
    prompt:
      'Why do production consistent hash rings (Cassandra, Dynamo) assign dozens or hundreds of virtual nodes (tokens) per physical server instead of placing each server at a single point on the ring?',
    options: [
      'To eliminate the need for any replication across failure domains.',
      'To smooth out random arc-length variance (load skew) and spread a failed server’s load evenly across all remaining peers rather than dumping it onto a single neighbor.',
      'To enable O(1) ordered SQL range queries across sorted keys.',
      'To prevent keys from ever moving when a new physical server joins the cluster.',
    ],
    correctIndex: 1,
    explanation:
      'With 1 token per server, random hashing produces severe load imbalance (worst-case O(log N) skew) and forces a single clockwise neighbor to absorb 100% of a crashed server’s traffic. Virtual nodes reduce standard deviation of load as O(1/sqrt(V)) and scatter failover recovery evenly across the entire fleet.',
  },
  {
    id: 'exam-shard-hotspot',
    number: '08',
    domainId: 'partitioning',
    conceptId: 'sharding-rebalancing',
    citation: 'Corbett et al. 2012 · Kleppmann 2017',
    formula: 'Range Sharding: fast scans, monotonic write hotspot risk',
    prompt:
      'A high-ingest telemetry service writes millions of events per second keyed by monotonically increasing timestamp (`2026-11-24T...`). What happens if the table is range-sharded directly on timestamp?',
    options: [
      'Writes spread uniformly across every shard in the cluster automatically.',
      'All live writes hit the single rightmost shard owning the current timestamp range, creating a severe write hotspot while older shards sit idle.',
      'Range queries over time intervals become impossible and require full scatter-gather.',
      'The cluster automatically switches to Byzantine fault tolerance.',
    ],
    correctIndex: 1,
    explanation:
      'Range sharding excels at ordered range scans, but monotonically increasing primary keys concentrate 100% of current writes onto the single tail shard. Production databases mitigate this by prefixing the key with a hash/bucket (e.g., `sensor_bucket + timestamp`) or using hash sharding when scans are unnecessary.',
  },
  {
    id: 'exam-2pc-blocking',
    number: '09',
    domainId: 'coordination',
    conceptId: 'two-phase-commit',
    citation: 'Gray 1978',
    formula: 'coord FAILED while participant PREPARED => BLOCKED',
    prompt:
      'In Two-Phase Commit (2PC), Participant P1 votes YES and enters the PREPARED state holding row locks. Before sending Phase 2 decisions, the Coordinator crashes permanently. Why cannot P1 safely abort on its own?',
    options: [
      'Because P1 might have already forgotten its local write-ahead log.',
      'Because another participant may have already received COMMIT from the coordinator before the crash—unilaterally aborting would violate atomic commit.',
      'Because 2PC forbids aborting any transaction once Phase 1 begins.',
      'Because P1 must first elect a Byzantine quorum of 3f + 1 participants.',
    ],
    correctIndex: 1,
    explanation:
      'Once a participant replies YES (PREPARED), it surrenders unilateral decision power. From P1’s perspective, the coordinator may have already logged COMMIT and delivered it to P2 before crashing. Until the coordinator recovers (or is backed by a Raft/Paxos consensus group), P1 must stay blocked holding locks.',
  },
  {
    id: 'exam-lock-fencing',
    number: '10',
    domainId: 'coordination',
    conceptId: 'distributed-locking',
    citation: 'Burrows 2006 (Chubby) · Kleppmann 2016',
    formula: 'storage rejects write if token < maxSeenToken',
    prompt:
      'Client A holds a distributed lease with a 10-second TTL, freezes in a 15-second GC pause while the lease expires and transfers to Client B, then wakes up and sends a write to the storage server. What mechanism prevents Client A’s stale write from corrupting Client B’s work?',
    options: [
      'Increasing the heartbeat interval so GC pauses are ignored.',
      'Checking Client A’s local wall clock before issuing the HTTP request.',
      'Attaching a monotonically increasing fencing token issued by the lock service and having the storage layer reject any write with a token older than the highest token already seen.',
      'Using UDP instead of TCP so paused packets expire automatically.',
    ],
    correctIndex: 2,
    explanation:
      'Process pauses and network delays make client-side TTL checks unsafe for correctness. A consensus-backed lock service issues a strictly increasing fencing token on each lease grant (e.g., token 33 for A, token 34 for B); once storage processes a write with token 34, it deterministically rejects any late-arriving write carrying token 33.',
  },
] as const;

export const TOTAL_EXAM_QUESTIONS = EXAM_QUESTIONS.length;

export function gradeExam(answers: Readonly<Record<string, number>>): ExamGradeResult {
  let score = 0;
  let answeredCount = 0;

  const domainMap = new Map<ConceptDomainId, { correct: number; total: number }>();
  for (const domain of CONCEPT_DOMAINS) {
    domainMap.set(domain.id, { correct: 0, total: 0 });
  }

  const details: QuestionGradeDetail[] = EXAM_QUESTIONS.map((q) => {
    const raw = answers[q.id];
    const selectedIndex =
      typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < q.options.length
        ? raw
        : null;

    if (selectedIndex !== null) {
      answeredCount += 1;
    }

    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) {
      score += 1;
    }

    const bucket = domainMap.get(q.domainId);
    if (bucket) {
      bucket.total += 1;
      if (isCorrect) {
        bucket.correct += 1;
      }
    }

    return {
      questionId: q.id,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
    };
  });

  const total = EXAM_QUESTIONS.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const byDomain: DomainExamScore[] = CONCEPT_DOMAINS.map((domain) => {
    const stats = domainMap.get(domain.id) ?? { correct: 0, total: 0 };
    return {
      domainId: domain.id,
      domainIndex: domain.index,
      domainLabel: domain.label,
      correct: stats.correct,
      total: stats.total,
    };
  });

  return {
    score,
    total,
    percentage,
    passed: score >= EXAM_PASS_THRESHOLD,
    answeredCount,
    byDomain,
    details,
  };
}
