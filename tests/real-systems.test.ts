import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REAL_SYSTEMS, getRealSystemById } from '../lib/real-systems';
import { CONCEPTS_BY_ID } from '../lib/catalog';
import { isDuelId } from '../lib/duels';
import { INCIDENTS } from '../lib/incidents';

describe('Real-World Infrastructure Blueprints integrity', () => {
  it('defines 6 unique blueprints with valid catalog conceptIds, duels, and incidents', () => {
    assert.equal(REAL_SYSTEMS.length, 6);

    const incidentIds = new Set(INCIDENTS.map((i) => i.id));
    const seenIds = new Set<string>();
    const seenNumbers = new Set<string>();

    for (const sys of REAL_SYSTEMS) {
      assert.ok(!seenIds.has(sys.id), `Duplicate blueprint id: ${sys.id}`);
      seenIds.add(sys.id);

      assert.ok(!seenNumbers.has(sys.number), `Duplicate blueprint number: ${sys.number}`);
      seenNumbers.add(sys.number);

      assert.ok(sys.layers.length >= 4, `Blueprint ${sys.id} needs >= 4 architecture layers`);
      assert.ok(sys.writePathSteps.length >= 4, `Blueprint ${sys.id} needs >= 4 write-path steps`);

      for (const layer of sys.layers) {
        assert.ok(layer.conceptIds.length >= 1);
        for (const cid of layer.conceptIds) {
          assert.ok(CONCEPTS_BY_ID.has(cid), `Unknown conceptId "${cid}" in ${sys.id}/${layer.id}`);
        }
      }

      if (sys.relatedDuelId) {
        assert.ok(isDuelId(sys.relatedDuelId), `Invalid relatedDuelId in ${sys.id}`);
      }
      if (sys.relatedIncidentId) {
        assert.ok(incidentIds.has(sys.relatedIncidentId), `Invalid relatedIncidentId in ${sys.id}`);
      }
    }
  });

  it('resolves blueprints by id with safe fallback to first blueprint', () => {
    assert.equal(getRealSystemById('apache-kafka').number, '03');
    assert.equal(getRealSystemById('nonexistent').number, '01');
    assert.equal(getRealSystemById(null).number, '01');
  });
});
