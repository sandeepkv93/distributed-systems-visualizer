import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INCIDENTS, TOTAL_INCIDENTS, getIncidentById } from '../lib/incidents';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import { computeSpaceTimeLayout } from '../lib/spacetime';

describe('Incident Postmortem Lab specifications', () => {
  it('defines 6 unique outages referencing valid catalog concepts and plate routes', () => {
    assert.equal(INCIDENTS.length, 6);
    assert.equal(TOTAL_INCIDENTS, 6);

    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    const validPaths = new Set(CONCEPTS_CATALOG.map((c) => c.path));
    const seenIds = new Set<string>();
    const seenCodes = new Set<string>();

    for (const inc of INCIDENTS) {
      assert.ok(!seenIds.has(inc.id), `Duplicate incident id: ${inc.id}`);
      seenIds.add(inc.id);

      assert.ok(!seenCodes.has(inc.code), `Duplicate incident code: ${inc.code}`);
      seenCodes.add(inc.code);

      assert.ok(validIds.has(inc.conceptId), `Invalid conceptId: ${inc.conceptId}`);
      assert.ok(validPaths.has(inc.relatedPlatePath), `Invalid relatedPlatePath: ${inc.relatedPlatePath}`);
      assert.ok(inc.telemetry.length >= 4, `Incident ${inc.id} needs >= 4 telemetry cards`);
      assert.ok(inc.logLines.length >= 4, `Incident ${inc.id} needs >= 4 log lines`);

      assert.equal(inc.rootCauseOptions.length, 4);
      assert.ok(
        inc.correctRootCauseIndex >= 0 && inc.correctRootCauseIndex < inc.rootCauseOptions.length
      );

      assert.equal(inc.mitigationOptions.length, 4);
      assert.ok(
        inc.correctMitigationIndex >= 0 && inc.correctMitigationIndex < inc.mitigationOptions.length
      );
    }
  });

  it('produces valid non-empty Space-Time wire traces for every incident', () => {
    for (const inc of INCIDENTS) {
      const actorIds = new Set(inc.actors.map((a) => a.id));
      for (const frame of inc.frames) {
        assert.ok(actorIds.has(frame.from), `Unknown actor ${frame.from} in ${inc.id}`);
        assert.ok(actorIds.has(frame.to), `Unknown actor ${frame.to} in ${inc.id}`);
      }

      const layout = computeSpaceTimeLayout(inc.actors, inc.frames);
      assert.equal(layout.lifelines.length, inc.actors.length);
      assert.equal(layout.arrows.length, inc.frames.length);
    }
  });

  it('resolves incidents by id with safe fallback to first incident', () => {
    assert.equal(getIncidentById('pbft-undersized-cluster').code, 'INC-04');
    assert.equal(getIncidentById('unknown-id').code, 'INC-01');
    assert.equal(getIncidentById(null).code, 'INC-01');
  });
});
