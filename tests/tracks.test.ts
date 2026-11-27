import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  LEARNING_TRACKS,
  getNextRecommendedPlate,
  getTrackContextForConcept,
} from '@/lib/tracks';

describe('Learning tracks curriculum coverage', () => {
  it('covers all 22 catalog concepts exactly once with valid adjacent plate navigation', () => {
    const seen = new Set<string>();
    const catalogIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));

    for (const track of LEARNING_TRACKS) {
      assert.ok(track.conceptIds.length > 0, `Empty track: ${track.id}`);
      for (const id of track.conceptIds) {
        assert.ok(catalogIds.has(id), `Unknown concept "${id}" in track ${track.id}`);
        assert.equal(seen.has(id), false, `Duplicate concept "${id}" across tracks`);
        seen.add(id);
      }
    }

    assert.equal(seen.size, catalogIds.size, 'All 22 catalog concepts must appear in a learning track');

    const raftCtx = getTrackContextForConcept('raft');
    assert.ok(raftCtx);
    assert.equal(raftCtx.track.id, 'consensus-from-scratch');
    assert.equal(raftCtx.prev?.id, 'paxos');
    assert.equal(raftCtx.next?.id, 'consensus-variants');
  });

  it('recommends the next uncompleted plate in curriculum order and returns null when all 22 are done', () => {
    const first = getNextRecommendedPlate([]);
    assert.ok(first);
    assert.equal(first.concept.id, 'lamport-clocks');
    assert.equal(first.track.id, 'time-and-causality');

    const second = getNextRecommendedPlate(['lamport-clocks']);
    assert.ok(second);
    assert.equal(second.concept.id, 'vector-clocks');

    const allDone = getNextRecommendedPlate(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(allDone, null);
  });
});
