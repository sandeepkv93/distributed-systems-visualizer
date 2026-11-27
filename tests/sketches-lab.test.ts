import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bloomInsert,
  bloomQuery,
  cmsIncrement,
  cmsQuery,
  computeBloomTheoreticalFpr,
  createBloomFilter,
  createCountMinSketch,
  evaluateHyperLogLog,
} from '../lib/sketches-lab';

describe('Probabilistic Data Structures: Bloom Filters, Count-Min Sketch & HyperLogLog', () => {
  it('enforces zero false negatives on Bloom Filters and monotonic theoretical FPR', () => {
    let bf = createBloomFilter(32, 3);
    const keys = ['user:101', 'order:42', 'shard:west', 'txn:991'];
    for (const k of keys) {
      bf = bloomInsert(bf, k);
    }

    for (const k of keys) {
      const q = bloomQuery(bf, k);
      assert.equal(q.probablyPresent, true, `Inserted key ${k} must never false-negative`);
      assert.equal(q.actuallyInserted, true);
      assert.equal(q.isFalsePositive, false);
    }

    // Theoretical FPR increases as filter fills up
    const fprLight = computeBloomTheoreticalFpr(1000, 7, 50);
    const fprHeavy = computeBloomTheoreticalFpr(1000, 7, 300);
    assert.ok(fprHeavy > fprLight);
  });

  it('guarantees Count-Min Sketch never underestimates true frequency and computes HLL 12KB Redis bound', () => {
    let cms = createCountMinSketch(4, 10);
    cms = cmsIncrement(cms, 'hot:key', 25);
    cms = cmsIncrement(cms, 'cold:a', 3);
    cms = cmsIncrement(cms, 'cold:b', 2);
    cms = cmsIncrement(cms, 'cold:c', 4);

    for (const [key, expected] of [
      ['hot:key', 25],
      ['cold:a', 3],
      ['cold:b', 2],
      ['cold:c', 4],
      ['unseen:x', 0],
    ] as const) {
      const res = cmsQuery(cms, key);
      assert.equal(res.trueCount, expected);
      assert.ok(
        res.estimatedCount >= res.trueCount,
        `Count-Min must never underestimate ${key}: got ${res.estimatedCount} < ${res.trueCount}`
      );
    }

    // Redis HyperLogLog p=14 => 16,384 registers => 12 KB exact memory, ~0.81% std error
    const hll = evaluateHyperLogLog(100_000_000, 14);
    assert.equal(hll.registerCountM, 16384);
    assert.equal(hll.hllMemoryKb, 12);
    assert.ok(hll.standardErrorPct > 0.7 && hll.standardErrorPct < 0.9);
    assert.ok(hll.compressionRatio > 100_000);
  });
});
