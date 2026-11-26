import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  CACHE_PATTERNS,
  EVICTION_POLICIES,
  STAMPEDE_DEFENSES,
  simulateCacheStampede,
} from '../lib/caching-lab';

describe('Distributed Caching, Thundering Herds & Memcache Leases Lab', () => {
  it('defines 4 cache patterns, 4 stampede defenses, and 3 eviction policies with valid conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(CACHE_PATTERNS.length, 4);
    assert.equal(STAMPEDE_DEFENSES.length, 4);
    assert.equal(EVICTION_POLICIES.length, 3);

    for (const pat of CACHE_PATTERNS) {
      assert.ok(pat.conceptIds.length >= 2);
      for (const cid of pat.conceptIds) {
        assert.ok(validIds.has(cid), `Cache pattern ${pat.id} references invalid conceptId: ${cid}`);
      }
    }

    const tinyLfu = EVICTION_POLICIES.find((p) => p.id === 'w-tinylfu')!;
    const lru = EVICTION_POLICIES.find((p) => p.id === 'lru')!;
    assert.ok(tinyLfu.hitRateUnderScanPct > lru.hitRateUnderScanPct);
  });

  it('captures unprotected thundering herd overload vs Singleflight, XFetch, and Memcache Leases stabilization', () => {
    const base = {
      hotKeyRps: 4000,
      dbQueryMs: 150,
      dbCapacityRps: 250,
      appInstances: 16,
    };

    const unprotected = simulateCacheStampede({ ...base, defense: 'none' });
    assert.equal(unprotected.unprotectedMeltedDown, true);
    assert.equal(unprotected.defendedStable, false);
    assert.equal(unprotected.preventsStaleSetRace, false);

    const sf = simulateCacheStampede({ ...base, defense: 'singleflight' });
    assert.equal(sf.defendedStable, true);
    assert.ok(sf.peakDefendedRps < unprotected.peakUnprotectedRps * 0.25);

    const xfetch = simulateCacheStampede({ ...base, defense: 'xfetch' });
    assert.equal(xfetch.defendedStable, true);
    assert.ok(xfetch.peakDefendedRps < sf.peakDefendedRps);

    const leases = simulateCacheStampede({ ...base, defense: 'memcache-leases' });
    assert.equal(leases.defendedStable, true);
    assert.equal(leases.preventsStaleSetRace, true);
    assert.ok(leases.reductionFactor >= 5);
  });
});
