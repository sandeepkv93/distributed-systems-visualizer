import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FAILURE_RUNBOOKS, filterRunbooks } from '../lib/runbooks';
import { CONCEPTS_BY_ID } from '../lib/catalog';
import { INCIDENTS } from '../lib/incidents';

describe('Production Failure Modes & SRE Runbook Matrix', () => {
  it('defines 8 unique runbooks linked to valid catalog concepts, real scenario IDs, and valid incident IDs', () => {
    assert.equal(FAILURE_RUNBOOKS.length, 8);
    const incidentIds = new Set(INCIDENTS.map((i) => i.id));
    const seenIds = new Set<string>();

    for (const rb of FAILURE_RUNBOOKS) {
      assert.ok(!seenIds.has(rb.id), `Duplicate runbook id ${rb.id}`);
      seenIds.add(rb.id);

      const concept = CONCEPTS_BY_ID.get(rb.conceptId);
      assert.ok(concept, `Invalid conceptId ${rb.conceptId} on ${rb.id}`);
      assert.equal(concept.domainId, rb.domainId);
      assert.ok(
        concept.scenarios.some((s) => s.id === rb.reproScenarioId),
        `Invalid scenarioId ${rb.reproScenarioId} on concept ${rb.conceptId} for ${rb.id}`
      );
      if (rb.incidentId) {
        assert.ok(incidentIds.has(rb.incidentId), `Invalid incidentId ${rb.incidentId} on ${rb.id}`);
      }
      assert.ok(rb.telemetrySignals.length >= 2);
      assert.ok(rb.immediateMitigation.length >= 2);
    }
  });

  it('filters runbooks accurately by domain, severity, and search query', () => {
    assert.equal(filterRunbooks('all', 'all', '').length, 8);
    assert.ok(filterRunbooks('all', 'SEV-1', '').every((r) => r.severity === 'SEV-1'));
    assert.ok(filterRunbooks('consensus', 'all', '').every((r) => r.domainId === 'consensus'));

    const isrMatches = filterRunbooks('all', 'all', 'underreplicatedpartitions');
    assert.equal(isrMatches.length, 1);
    assert.equal(isrMatches[0].id, 'rb-kafka-isr-shrink');
  });
});
