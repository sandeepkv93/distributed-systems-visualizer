export type LabCategoryId =
  | 'theory'
  | 'transactions-replication'
  | 'storage-data'
  | 'resilience-observability'
  | 'mastery';

export type LabTone = 'signal' | 'cobalt' | 'emerald';

export interface LabCategory {
  id: LabCategoryId;
  index: string;
  label: string;
  shortLabel: string;
  summary: string;
  tone: LabTone;
}

export interface LabCatalogEntry {
  id: string;
  path: string;
  badge: string;
  searchBadge: string;
  tone: LabTone;
  shortTitle: string;
  navTitle: string;
  title: string;
  subtitle: string;
  categoryId: LabCategoryId;
  featured?: boolean;
  keywords: string;
  relatedConceptIds: readonly string[];
}

export const LAB_CATEGORIES: readonly LabCategory[] = [
  {
    id: 'theory',
    index: '01',
    label: 'Theory, Clocks & Consistency',
    shortLabel: 'Theory & Clocks',
    summary:
      'Impossibility bounds, consistency anomalies, physical/logical clock uncertainty, systems genealogy, and primary literature.',
    tone: 'cobalt',
  },
  {
    id: 'transactions-replication',
    index: '02',
    label: 'Replication, Quorums & Transactions',
    shortLabel: 'Replication & Txns',
    summary:
      'Geo-WAN topologies, MVCC write-skew isolation, transactional outbox CDC, quorum overlap math, and live side-by-side duels.',
    tone: 'signal',
  },
  {
    id: 'storage-data',
    index: '03',
    label: 'Storage, Caching, Streaming & Performance',
    shortLabel: 'Storage & Perf',
    summary:
      'LSM-Tree vs. B+Tree RUM trade-offs, cache stampedes, probabilistic sketches, event-time watermarks, queueing cliffs, and tail RTTs.',
    tone: 'emerald',
  },
  {
    id: 'resilience-observability',
    index: '04',
    label: 'Resilience, Observability & Production Architecture',
    shortLabel: 'Resilience & Ops',
    summary:
      'Circuit breakers and AIMD, OpenTelemetry span trees, outage postmortems, SRE runbooks, real infrastructure blueprints, and ADR stack design.',
    tone: 'signal',
  },
  {
    id: 'mastery',
    index: '05',
    label: 'Interviews, Drills & Mastery Assessment',
    shortLabel: 'Mastery & Drills',
    summary:
      'Staff/Principal system design interview critiques, 22-plate active-recall flashcards, and the cross-domain Atlas Fellow exam.',
    tone: 'emerald',
  },
] as const;

export const LABS_CATALOG: readonly LabCatalogEntry[] = [
  // 01 · Theory, Clocks & Consistency
  {
    id: 'map',
    path: '/map',
    badge: 'DEPENDENCY MAP',
    searchBadge: 'LAB',
    tone: 'cobalt',
    shortTitle: 'Dependency Map',
    navTitle: '22-Protocol Systems Genealogy',
    title: 'Protocol Dependency Map',
    subtitle: 'Interactive 22-protocol systems genealogy and prerequisite graph',
    categoryId: 'theory',
    featured: true,
    keywords: 'map genealogy graph prerequisites dependencies curriculum',
    relatedConceptIds: ['lamport-clocks', 'raft', 'paxos', 'cap-theorem'],
  },
  {
    id: 'theorems',
    path: '/theorems',
    badge: 'THEOREMS',
    searchBadge: 'THEORY',
    tone: 'signal',
    shortTitle: 'Impossibility Theorems',
    navTitle: 'Impossibility Theorems & PACELC Bounds',
    title: 'Impossibility Theorems & PACELC Bounds Lab',
    subtitle:
      'Interactive FLP, CAP/PACELC, 2f+1, 3f+1, CALM monotonicity, and clock-sync assumption evaluator',
    categoryId: 'theory',
    featured: true,
    keywords:
      'theorems impossibility flp pacelc cap calm monotonicity bft 3f+1 2f+1 lower bound proof counterexample',
    relatedConceptIds: ['cap-theorem', 'paxos', 'pbft', 'crdts'],
  },
  {
    id: 'consistency',
    path: '/consistency',
    badge: 'CONSISTENCY',
    searchBadge: 'LAB',
    tone: 'signal',
    shortTitle: 'Consistency Models',
    navTitle: 'Consistency Models & Anomalies Lab',
    title: 'Consistency Models & Execution Anomalies Lab',
    subtitle:
      'Linearizability, Sequential, Causal, Read-Your-Writes, Monotonic Reads & Eventual Consistency traces',
    categoryId: 'theory',
    keywords:
      'consistency linearizability sequential causal read your writes monotonic reads eventual stale read jepsen anomaly',
    relatedConceptIds: ['cap-theorem', 'eventual-consistency', 'quorum-replication', 'vector-clocks'],
  },
  {
    id: 'clocks',
    path: '/clocks',
    badge: 'CLOCKS LAB',
    searchBadge: 'LAB',
    tone: 'cobalt',
    shortTitle: 'HLC & TrueTime',
    navTitle: 'HLC & TrueTime Uncertainty',
    title: 'Hybrid Logical Clocks (HLC) & TrueTime Lab',
    subtitle:
      'Inject NTP clock skew to compare Wall-Clock LWW data loss vs HLC (l,c) vs Spanner TrueTime 2ε Commit-Wait',
    categoryId: 'theory',
    keywords:
      'clocks hlc hybrid logical clock truetime spanner ntp skew drift lww commit wait external consistency',
    relatedConceptIds: ['lamport-clocks', 'vector-clocks', 'distributed-transactions'],
  },
  {
    id: 'glossary',
    path: '/glossary',
    badge: 'GLOSSARY',
    searchBadge: 'LEXICON',
    tone: 'cobalt',
    shortTitle: 'Glossary & Notation',
    navTitle: 'Formal Notation & Terms Lexicon',
    title: 'Canonical Distributed Systems Glossary & Notation',
    subtitle:
      '37 foundational terms and formal symbols (FLP, PACELC, HW/LEO, Fencing, Vnodes, HLC) linked to live plates',
    categoryId: 'theory',
    keywords:
      'glossary dictionary lexicon notation symbols definitions flp pacelc linearizability quorum fencing vnodes',
    relatedConceptIds: ['raft', 'quorum-replication', 'consistent-hashing', 'distributed-locking'],
  },
  {
    id: 'bibliography',
    path: '/bibliography',
    badge: 'BIBLIOGRAPHY',
    searchBadge: 'LAB',
    tone: 'cobalt',
    shortTitle: 'Bibliography',
    navTitle: 'Foundational Papers (1978–2014)',
    title: 'Primary Literature & Citation Monograph',
    subtitle: '18 foundational distributed systems papers (1978–2014) linked to all 22 plates',
    categoryId: 'theory',
    keywords:
      'bibliography papers literature citations reading list syllabus lamport gray dynamo raft paxos',
    relatedConceptIds: ['lamport-clocks', 'paxos', 'raft', 'pbft'],
  },

  // 02 · Replication, Quorums & Transactions
  {
    id: 'replication-topologies',
    path: '/replication-topologies',
    badge: 'GEO-WAN',
    searchBadge: 'GEO-WAN',
    tone: 'signal',
    shortTitle: 'Geo-WAN Replication',
    navTitle: 'Geo-Distributed Replication Topologies',
    title: 'Geo-Distributed Replication Topologies Lab',
    subtitle:
      '3-continent WAN simulator comparing Single-Leader Sync/Async, Multi-Leader Active-Active & Leaderless Dynamo Quorums',
    categoryId: 'transactions-replication',
    featured: true,
    keywords:
      'geo replication topologies wan multi-leader single-leader leaderless dynamo rpo rto failover sloppy quorum hinted handoff',
    relatedConceptIds: ['replication-log', 'quorum-replication', 'crdts', 'network-partitions'],
  },
  {
    id: 'isolation',
    path: '/isolation',
    badge: 'ISOLATION',
    searchBadge: 'MVCC',
    tone: 'cobalt',
    shortTitle: 'MVCC & Write Skew',
    navTitle: 'MVCC & Write-Skew Lab',
    title: 'Transaction Isolation Levels, MVCC & Write-Skew Lab',
    subtitle:
      'Step through Dirty Read, Lost Update, Phantom & On-Call Write Skew across Read Committed, Snapshot Isolation & SSI',
    categoryId: 'transactions-replication',
    featured: true,
    keywords:
      'isolation mvcc write skew ssi serializable snapshot read committed repeatable phantom dirty read adya cycle',
    relatedConceptIds: ['two-phase-commit', 'distributed-transactions', 'distributed-locking'],
  },
  {
    id: 'outbox',
    path: '/outbox',
    badge: 'OUTBOX · CDC',
    searchBadge: 'CDC',
    tone: 'emerald',
    shortTitle: 'Outbox & WAL CDC',
    navTitle: 'Transactional Outbox & Idempotent Consumers',
    title: 'Transactional Outbox, WAL CDC & Idempotent Consumers Lab',
    subtitle:
      'Eliminate dual-write drift between Postgres and Kafka using local Outbox tables, Debezium WAL CDC & Consumer Inbox dedup',
    categoryId: 'transactions-replication',
    keywords:
      'outbox cdc debezium dual write kafka postgres wal idempotent consumer inbox effectively once event driven microservices',
    relatedConceptIds: ['two-phase-commit', 'distributed-transactions', 'replication-log'],
  },
  {
    id: 'bench',
    path: '/bench',
    badge: 'QUORUM BENCH',
    searchBadge: 'LAB',
    tone: 'emerald',
    shortTitle: 'Quorum Bench',
    navTitle: 'Fault-Tolerance & Quorum Calculator',
    title: 'Quorum & Fault-Tolerance Workbench',
    subtitle:
      'Interactive N/W/R overlap, 2f+1 CFT, 3f+1 BFT, and binomial availability calculator',
    categoryId: 'transactions-replication',
    keywords:
      'bench calculator quorum w+r>n dynamo 2f+1 3f+1 bft cft availability nines',
    relatedConceptIds: ['quorum-replication', 'raft', 'pbft', 'cap-theorem'],
  },
  {
    id: 'duel',
    path: '/duel',
    badge: 'DUEL LAB',
    searchBadge: 'LAB',
    tone: 'signal',
    shortTitle: 'Protocol Duels',
    navTitle: 'Side-by-Side Protocol Bench',
    title: 'Protocol Duel Bench',
    subtitle: '6 side-by-side live algorithm comparisons under identical faults',
    categoryId: 'transactions-replication',
    keywords:
      'duel compare side by side raft paxos pbft 2pc saga lamport vector crdt',
    relatedConceptIds: ['raft', 'paxos', 'two-phase-commit', 'distributed-transactions'],
  },

  // 03 · Storage, Caching, Streaming & Performance
  {
    id: 'storage',
    path: '/storage',
    badge: 'STORAGE',
    searchBadge: 'STORAGE',
    tone: 'emerald',
    shortTitle: 'LSM vs. B+Tree',
    navTitle: 'LSM-Tree vs. B+Tree & RUM Lab',
    title: 'Storage Engine Internals: LSM-Tree vs B+Tree & RUM Lab',
    subtitle:
      'Compare RocksDB/SSTable compaction & Bloom filters against B+Tree pages under live Read/Write/Space amplification',
    categoryId: 'storage-data',
    featured: true,
    keywords:
      'storage lsm tree btree b+tree rocksdb pebble sstable memtable wal bloom filter compaction rum conjecture write amplification',
    relatedConceptIds: ['replication-log', 'merkle-anti-entropy', 'sharding-rebalancing'],
  },
  {
    id: 'caching',
    path: '/caching',
    badge: 'CACHING',
    searchBadge: 'CACHE',
    tone: 'emerald',
    shortTitle: 'Caching & Leases',
    navTitle: 'Stampedes & Memcache Leases Lab',
    title: 'Distributed Caching, Thundering Herds & Memcache Leases Lab',
    subtitle:
      'Compare Cache-Aside/Write-Through, Singleflight, XFetch early expiry, Memcache Leases & W-TinyLFU eviction',
    categoryId: 'storage-data',
    keywords:
      'caching redis memcache lease stampede thundering herd singleflight xfetch cache-aside write-through write-behind lru lfu tinylfu',
    relatedConceptIds: ['consistent-hashing', 'load-balancing', 'eventual-consistency'],
  },
  {
    id: 'sketches',
    path: '/sketches',
    badge: 'SKETCHES',
    searchBadge: 'SKETCH',
    tone: 'emerald',
    shortTitle: 'Bloom, CMS & HLL',
    navTitle: 'Bloom, Count-Min & HyperLogLog Lab',
    title: 'Probabilistic Data Structures: Bloom, Count-Min & HyperLogLog',
    subtitle:
      'Interactive 32-bit Bloom filter probe, 4×10 Count-Min Sketch heavy-hitter matrix & 12KB HyperLogLog cardinality lab',
    categoryId: 'storage-data',
    keywords:
      'sketches probabilistic bloom filter count-min sketch hyperloglog hll cardinality heavy hitters false positive bit array redis',
    relatedConceptIds: ['merkle-anti-entropy', 'consistent-hashing', 'gossip-anti-entropy'],
  },
  {
    id: 'streaming',
    path: '/streaming',
    badge: 'STREAMING',
    searchBadge: 'STREAM',
    tone: 'cobalt',
    shortTitle: 'Stream Watermarks',
    navTitle: 'Watermarks & Checkpoint Barriers Lab',
    title: 'Stream Processing: Watermarks, Windows & Checkpoint Barriers Lab',
    subtitle:
      'Event-time vs processing-time watermarks, late data drops, tumbling/sliding/session windows & Flink ABS barriers',
    categoryId: 'storage-data',
    keywords:
      'streaming flink dataflow millwheel watermark event time processing time tumbling sliding session window barrier checkpoint exactly once',
    relatedConceptIds: ['chandy-lamport', 'replication-log', 'lamport-clocks'],
  },
  {
    id: 'queueing',
    path: '/queueing',
    badge: 'QUEUEING',
    searchBadge: 'MATH',
    tone: 'cobalt',
    shortTitle: 'Queueing & Tail',
    navTitle: "Little's Law & Tail-Latency Lab",
    title: "Queueing Theory, Little's Law & Tail Amplification Lab",
    subtitle:
      "M/M/c Erlang-C utilization cliffs, Little's Law L=λW, fan-out tail hedging & metastable retry storms",
    categoryId: 'storage-data',
    keywords:
      'queueing mm1 mmc erlang littles law tail latency amplification fanout hedged requests retry storm metastable jitter',
    relatedConceptIds: ['load-balancing', 'failure-detectors', 'sharding-rebalancing'],
  },
  {
    id: 'latency',
    path: '/latency',
    badge: 'LATENCY LAB',
    searchBadge: 'LAB',
    tone: 'cobalt',
    shortTitle: 'Latency & RTT Math',
    navTitle: 'Latency & Message Complexity Estimator',
    title: 'Latency & Message Complexity Estimator',
    subtitle:
      'Compare p50/p99 commit RTTs and O(1) vs O(N) vs O(N²) message scaling across WAN/LAN topologies',
    categoryId: 'storage-data',
    keywords:
      'latency rtt p50 p99 tail straggler wan lan message complexity o(n2) pbft raft 2pc throughput',
    relatedConceptIds: ['raft', 'paxos', 'pbft', 'two-phase-commit'],
  },

  // 04 · Resilience, Observability & Production Architecture
  {
    id: 'resilience',
    path: '/resilience',
    badge: 'RESILIENCE',
    searchBadge: 'MESH',
    tone: 'signal',
    shortTitle: 'Mesh Resilience',
    navTitle: 'Circuit Breakers, Bulkheads & AIMD Lab',
    title: 'Service Mesh Resilience: Circuit Breakers, Bulkheads & AIMD Lab',
    subtitle:
      'Stop cascading failures with 3-state circuit breakers, bulkhead pools, AIMD adaptive concurrency & deadline propagation',
    categoryId: 'resilience-observability',
    featured: true,
    keywords:
      'resilience circuit breaker bulkhead adaptive concurrency aimd vegas hystrix envoy deadline propagation zombie cascade blast radius',
    relatedConceptIds: ['load-balancing', 'failure-detectors', 'network-partitions'],
  },
  {
    id: 'tracing',
    path: '/tracing',
    badge: 'TRACING',
    searchBadge: 'OTEL',
    tone: 'cobalt',
    shortTitle: 'OTel Span Trees',
    navTitle: 'OpenTelemetry Span Trees & Tail Sampling',
    title: 'Distributed Tracing, Span Trees & Tail Sampling Lab',
    subtitle:
      'W3C traceparent propagation, critical-path waterfalls, NTP clock-skew span inversion & Head vs Tail sampling math',
    categoryId: 'resilience-observability',
    featured: true,
    keywords:
      'tracing opentelemetry otel dapper jaeger span waterfall traceparent critical path tail sampling head sampling clock skew',
    relatedConceptIds: ['lamport-clocks', 'vector-clocks', 'load-balancing'],
  },
  {
    id: 'incidents',
    path: '/incidents',
    badge: 'POSTMORTEMS',
    searchBadge: 'LAB',
    tone: 'signal',
    shortTitle: 'Outage Drills',
    navTitle: 'Diagnose the Outage',
    title: 'Incident Postmortem Lab',
    subtitle: 'Diagnose 6 production outages from Space-Time wire traces and logs',
    categoryId: 'resilience-observability',
    keywords:
      'incidents outages postmortem sev-1 debug root cause split brain stale read',
    relatedConceptIds: ['network-partitions', 'raft', 'distributed-locking', 'two-phase-commit'],
  },
  {
    id: 'runbooks',
    path: '/runbooks',
    badge: 'RUNBOOKS',
    searchBadge: 'SRE',
    tone: 'signal',
    shortTitle: 'SRE Runbooks',
    navTitle: 'Production Failure Modes & SRE Playbook',
    title: 'Production Failure Modes & SRE Runbook Matrix',
    subtitle:
      '8 SEV-1/SEV-2 failure playbooks with telemetry signals, breached invariants, mitigations & live scenario links',
    categoryId: 'resilience-observability',
    keywords:
      'runbooks playbook sre outage mitigation split brain election storm isr shrink fencing 2pc freeze hot shard',
    relatedConceptIds: ['raft', 'replication-log', 'distributed-locking', 'sharding-rebalancing'],
  },
  {
    id: 'systems',
    path: '/systems',
    badge: 'BLUEPRINTS',
    searchBadge: 'LAB',
    tone: 'signal',
    shortTitle: 'Real Systems',
    navTitle: 'Real-World Infrastructure Stacks',
    title: 'Real-World Infrastructure Blueprints',
    subtitle:
      'How CockroachDB, etcd, Dynamo, Cassandra, Kafka, Spanner & Tendermint compose protocols',
    categoryId: 'resilience-observability',
    keywords:
      'systems blueprints production cockroachdb etcd dynamo cassandra kafka spanner tendermint architecture',
    relatedConceptIds: ['raft', 'replication-log', 'quorum-replication', 'pbft'],
  },
  {
    id: 'advisor',
    path: '/advisor',
    badge: 'ADVISOR',
    searchBadge: 'LAB',
    tone: 'cobalt',
    shortTitle: 'Protocol Advisor',
    navTitle: 'Architecture Decision Matrix',
    title: 'Architecture Decision Matrix & Protocol Selector',
    subtitle:
      'Rank Raft, Paxos, PBFT, Quorums, CRDTs, 2PC, Sagas & Sharding against system constraints',
    categoryId: 'resilience-observability',
    keywords:
      'advisor selector choose protocol decision matrix architecture cap linearizable byzantine latency',
    relatedConceptIds: ['raft', 'paxos', 'pbft', 'crdts'],
  },
  {
    id: 'studio',
    path: '/studio',
    badge: 'STACK STUDIO',
    searchBadge: 'STUDIO',
    tone: 'signal',
    shortTitle: 'Stack Studio',
    navTitle: 'System Design Composer & ADR Exporter',
    title: 'System Design Stack Composer & ADR Exporter',
    subtitle:
      'Assemble partitioning, consensus, transaction & clock layers with live conflict auditing and Markdown ADR export',
    categoryId: 'resilience-observability',
    keywords:
      'studio composer system design stack adr markdown architecture decision record builder anti-pattern',
    relatedConceptIds: ['consistent-hashing', 'raft', 'two-phase-commit', 'lamport-clocks'],
  },

  // 05 · Interviews, Drills & Mastery Assessment
  {
    id: 'interviews',
    path: '/interviews',
    badge: 'INTERVIEWS',
    searchBadge: 'INTERVIEW',
    tone: 'signal',
    shortTitle: 'Design Interviews',
    navTitle: 'System Design Interview Simulator',
    title: 'System Design Interview Simulator & Critique Studio',
    subtitle:
      '6 Staff/Principal design cases (Payment Ledger, Rate Limiter, Chat, Kafka Log, Geo-KV, Collab Editor) with scored critiques',
    categoryId: 'mastery',
    featured: true,
    keywords:
      'interviews staff principal system design simulator critique payment ledger rate limiter chat log pipeline kv editor',
    relatedConceptIds: ['raft', 'distributed-transactions', 'replication-log', 'crdts'],
  },
  {
    id: 'drills',
    path: '/drills',
    badge: 'FLASHCARDS',
    searchBadge: 'DRILL',
    tone: 'emerald',
    shortTitle: 'Study Flashcards',
    navTitle: 'Active-Recall Study Deck (22 Plates)',
    title: 'Active-Recall Protocol Flashcards',
    subtitle:
      '22 keyboard-driven study cards covering invariants, complexity bounds, and failure modes across all plates',
    categoryId: 'mastery',
    keywords:
      'drills flashcards spaced repetition interview prep recall study cards scholar deck',
    relatedConceptIds: ['cap-theorem', 'raft', 'paxos', 'quorum-replication'],
  },
  {
    id: 'exam',
    path: '/exam',
    badge: 'MASTERY EXAM',
    searchBadge: 'EXAM',
    tone: 'emerald',
    shortTitle: 'Mastery Exam',
    navTitle: 'Systems Mastery Assessment',
    title: 'Systems Mastery Assessment',
    subtitle:
      '10 cross-domain problems across all 5 domains — score 8/10 to earn the Atlas Fellow seal',
    categoryId: 'mastery',
    featured: true,
    keywords:
      'exam test quiz assessment certification atlas fellow mastery score evaluation',
    relatedConceptIds: ['raft', 'pbft', 'quorum-replication', 'two-phase-commit'],
  },
] as const;

export const TOTAL_LABS = LABS_CATALOG.length;

export const LAB_CATEGORIES_BY_ID: ReadonlyMap<LabCategoryId, LabCategory> = new Map(
  LAB_CATEGORIES.map((category) => [category.id, category])
);

export const LABS_BY_PATH: ReadonlyMap<string, LabCatalogEntry> = new Map(
  LABS_CATALOG.map((lab) => [lab.path, lab])
);

export function getLabByPath(path: string): LabCatalogEntry | null {
  const normalized = path.replace(/\/$/, '') || '/';
  return LABS_BY_PATH.get(normalized) ?? null;
}

export interface LabNavigationContext {
  lab: LabCatalogEntry;
  category: LabCategory;
  siblings: readonly LabCatalogEntry[];
  index: number;
  total: number;
  prev: LabCatalogEntry | null;
  next: LabCatalogEntry | null;
}

export function getLabContextForPath(path: string): LabNavigationContext | null {
  const lab = getLabByPath(path);
  if (!lab) return null;
  const category = LAB_CATEGORIES_BY_ID.get(lab.categoryId);
  if (!category) return null;
  const siblings = LABS_CATALOG.filter((item) => item.categoryId === lab.categoryId);
  const index = siblings.findIndex((item) => item.id === lab.id);
  if (index === -1) return null;
  return {
    lab,
    category,
    siblings,
    index,
    total: siblings.length,
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

export function getLabsByCategory(categoryId: LabCategoryId): LabCatalogEntry[] {
  return LABS_CATALOG.filter((lab) => lab.categoryId === categoryId);
}

export function getCategoryCounts(): Record<LabCategoryId, number> {
  const counts: Record<LabCategoryId, number> = {
    theory: 0,
    'transactions-replication': 0,
    'storage-data': 0,
    'resilience-observability': 0,
    mastery: 0,
  };
  for (const lab of LABS_CATALOG) {
    counts[lab.categoryId] += 1;
  }
  return counts;
}

export function filterLabs(
  categoryId: LabCategoryId | 'all',
  query: string
): LabCatalogEntry[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return LABS_CATALOG.filter((lab) => {
    if (categoryId !== 'all' && lab.categoryId !== categoryId) {
      return false;
    }
    if (tokens.length === 0) {
      return true;
    }
    const haystack = `${lab.id} ${lab.badge} ${lab.shortTitle} ${lab.title} ${lab.subtitle} ${lab.keywords}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
