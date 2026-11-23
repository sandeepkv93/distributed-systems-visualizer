import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_SEARCH_INDEX, searchAtlas } from '../lib/search';
import { TOTAL_CONCEPTS, TOTAL_SCENARIOS } from '../lib/catalog';
import { DUELS } from '../lib/duels';
import { INCIDENTS } from '../lib/incidents';

describe('Unified Atlas Command Palette search index', () => {
  it('indexes all plates, scenarios, duels, incidents, and core labs with unique IDs', () => {
    const plates = ATLAS_SEARCH_INDEX.filter((i) => i.kind === 'plate');
    const scenarios = ATLAS_SEARCH_INDEX.filter((i) => i.kind === 'scenario');
    const duels = ATLAS_SEARCH_INDEX.filter((i) => i.kind === 'duel');
    const incidents = ATLAS_SEARCH_INDEX.filter((i) => i.kind === 'incident');
    const labs = ATLAS_SEARCH_INDEX.filter((i) => i.kind === 'lab');

    assert.equal(plates.length, TOTAL_CONCEPTS);
    assert.equal(scenarios.length, TOTAL_SCENARIOS);
    assert.equal(duels.length, DUELS.length);
    assert.equal(incidents.length, INCIDENTS.length);
    assert.ok(labs.length >= 4);

    const uniqueIds = new Set(ATLAS_SEARCH_INDEX.map((i) => i.id));
    assert.equal(uniqueIds.size, ATLAS_SEARCH_INDEX.length);
  });

  it('finds deep-linked scenarios, duels, incidents, and bench tools via multi-token queries', () => {
    const splitBrain = searchAtlas('split brain');
    assert.ok(splitBrain.length > 0);
    assert.ok(
      splitBrain.some((r) => r.href.includes('/incidents?incident=split-brain') || r.href.includes('?scenario='))
    );

    const bftResults = searchAtlas('3f+1');
    assert.ok(bftResults.some((r) => r.href === '/bench'));
    assert.ok(bftResults.some((r) => r.href === '/pbft' || r.href.includes('pbft')));

    const readRepair = searchAtlas('read repair', 'scenario');
    assert.ok(readRepair.length > 0);
    assert.ok(readRepair.every((r) => r.kind === 'scenario' && r.href.includes('?scenario=')));

    const lamportDuels = searchAtlas('lamport', 'duel');
    assert.ok(lamportDuels.some((r) => r.href === '/duel?duel=lamport-vs-vector'));
  });

  it('returns curated labs and plates on empty query and respects kind filters', () => {
    const defaultResults = searchAtlas('');
    assert.ok(defaultResults.some((r) => r.kind === 'lab'));
    assert.ok(defaultResults.some((r) => r.kind === 'plate'));

    const onlyIncidents = searchAtlas('', 'incident');
    assert.equal(onlyIncidents.length, INCIDENTS.length);
    assert.ok(onlyIncidents.every((r) => r.kind === 'incident'));
  });
});
