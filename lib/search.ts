import { CONCEPTS_CATALOG } from './catalog';
import { LABS_CATALOG, TOTAL_LABS } from './labs-catalog';
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
    id: 'lab:labs',
    kind: 'lab',
    badge: 'INDEX',
    title: `Interactive Workbenches & Labs Directory (${TOTAL_LABS})`,
    subtitle:
      'Browse and filter all 27 specialized calculators, failure simulators, SRE playbooks & interview studios by domain',
    href: '/labs',
    keywords:
      'labs workbenches directory catalog index all simulators tools calculators playbooks',
  },
  ...LABS_CATALOG.map((lab) => ({
    id: `lab:${lab.id}`,
    kind: 'lab' as const,
    badge: lab.searchBadge,
    title: lab.title,
    subtitle: lab.subtitle,
    href: lab.path,
    keywords: lab.keywords,
  })),
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
