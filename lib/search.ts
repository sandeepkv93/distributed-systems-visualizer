import { CONCEPTS_CATALOG } from './catalog';
import { DUELS } from './duels';
import { INCIDENTS } from './incidents';
import { GLOSSARY_ENTRIES } from './glossary';
import { BIBLIOGRAPHY } from './bibliography';
import { FAILURE_RUNBOOKS } from './runbooks';
import { THEOREMS } from './theorems';
import { INTERVIEW_PROMPTS } from './interviews';

export type SearchItemKind =
  | 'plate'
  | 'scenario'
  | 'duel'
  | 'incident'
  | 'lab'
  | 'glossary'
  | 'paper'
  | 'runbook';
export type SearchKindFilter = 'all' | SearchItemKind;

export interface AtlasSearchItem {
  id: string;
  kind: SearchItemKind;
  badge: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
}

const CORE_LABS: readonly AtlasSearchItem[] = [
  {
    id: 'lab:map',
    kind: 'lab',
    badge: 'LAB',
    title: 'Protocol Dependency Map',
    subtitle: 'Interactive 22-protocol systems genealogy and prerequisite graph',
    href: '/map',
    keywords: 'map genealogy graph prerequisites dependencies curriculum',
  },
  {
    id: 'lab:bench',
    kind: 'lab',
    badge: 'LAB',
    title: 'Quorum & Fault-Tolerance Workbench',
    subtitle: 'Interactive N/W/R overlap, 2f+1 CFT, 3f+1 BFT, and binomial availability calculator',
    href: '/bench',
    keywords: 'bench calculator quorum w+r>n dynamo 2f+1 3f+1 bft cft availability nines',
  },
  {
    id: 'lab:duel',
    kind: 'lab',
    badge: 'LAB',
    title: 'Protocol Duel Bench',
    subtitle: '6 side-by-side live algorithm comparisons under identical faults',
    href: '/duel',
    keywords: 'duel compare side by side raft paxos pbft 2pc saga lamport vector crdt',
  },
  {
    id: 'lab:incidents',
    kind: 'lab',
    badge: 'LAB',
    title: 'Incident Postmortem Lab',
    subtitle: 'Diagnose 6 production outages from Space-Time wire traces and logs',
    href: '/incidents',
    keywords: 'incidents outages postmortem sev-1 debug root cause split brain stale read',
  },
  {
    id: 'lab:bibliography',
    kind: 'lab',
    badge: 'LAB',
    title: 'Primary Literature & Citation Monograph',
    subtitle: '18 foundational distributed systems papers (1978–2014) linked to all 22 plates',
    href: '/bibliography',
    keywords: 'bibliography papers literature citations reading list syllabus lamport gray dynamo raft paxos',
  },
  {
    id: 'lab:advisor',
    kind: 'lab',
    badge: 'LAB',
    title: 'Architecture Decision Matrix & Protocol Selector',
    subtitle: 'Rank Raft, Paxos, PBFT, Quorums, CRDTs, 2PC, Sagas & Sharding against system constraints',
    href: '/advisor',
    keywords: 'advisor selector choose protocol decision matrix architecture cap linearizable byzantine latency',
  },
  {
    id: 'lab:systems',
    kind: 'lab',
    badge: 'LAB',
    title: 'Real-World Infrastructure Blueprints',
    subtitle: 'How CockroachDB, etcd, Dynamo, Cassandra, Kafka, Spanner & Tendermint compose protocols',
    href: '/systems',
    keywords: 'systems blueprints production cockroachdb etcd dynamo cassandra kafka spanner tendermint architecture',
  },
  {
    id: 'lab:exam',
    kind: 'lab',
    badge: 'EXAM',
    title: 'Systems Mastery Assessment',
    subtitle: '10 cross-domain problems across all 5 domains — score 8/10 to earn the Atlas Fellow seal',
    href: '/exam',
    keywords: 'exam test quiz assessment certification atlas fellow mastery score evaluation',
  },
  {
    id: 'lab:latency',
    kind: 'lab',
    badge: 'LAB',
    title: 'Latency & Message Complexity Estimator',
    subtitle: 'Compare p50/p99 commit RTTs and O(1) vs O(N) vs O(N²) message scaling across WAN/LAN topologies',
    href: '/latency',
    keywords: 'latency rtt p50 p99 tail straggler wan lan message complexity o(n2) pbft raft 2pc throughput',
  },
  {
    id: 'lab:consistency',
    kind: 'lab',
    badge: 'LAB',
    title: 'Consistency Models & Execution Anomalies Lab',
    subtitle: 'Linearizability, Sequential, Causal, Read-Your-Writes, Monotonic Reads & Eventual Consistency traces',
    href: '/consistency',
    keywords: 'consistency linearizability sequential causal read your writes monotonic reads eventual stale read jepsen anomaly',
  },
  {
    id: 'lab:drills',
    kind: 'lab',
    badge: 'DRILL',
    title: 'Active-Recall Protocol Flashcards',
    subtitle: '22 keyboard-driven study cards covering invariants, complexity bounds, and failure modes across all plates',
    href: '/drills',
    keywords: 'drills flashcards spaced repetition interview prep recall study cards scholar deck',
  },
  {
    id: 'lab:clocks',
    kind: 'lab',
    badge: 'LAB',
    title: 'Hybrid Logical Clocks (HLC) & TrueTime Lab',
    subtitle: 'Inject NTP clock skew to compare Wall-Clock LWW data loss vs HLC (l,c) vs Spanner TrueTime 2ε Commit-Wait',
    href: '/clocks',
    keywords: 'clocks hlc hybrid logical clock truetime spanner ntp skew drift lww commit wait external consistency',
  },
  {
    id: 'lab:studio',
    kind: 'lab',
    badge: 'STUDIO',
    title: 'System Design Stack Composer & ADR Exporter',
    subtitle: 'Assemble partitioning, consensus, transaction & clock layers with live conflict auditing and Markdown ADR export',
    href: '/studio',
    keywords: 'studio composer system design stack adr markdown architecture decision record builder anti-pattern',
  },
  {
    id: 'lab:runbooks',
    kind: 'lab',
    badge: 'SRE',
    title: 'Production Failure Modes & SRE Runbook Matrix',
    subtitle: '8 SEV-1/SEV-2 failure playbooks with telemetry signals, breached invariants, mitigations & live scenario links',
    href: '/runbooks',
    keywords: 'runbooks playbook sre outage mitigation split brain election storm isr shrink fencing 2pc freeze hot shard',
  },
  {
    id: 'lab:glossary',
    kind: 'lab',
    badge: 'LEXICON',
    title: 'Canonical Distributed Systems Glossary & Notation',
    subtitle: '37 foundational terms and formal symbols (FLP, PACELC, HW/LEO, Fencing, Vnodes, HLC) linked to live plates',
    href: '/glossary',
    keywords: 'glossary dictionary lexicon notation symbols definitions flp pacelc linearizability quorum fencing vnodes',
  },
  {
    id: 'lab:theorems',
    kind: 'lab',
    badge: 'THEORY',
    title: 'Impossibility Theorems & PACELC Bounds Lab',
    subtitle: 'Interactive FLP, CAP/PACELC, 2f+1, 3f+1, CALM monotonicity, and clock-sync assumption evaluator',
    href: '/theorems',
    keywords: 'theorems impossibility flp pacelc cap calm monotonicity bft 3f+1 2f+1 lower bound proof counterexample',
  },
  {
    id: 'lab:queueing',
    kind: 'lab',
    badge: 'MATH',
    title: 'Queueing Theory, Little’s Law & Tail Amplification Lab',
    subtitle: 'M/M/c Erlang-C utilization cliffs, Little’s Law L=λW, fan-out tail hedging & metastable retry storms',
    href: '/queueing',
    keywords: 'queueing mm1 mmc erlang littles law tail latency amplification fanout hedged requests retry storm metastable jitter',
  },
  {
    id: 'lab:storage',
    kind: 'lab',
    badge: 'STORAGE',
    title: 'Storage Engine Internals: LSM-Tree vs B+Tree & RUM Lab',
    subtitle: 'Compare RocksDB/SSTable compaction & Bloom filters against B+Tree pages under live Read/Write/Space amplification',
    href: '/storage',
    keywords: 'storage lsm tree btree b+tree rocksdb pebble sstable memtable wal bloom filter compaction rum conjecture write amplification',
  },
  {
    id: 'lab:interviews',
    kind: 'lab',
    badge: 'INTERVIEW',
    title: 'System Design Interview Simulator & Critique Studio',
    subtitle: '6 Staff/Principal design cases (Payment Ledger, Rate Limiter, Chat, Kafka Log, Geo-KV, Collab Editor) with scored critiques',
    href: '/interviews',
    keywords: 'interviews staff principal system design simulator critique payment ledger rate limiter chat log pipeline kv editor',
  },
  {
    id: 'lab:isolation',
    kind: 'lab',
    badge: 'MVCC',
    title: 'Transaction Isolation Levels, MVCC & Write-Skew Lab',
    subtitle: 'Step through Dirty Read, Lost Update, Phantom & On-Call Write Skew across Read Committed, Snapshot Isolation & SSI',
    href: '/isolation',
    keywords: 'isolation mvcc write skew ssi serializable snapshot read committed repeatable phantom dirty read adya cycle',
  },
  {
    id: 'lab:caching',
    kind: 'lab',
    badge: 'CACHE',
    title: 'Distributed Caching, Thundering Herds & Memcache Leases Lab',
    subtitle: 'Compare Cache-Aside/Write-Through, Singleflight, XFetch early expiry, Memcache Leases & W-TinyLFU eviction',
    href: '/caching',
    keywords: 'caching redis memcache lease stampede thundering herd singleflight xfetch cache-aside write-through write-behind lru lfu tinylfu',
  },
  {
    id: 'lab:streaming',
    kind: 'lab',
    badge: 'STREAM',
    title: 'Stream Processing: Watermarks, Windows & Checkpoint Barriers Lab',
    subtitle: 'Event-time vs processing-time watermarks, late data drops, tumbling/sliding/session windows & Flink ABS barriers',
    href: '/streaming',
    keywords: 'streaming flink dataflow millwheel watermark event time processing time tumbling sliding session window barrier checkpoint exactly once',
  },
  {
    id: 'lab:resilience',
    kind: 'lab',
    badge: 'MESH',
    title: 'Service Mesh Resilience: Circuit Breakers, Bulkheads & AIMD Lab',
    subtitle: 'Stop cascading failures with 3-state circuit breakers, bulkhead pools, AIMD adaptive concurrency & deadline propagation',
    href: '/resilience',
    keywords: 'resilience circuit breaker bulkhead adaptive concurrency aimd vegas hystrix envoy deadline propagation zombie cascade blast radius',
  },
  {
    id: 'lab:outbox',
    kind: 'lab',
    badge: 'CDC',
    title: 'Transactional Outbox, WAL CDC & Idempotent Consumers Lab',
    subtitle: 'Eliminate dual-write drift between Postgres and Kafka using local Outbox tables, Debezium WAL CDC & Consumer Inbox dedup',
    href: '/outbox',
    keywords: 'outbox cdc debezium dual write kafka postgres wal idempotent consumer inbox effectively once event driven microservices',
  },
];

export function buildAtlasSearchIndex(): AtlasSearchItem[] {
  const items: AtlasSearchItem[] = [...CORE_LABS];

  for (const concept of CONCEPTS_CATALOG) {
    items.push({
      id: `plate:${concept.id}`,
      kind: 'plate',
      badge: `PL ${concept.plateNumber}`,
      title: concept.name,
      subtitle: `${concept.mechanism} · ${concept.citation}`,
      href: concept.path,
      keywords: `${concept.id} ${concept.domainLabel} ${concept.citation} ${concept.mechanism} ${concept.description}`,
    });

    for (const scenario of concept.scenarios) {
      items.push({
        id: `scenario:${concept.id}:${scenario.id}`,
        kind: 'scenario',
        badge: `SCEN · ${concept.plateNumber}`,
        title: scenario.name,
        subtitle: `${concept.name} — ${scenario.description}`,
        href: `${concept.path}?scenario=${encodeURIComponent(scenario.id)}`,
        keywords: `${concept.name} ${concept.id} ${scenario.id} ${scenario.description} ${scenario.expectedOutcome}`,
      });
    }
  }

  for (const duel of DUELS) {
    items.push({
      id: `duel:${duel.id}`,
      kind: 'duel',
      badge: `DUEL ${duel.number}`,
      title: duel.title,
      subtitle: duel.subtitle,
      href: `/duel?duel=${encodeURIComponent(duel.id)}`,
      keywords: `${duel.id} ${duel.leftName} ${duel.rightName} ${duel.leftPaper} ${duel.rightPaper} ${duel.subtitle}`,
    });
  }

  for (const inc of INCIDENTS) {
    items.push({
      id: `incident:${inc.id}`,
      kind: 'incident',
      badge: inc.code,
      title: inc.title,
      subtitle: `${inc.severity} · ${inc.service} — ${inc.summary}`,
      href: `/incidents?incident=${encodeURIComponent(inc.id)}`,
      keywords: `${inc.code} ${inc.severity} ${inc.service} ${inc.conceptId} ${inc.summary} ${inc.postmortemVerdict}`,
    });
  }

  for (const entry of GLOSSARY_ENTRIES) {
    items.push({
      id: `glossary:${entry.id}`,
      kind: 'glossary',
      badge: 'TERM',
      title: entry.symbol ? `${entry.term} (${entry.symbol})` : entry.term,
      subtitle: entry.definition,
      href: `/glossary?term=${encodeURIComponent(entry.id)}`,
      keywords: `${entry.id} ${entry.term} ${entry.symbol ?? ''} ${entry.domainId} ${entry.citation ?? ''} ${entry.conceptIds.join(' ')}`,
    });
  }

  for (const paper of BIBLIOGRAPHY) {
    items.push({
      id: `paper:${paper.id}`,
      kind: 'paper',
      badge: String(paper.year),
      title: paper.title,
      subtitle: `${paper.authors} · ${paper.venue}`,
      href: `/bibliography?paper=${encodeURIComponent(paper.id)}`,
      keywords: `${paper.id} ${paper.year} ${paper.authors} ${paper.venue} ${paper.coreTheorem} ${paper.conceptIds.join(' ')}`,
    });
  }

  for (const rb of FAILURE_RUNBOOKS) {
    items.push({
      id: `runbook:${rb.id}`,
      kind: 'runbook',
      badge: rb.code,
      title: rb.title,
      subtitle: `${rb.severity} · ${rb.breachedInvariant}`,
      href: `/runbooks?runbook=${encodeURIComponent(rb.id)}`,
      keywords: `${rb.id} ${rb.code} ${rb.severity} ${rb.domainId} ${rb.conceptId} ${rb.rootCause} ${rb.telemetrySignals.join(' ')}`,
    });
  }

  for (const thm of THEOREMS) {
    items.push({
      id: `theorem:${thm.id}`,
      kind: 'lab',
      badge: thm.code,
      title: `${thm.name} (${thm.year})`,
      subtitle: `${thm.authors} — ${thm.formalStatement}`,
      href: `/theorems?theorem=${encodeURIComponent(thm.id)}`,
      keywords: `${thm.id} ${thm.code} ${thm.authors} ${thm.year} ${thm.plainEnglish} ${thm.conceptIds.join(' ')}`,
    });
  }

  for (const prompt of INTERVIEW_PROMPTS) {
    items.push({
      id: `interview:${prompt.id}`,
      kind: 'lab',
      badge: prompt.code,
      title: `Interview: ${prompt.title}`,
      subtitle: `${prompt.level} · ${prompt.scale}`,
      href: `/interviews?case=${encodeURIComponent(prompt.id)}`,
      keywords: `${prompt.id} ${prompt.code} ${prompt.level} ${prompt.scale} ${prompt.brief}`,
    });
  }

  return items;
}

export const ATLAS_SEARCH_INDEX: readonly AtlasSearchItem[] = buildAtlasSearchIndex();

function scoreItem(item: AtlasSearchItem, tokens: string[]): number {
  const titleLower = item.title.toLowerCase();
  const badgeLower = item.badge.toLowerCase();
  const subtitleLower = item.subtitle.toLowerCase();
  const keywordsLower = item.keywords.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    let tokenScore = 0;
    if (titleLower === token) tokenScore = 100;
    else if (titleLower.startsWith(token)) tokenScore = 65;
    else if (titleLower.includes(token)) tokenScore = 45;
    else if (badgeLower.includes(token)) tokenScore = 40;
    else if (subtitleLower.includes(token)) tokenScore = 25;
    else if (keywordsLower.includes(token)) tokenScore = 12;

    if (tokenScore === 0) return 0; // Require all query tokens to match
    score += tokenScore;
  }

  // Slight tie-breaker priority: labs & plates before deep scenarios and reference entries
  const kindBonus: Record<SearchItemKind, number> = {
    lab: 8,
    plate: 6,
    duel: 5,
    incident: 4,
    runbook: 4,
    paper: 3,
    glossary: 3,
    scenario: 2,
  };
  return score + kindBonus[item.kind];
}

export function searchAtlas(
  query: string,
  filter: SearchKindFilter = 'all',
  limit: number = 30
): AtlasSearchItem[] {
  const pool =
    filter === 'all'
      ? ATLAS_SEARCH_INDEX
      : ATLAS_SEARCH_INDEX.filter((item) => item.kind === filter);

  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    if (filter === 'all') {
      // Show labs + plates cleanly when palette opens before typing
      return pool
        .filter((item) => item.kind === 'lab' || item.kind === 'plate')
        .slice(0, limit);
    }
    return pool.slice(0, limit);
  }

  return pool
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
