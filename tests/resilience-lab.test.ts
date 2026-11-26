import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  DEFAULT_RESILIENCE_CONFIG,
  RESILIENCE_PATTERNS,
  simulateResilienceMesh,
} from '../lib/resilience-lab';

describe('Service Mesh Resilience: Circuit Breakers, Bulkheads & Adaptive Concurrency Lab', () => {
  it('defines 4 resilience patterns referencing valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(RESILIENCE_PATTERNS.length, 4);
    for (const pat of RESILIENCE_PATTERNS) {
      assert.ok(validIds.has(pat.conceptId), `Pattern ${pat.id} has invalid conceptId: ${pat.conceptId}`);
    }
  });

  it('demonstrates cascading failure without guards vs full blast-radius containment with breaker, bulkhead, AIMD, and deadlines', () => {
    // Fully unprotected mesh suffers worker exhaustion, /catalog outage, and high zombie work
    const unprotected = simulateResilienceMesh({
      circuitBreakerEnabled: false,
      bulkheadEnabled: false,
      adaptiveConcurrencyEnabled: false,
      deadlinePropagationEnabled: false,
      errorThresholdPct: 45,
      bulkheadCapPct: 35,
    });
    assert.equal(unprotected.breakerTripped, false);
    assert.equal(unprotected.blastRadiusContained, false);
    assert.ok(unprotected.minCatalogAvailabilityPct < 50);
    assert.equal(unprotected.peakGatewayWorkersPct, 100);
    assert.ok(unprotected.avgZombieWorkPct > 10);

    // Fully guarded mesh trips OPEN, probes HALF-OPEN, recovers CLOSED, and keeps /catalog at 100%
    const guarded = simulateResilienceMesh(DEFAULT_RESILIENCE_CONFIG);
    assert.equal(guarded.breakerTripped, true);
    assert.equal(guarded.halfOpenProbed, true);
    assert.equal(guarded.recoveredToClosed, true);
    assert.equal(guarded.minCatalogAvailabilityPct, 100);
    assert.equal(guarded.blastRadiusContained, true);
    assert.ok(guarded.avgZombieWorkPct <= 2);

    // Bulkhead alone still isolates /catalog even when circuit breaker is turned off
    const bulkheadOnly = simulateResilienceMesh({
      circuitBreakerEnabled: false,
      bulkheadEnabled: true,
      adaptiveConcurrencyEnabled: true,
      deadlinePropagationEnabled: true,
      errorThresholdPct: 45,
      bulkheadCapPct: 35,
    });
    assert.equal(bulkheadOnly.minCatalogAvailabilityPct, 100);
    assert.ok(bulkheadOnly.ticks.some((t) => t.adaptiveLimit < 60));
  });
});
