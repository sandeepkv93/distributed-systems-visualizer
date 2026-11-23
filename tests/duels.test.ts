import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DUELS,
  isDuelId,
  getDuelById,
  parseDuelDeepLink,
  clampDuelStep,
  buildDuelDeepLinkUrl,
} from '../lib/duels';
import { CONCEPTS_CATALOG } from '../lib/catalog';

describe('Protocol Duel Lab specifications & deep-linking', () => {
  it('defines 6 unique duels referencing valid catalog plates with rich steps and trade-offs', () => {
    assert.equal(DUELS.length, 6);

    const validPaths = new Set(CONCEPTS_CATALOG.map((c) => c.path));
    const seenIds = new Set<string>();
    const seenNumbers = new Set<string>();

    for (const duel of DUELS) {
      assert.ok(!seenIds.has(duel.id), `Duplicate duel id: ${duel.id}`);
      seenIds.add(duel.id);

      assert.ok(!seenNumbers.has(duel.number), `Duplicate duel number: ${duel.number}`);
      seenNumbers.add(duel.number);

      assert.ok(validPaths.has(duel.leftPath), `Invalid leftPath: ${duel.leftPath}`);
      assert.ok(validPaths.has(duel.rightPath), `Invalid rightPath: ${duel.rightPath}`);
      assert.notEqual(duel.leftPath, duel.rightPath, `Duel ${duel.id} must compare two distinct plates`);

      assert.ok(duel.steps.length >= 4, `Duel ${duel.id} should have at least 4 steps`);
      assert.ok(duel.comparison.length >= 4, `Duel ${duel.id} should have at least 4 comparison axes`);

      for (const step of duel.steps) {
        assert.ok(step.title.length > 0);
        assert.ok(step.leftNote.length > 0);
        assert.ok(step.rightNote.length > 0);
        assert.ok(step.insight.length > 0);
      }
    }
  });

  it('validates duel IDs and parses/clamps ?duel=<id>&step=<n> query parameters safely', () => {
    assert.equal(isDuelId('raft-vs-pbft'), true);
    assert.equal(isDuelId('quorum-vs-crdts'), true);
    assert.equal(isDuelId('hashing-vs-sharding'), true);
    assert.equal(isDuelId('unknown-duel'), false);

    assert.deepEqual(parseDuelDeepLink('?duel=raft-vs-pbft&step=3'), {
      duelId: 'raft-vs-pbft',
      step: 3,
    });

    assert.deepEqual(parseDuelDeepLink('?duel=invalid&step=-5'), {
      duelId: null,
      step: null,
    });

    assert.deepEqual(parseDuelDeepLink('?duel=quorum-vs-crdts&step=abc'), {
      duelId: 'quorum-vs-crdts',
      step: null,
    });

    const maxSteps = getDuelById('raft-vs-pbft').steps.length;
    assert.equal(clampDuelStep('raft-vs-pbft', 99), maxSteps);
    assert.equal(clampDuelStep('raft-vs-pbft', -2), 0);
    assert.equal(clampDuelStep('raft-vs-pbft', 2.9), 2);
  });

  it('builds shareable duel deep-link URLs while preserving unrelated params and hash', () => {
    const withStep = buildDuelDeepLinkUrl(
      'https://atlas.example.com/duel?ref=nav#matrix',
      'hashing-vs-sharding',
      3
    );
    assert.equal(
      withStep,
      'https://atlas.example.com/duel?ref=nav&duel=hashing-vs-sharding&step=3#matrix'
    );

    const atZero = buildDuelDeepLinkUrl(withStep, 'quorum-vs-crdts', 0);
    assert.equal(
      atZero,
      'https://atlas.example.com/duel?ref=nav&duel=quorum-vs-crdts#matrix'
    );
  });
});
