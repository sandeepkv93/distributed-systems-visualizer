import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  DEFAULT_ASSUMPTIONS,
  PACELC_SYSTEMS,
  THEOREMS,
  evaluateSystemAssumptions,
  getTheoremById,
} from '../lib/theorems';

describe('Impossibility Theorems & PACELC Lab engine', () => {
  it('defines 6 unique theorems and 8 PACELC systems with valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(THEOREMS.length, 6);
    assert.equal(new Set(THEOREMS.map((t) => t.id)).size, 6);

    for (const theorem of THEOREMS) {
      assert.ok(theorem.conceptIds.length >= 2, `${theorem.id} should link >= 2 plates`);
      assert.ok(theorem.proofSketch.length === 4, `${theorem.id} should have 4 proof steps`);
      for (const cid of theorem.conceptIds) {
        assert.ok(validIds.has(cid), `Theorem ${theorem.id} references invalid conceptId: ${cid}`);
      }
    }

    assert.equal(PACELC_SYSTEMS.length, 8);
    const quadrants = new Set(PACELC_SYSTEMS.map((s) => s.classification));
    assert.deepEqual(
      [...quadrants].sort(),
      ['PA/EC', 'PA/EL', 'PC/EC', 'PC/EL'],
      'PACELC matrix must cover all 4 quadrants'
    );
    for (const sys of PACELC_SYSTEMS) {
      assert.ok(validIds.has(sys.conceptId), `PACELC system ${sys.id} has invalid conceptId`);
    }

    assert.equal(getTheoremById('unknown-id').id, 'flp');
  });

  it('evaluates FLP, 2f+1, 3f+1, CAP, and CALM triggers accurately across assumption regimes', () => {
    // Asynchronous + 1 crash fault -> FLP triggers, deterministic consensus impossible
    const asyncCrash = evaluateSystemAssumptions(DEFAULT_ASSUMPTIONS);
    assert.equal(asyncCrash.deterministicConsensusPossible, false);
    assert.equal(
      asyncCrash.evaluations.find((e) => e.theoremId === 'flp')?.status,
      'triggered'
    );
    assert.equal(
      asyncCrash.evaluations.find((e) => e.theoremId === 'cap-pacelc')?.status,
      'triggered'
    );

    // Partial synchrony + 5 nodes + 2 crash faults -> Raft/Paxos safe and possible (5 >= 2*2+1)
    const raftRegime = evaluateSystemAssumptions({
      synchrony: 'partial-sync',
      faultModel: 'crash',
      partitioned: false,
      monotonic: false,
      nodes: 5,
      faults: 2,
    });
    assert.equal(raftRegime.deterministicConsensusPossible, true);
    assert.equal(raftRegime.quorumSafetyHolds, true);
    assert.equal(raftRegime.minNodesRequired, 5);
    assert.equal(
      raftRegime.evaluations.find((e) => e.theoremId === 'flp')?.status,
      'circumvented'
    );

    // Byzantine f=2 requires 7 nodes; N=6 must fail BFT 3f+1 bound
    const bftTooSmall = evaluateSystemAssumptions({
      synchrony: 'partial-sync',
      faultModel: 'byzantine',
      partitioned: false,
      monotonic: false,
      nodes: 6,
      faults: 2,
    });
    assert.equal(bftTooSmall.minNodesRequired, 7);
    assert.equal(bftTooSmall.quorumSafetyHolds, false);
    assert.equal(bftTooSmall.deterministicConsensusPossible, false);
    assert.equal(
      bftTooSmall.evaluations.find((e) => e.theoremId === 'bft-3f1')?.status,
      'triggered'
    );

    // Monotonic crash-model program -> CALM allows coordination-free convergence
    const calmOk = evaluateSystemAssumptions({
      synchrony: 'asynchronous',
      faultModel: 'crash',
      partitioned: true,
      monotonic: true,
      nodes: 3,
      faults: 1,
    });
    assert.equal(calmOk.coordinationFreePossible, true);
    assert.equal(
      calmOk.evaluations.find((e) => e.theoremId === 'calm')?.status,
      'satisfied'
    );
  });
});
