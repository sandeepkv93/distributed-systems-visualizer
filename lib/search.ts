import { CONCEPTS_CATALOG } from './catalog';
import { DUELS } from './duels';
import { INCIDENTS } from './incidents';

export type SearchItemKind = 'plate' | 'scenario' | 'duel' | 'incident' | 'lab';
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

  // Slight tie-breaker priority: labs & plates before deep scenarios
  const kindBonus: Record<SearchItemKind, number> = {
    lab: 8,
    plate: 6,
    duel: 5,
    incident: 4,
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
