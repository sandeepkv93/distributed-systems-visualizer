import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  STORAGE_ENGINE_SYSTEMS,
  STORAGE_PRESETS,
  applyWriteBatch,
  computeBloomFpr,
  createInitialStorageSim,
  evaluateStorageEngines,
  simulatePointLookup,
  triggerManualCompaction,
} from '../lib/storage-engines';

describe('Storage Engine Internals: LSM-Tree vs B+Tree & RUM Conjecture', () => {
  it('references valid catalog conceptIds and demonstrates core RUM trade-offs', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(STORAGE_PRESETS.length, 4);
    for (const sys of STORAGE_ENGINE_SYSTEMS) {
      assert.ok(validIds.has(sys.conceptId), `Invalid conceptId on ${sys.name}: ${sys.conceptId}`);
    }

    // Write-heavy small-record workload should recommend LSM-Tree
    const writeHeavy = evaluateStorageEngines(STORAGE_PRESETS[0].params);
    assert.equal(writeHeavy.recommended, 'lsm');
    assert.ok(writeHeavy.lsm.writeAmplification < writeHeavy.btree.writeAmplification);

    // Read-heavy cached OLTP workload should recommend B+Tree
    const readHeavy = evaluateStorageEngines(STORAGE_PRESETS[1].params);
    assert.equal(readHeavy.recommended, 'btree');
    assert.ok(readHeavy.btree.readAmplification <= readHeavy.lsm.readAmplification);

    // Bloom filters dramatically reduce LSM read amplification compared to 0 bits/key
    assert.equal(computeBloomFpr(0), 1);
    assert.ok(computeBloomFpr(10) < 0.01);
    const noBloom = evaluateStorageEngines({
      ...STORAGE_PRESETS[2].params,
      bloomBitsPerKey: 0,
    });
    const withBloom = evaluateStorageEngines({
      ...STORAGE_PRESETS[2].params,
      bloomBitsPerKey: 10,
    });
    assert.ok(withBloom.lsm.readAmplification < noBloom.lsm.readAmplification * 0.4);

    // Size-tiered has lower write amp but higher space amp than leveled
    const leveled = evaluateStorageEngines({
      ...STORAGE_PRESETS[0].params,
      compactionStrategy: 'leveled',
    });
    const tiered = evaluateStorageEngines({
      ...STORAGE_PRESETS[0].params,
      compactionStrategy: 'size-tiered',
    });
    assert.ok(tiered.lsm.writeAmplification < leveled.lsm.writeAmplification);
    assert.ok(tiered.lsm.spaceAmplification > leveled.lsm.spaceAmplification);
  });

  it('advances MemTable flushes, L0 compactions, B+Tree page splits, and point lookups cleanly', () => {
    let sim = createInitialStorageSim();
    for (let i = 0; i < 6; i++) {
      sim = applyWriteBatch(sim);
    }
    assert.equal(sim.writesApplied, 6000);
    assert.ok(sim.btreeSplits >= 1);
    assert.ok(sim.btreeLeafPages > 4);

    const compacted = triggerManualCompaction({ ...sim, l0Tables: 4 });
    assert.equal(compacted.l0Tables, 0);
    assert.equal(compacted.compactionsRun, sim.compactionsRun + 1);

    const lookupNoBloom = simulatePointLookup({ ...sim, l0Tables: 4 }, 0);
    const lookupBloom = simulatePointLookup({ ...sim, l0Tables: 4 }, 10);
    assert.ok(lookupBloom.lastLookupLsmProbes < lookupNoBloom.lastLookupLsmProbes);
  });
});
