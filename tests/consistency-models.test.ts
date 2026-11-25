import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSISTENCY_MODELS,
  CONSISTENCY_ANOMALIES,
  getConsistencyAnomalyById,
} from '../lib/consistency-models';
import { CONCEPTS_BY_ID } from '../lib/catalog';

describe('Consistency Models & Execution Anomalies Lab', () => {
  it('defines 6 models and 6 unique anomalies with valid catalog conceptIds and operation intervals', () => {
    assert.equal(CONSISTENCY_MODELS.length, 6);
    assert.equal(CONSISTENCY_ANOMALIES.length, 6);

    for (const model of CONSISTENCY_MODELS) {
      assert.ok(model.enforcingConceptIds.length >= 2);
      for (const cid of model.enforcingConceptIds) {
        assert.ok(CONCEPTS_BY_ID.has(cid), `Unknown conceptId ${cid} on model ${model.id}`);
      }
    }

    const ids = new Set<string>();
    for (const anomaly of CONSISTENCY_ANOMALIES) {
      assert.ok(!ids.has(anomaly.id), `Duplicate anomaly id ${anomaly.id}`);
      ids.add(anomaly.id);

      assert.ok(anomaly.operations.length >= 2);
      const opIds = new Set<string>();
      for (const op of anomaly.operations) {
        assert.ok(anomaly.clients.includes(op.client), `Unknown client ${op.client} on ${anomaly.id}`);
        assert.ok(op.start >= 0 && op.end <= 100 && op.start < op.end, `Invalid interval on ${op.id}`);
        opIds.add(op.id);
      }
      for (const link of anomaly.causalLinks ?? []) {
        assert.ok(opIds.has(link.fromOpId), `Unknown fromOpId ${link.fromOpId}`);
        assert.ok(opIds.has(link.toOpId), `Unknown toOpId ${link.toOpId}`);
      }
      for (const cid of anomaly.enforcingConceptIds) {
        assert.ok(CONCEPTS_BY_ID.has(cid), `Unknown conceptId ${cid} on anomaly ${anomaly.id}`);
      }
    }
  });

  it('respects formal hierarchy monotonicity and distinguishes every pair of consistency models', () => {
    // Monotonicity: Linearizability => Sequential => Causal => {RYW, Monotonic Reads} => Eventual
    const implies: ReadonlyArray<[typeof CONSISTENCY_MODELS[number]['id'], typeof CONSISTENCY_MODELS[number]['id']]> = [
      ['linearizability', 'sequential'],
      ['sequential', 'causal'],
      ['causal', 'read-your-writes'],
      ['causal', 'monotonic-reads'],
      ['read-your-writes', 'eventual'],
      ['monotonic-reads', 'eventual'],
    ];

    for (const anomaly of CONSISTENCY_ANOMALIES) {
      for (const [stronger, weaker] of implies) {
        if (anomaly.verdicts[weaker] === 'forbidden') {
          assert.equal(
            anomaly.verdicts[stronger],
            'forbidden',
            `Hierarchy violation on ${anomaly.id}: ${weaker} forbids it so ${stronger} must also forbid it`
          );
        }
      }
    }

    // Every pair of models has a distinct verdict signature across the 6 anomalies
    const signatures = new Set(
      CONSISTENCY_MODELS.map((m) => CONSISTENCY_ANOMALIES.map((a) => a.verdicts[m.id]).join(','))
    );
    assert.equal(signatures.size, CONSISTENCY_MODELS.length);

    assert.equal(getConsistencyAnomalyById('causal-inversion').id, 'causal-inversion');
    assert.equal(getConsistencyAnomalyById('nonexistent').id, CONSISTENCY_ANOMALIES[0].id);
  });
});
