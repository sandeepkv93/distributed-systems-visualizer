import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  ISOLATION_ANOMALIES,
  ISOLATION_LEVELS,
  evaluateIsolationLevel,
  getIsolationAnomalyById,
  isAnomalyPrevented,
} from '../lib/isolation-lab';

describe('Transaction Isolation Levels, MVCC & Write-Skew Lab', () => {
  it('defines 5 ordered isolation levels and 6 unique anomalies with valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(ISOLATION_LEVELS.length, 5);
    assert.equal(ISOLATION_ANOMALIES.length, 6);
    assert.equal(new Set(ISOLATION_ANOMALIES.map((a) => a.id)).size, 6);

    for (let i = 0; i < ISOLATION_LEVELS.length; i++) {
      assert.equal(ISOLATION_LEVELS[i].rank, i);
    }

    for (const anomaly of ISOLATION_ANOMALIES) {
      assert.ok(anomaly.steps.length === 5, `${anomaly.id} should have 5 timeline steps`);
      assert.ok(anomaly.mvccVersions.length >= 2);
      assert.ok(anomaly.adyaEdges.length >= 1);
      for (const cid of anomaly.conceptIds) {
        assert.ok(validIds.has(cid), `Anomaly ${anomaly.id} references invalid conceptId: ${cid}`);
      }
    }

    assert.equal(getIsolationAnomalyById('unknown').id, 'write-skew');
  });

  it('enforces monotonic anomaly prevention and captures Snapshot Isolation Write Skew gap', () => {
    const counts = ISOLATION_LEVELS.map((lvl) => evaluateIsolationLevel(lvl.id).preventedCount);
    for (let i = 1; i < counts.length; i++) {
      assert.ok(counts[i] >= counts[i - 1], 'Stronger isolation must prevent at least as many anomalies');
    }

    // Read Uncommitted prevents 0; Serializable prevents all 6
    assert.equal(counts[0], 0);
    assert.equal(counts[counts.length - 1], 6);

    // Classic Snapshot Isolation trap: prevents Lost Update & Phantom, but STILL permits Write Skew!
    assert.equal(isAnomalyPrevented('snapshot-isolation', 'lost-update'), true);
    assert.equal(isAnomalyPrevented('snapshot-isolation', 'phantom-read'), true);
    assert.equal(isAnomalyPrevented('snapshot-isolation', 'write-skew'), false);
    assert.equal(isAnomalyPrevented('serializable', 'write-skew'), true);
  });
});
