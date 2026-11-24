import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVISOR_CANDIDATES,
  ADVISOR_PRESETS,
  evaluateProtocolRecommendations,
} from '../lib/advisor';
import { CONCEPTS_BY_ID } from '../lib/catalog';
import { isDuelId } from '../lib/duels';

describe('Architecture Decision Matrix & Protocol Selector engine', () => {
  it('references valid catalog concepts and valid duel IDs across all candidates', () => {
    assert.ok(ADVISOR_CANDIDATES.length >= 9);
    assert.ok(ADVISOR_PRESETS.length >= 5);

    const seen = new Set<string>();
    for (const candidate of ADVISOR_CANDIDATES) {
      assert.ok(!seen.has(candidate.conceptId), `Duplicate candidate: ${candidate.conceptId}`);
      seen.add(candidate.conceptId);

      const catalogEntry = CONCEPTS_BY_ID.get(candidate.conceptId);
      assert.ok(catalogEntry, `Unknown conceptId: ${candidate.conceptId}`);
      assert.equal(candidate.platePath, catalogEntry.path);

      if (candidate.duelId) {
        assert.ok(isDuelId(candidate.duelId), `Invalid duelId: ${candidate.duelId}`);
      }
    }
  });

  it('ranks PBFT #1 and disqualifies crash-only protocols when Byzantine fault tolerance is required', () => {
    const ranked = evaluateProtocolRecommendations({
      faultModel: 'byzantine',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'multi-rtt',
      workload: 'state-machine',
    });

    assert.equal(ranked[0].profile.conceptId, 'pbft');
    assert.equal(ranked[0].fitTier, 'optimal');

    const raft = ranked.find((r) => r.profile.conceptId === 'raft');
    assert.equal(raft?.fitTier, 'disqualified');
    assert.ok(raft && raft.disqualifiers.length > 0);
  });

  it('ranks Raft #1 for CP linearizable 1-RTT state machines and CRDTs #1 for AP 0-RTT collaborative state', () => {
    const cft = evaluateProtocolRecommendations({
      faultModel: 'crash',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'single-rtt',
      workload: 'state-machine',
    });
    assert.equal(cft[0].profile.conceptId, 'raft');
    assert.equal(cft[0].fitTier, 'optimal');

    const collab = evaluateProtocolRecommendations({
      faultModel: 'crash',
      consistency: 'eventual',
      partitionStance: 'ap',
      writeLatency: 'local-0rtt',
      workload: 'shared-collab',
    });
    assert.equal(collab[0].profile.conceptId, 'crdts');
    assert.equal(collab[0].fitTier, 'optimal');
  });

  it('distinguishes 2PC vs Saga for cross-service transactions and Range Sharding for ordered scans', () => {
    const acidTxn = evaluateProtocolRecommendations({
      faultModel: 'crash',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'multi-rtt',
      workload: 'cross-service-txn',
    });
    assert.equal(acidTxn[0].profile.conceptId, 'two-phase-commit');

    const apTxn = evaluateProtocolRecommendations({
      faultModel: 'crash',
      consistency: 'eventual',
      partitionStance: 'ap',
      writeLatency: 'single-rtt',
      workload: 'cross-service-txn',
    });
    assert.equal(apTxn[0].profile.conceptId, 'distributed-transactions');

    const rangeScan = evaluateProtocolRecommendations({
      faultModel: 'crash',
      consistency: 'linearizable',
      partitionStance: 'cp',
      writeLatency: 'single-rtt',
      workload: 'range-scan',
    });
    assert.equal(rangeScan[0].profile.conceptId, 'sharding-rebalancing');
  });
});
