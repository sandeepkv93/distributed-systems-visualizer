import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOCOL_FLASHCARDS,
  TOTAL_DRILLS,
  DRILL_MASTER_SEAL_THRESHOLD,
  filterDrills,
  computeDrillStats,
} from '../lib/drills';
import { CONCEPTS_CATALOG, CONCEPTS_BY_ID, CONCEPT_DOMAINS } from '../lib/catalog';

describe('Active-Recall Protocol Flashcards engine', () => {
  it('covers all 22 catalog concepts exactly once with matching domainIds and unique IDs', () => {
    assert.equal(PROTOCOL_FLASHCARDS.length, CONCEPTS_CATALOG.length);
    assert.equal(TOTAL_DRILLS, 22);

    const seenIds = new Set<string>();
    const seenConcepts = new Set<string>();

    for (const card of PROTOCOL_FLASHCARDS) {
      assert.ok(!seenIds.has(card.id), `Duplicate drill id ${card.id}`);
      seenIds.add(card.id);

      assert.ok(!seenConcepts.has(card.conceptId), `Duplicate conceptId ${card.conceptId}`);
      seenConcepts.add(card.conceptId);

      const concept = CONCEPTS_BY_ID.get(card.conceptId);
      assert.ok(concept, `Unknown conceptId ${card.conceptId}`);
      assert.equal(card.domainId, concept.domainId);
      assert.ok(card.prompt.length > 20);
      assert.ok(card.answer.length > 40);
      assert.ok(card.formula.length > 5);
    }

    for (const concept of CONCEPTS_CATALOG) {
      assert.ok(seenConcepts.has(concept.id), `Missing flashcard for concept ${concept.id}`);
    }
  });

  it('filters by domain and computes deduplicated mastery stats & seal threshold accurately', () => {
    const all = filterDrills('all');
    assert.equal(all.length, 22);

    let sumDomains = 0;
    for (const domain of CONCEPT_DOMAINS) {
      const subset = filterDrills(domain.id);
      assert.ok(subset.length >= 3);
      assert.ok(subset.every((c) => c.domainId === domain.id));
      sumDomains += subset.length;
    }
    assert.equal(sumDomains, 22);

    const below = computeDrillStats(PROTOCOL_FLASHCARDS.slice(0, 5).map((c) => c.id));
    assert.equal(below.masteredCount, 5);
    assert.equal(below.sealEarned, false);

    // Duplicates and invalid IDs should be safely ignored
    const atThreshold = computeDrillStats([
      ...PROTOCOL_FLASHCARDS.slice(0, DRILL_MASTER_SEAL_THRESHOLD).map((c) => c.id),
      PROTOCOL_FLASHCARDS[0].id,
      'invalid-card-id',
    ]);
    assert.equal(atThreshold.masteredCount, DRILL_MASTER_SEAL_THRESHOLD);
    assert.equal(atThreshold.sealEarned, true);
  });
});
