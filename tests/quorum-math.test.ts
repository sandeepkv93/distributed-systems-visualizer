import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  combinations,
  binomialTailAvailability,
  analyzeDynamoQuorum,
  analyzeCrashConsensus,
  analyzeByzantineConsensus,
  assignBenchNodeRoles,
  minByzantineNodesForF,
} from '../lib/quorum-math';

describe('Quorum & Fault-Tolerance Workbench math engine', () => {
  it('computes exact binomial coefficients and monotonic tail availability', () => {
    assert.equal(combinations(5, 0), 1);
    assert.equal(combinations(5, 2), 10);
    assert.equal(combinations(5, 3), 10);
    assert.equal(combinations(7, 3), 35);
    assert.equal(combinations(5, 6), 0);

    // 3-node majority at p = 0.9: C(3,2)*0.9^2*0.1 + C(3,3)*0.9^3 = 0.243 + 0.729 = 0.972
    const avail3 = binomialTailAvailability(3, 2, 0.9);
    assert.ok(Math.abs(avail3 - 0.972) < 1e-9);

    // Higher quorum requirement strictly lowers or equals availability
    const availW1 = binomialTailAvailability(5, 1, 0.95);
    const availW3 = binomialTailAvailability(5, 3, 0.95);
    const availW5 = binomialTailAvailability(5, 5, 0.95);
    assert.ok(availW1 > availW3 && availW3 > availW5);
  });

  it('detects Dynamo W + R > N overlap and worst-case disjoint stale reads', () => {
    const strict = analyzeDynamoQuorum(5, 3, 3, 1, 0.99);
    assert.equal(strict.stronglyConsistent, true);
    assert.equal(strict.minOverlap, 1);
    assert.equal(strict.writeFaultTolerance, 2);
    assert.equal(strict.readFaultTolerance, 2);
    assert.equal(strict.canWriteNow, true);
    assert.equal(strict.canReadNow, true);

    const stale = analyzeDynamoQuorum(5, 2, 3, 3, 0.99);
    assert.equal(stale.stronglyConsistent, false);
    assert.equal(stale.minOverlap, 0);
    assert.equal(stale.canWriteNow, true); // 2 healthy >= W=2
    assert.equal(stale.canReadNow, false); // 2 healthy < R=3

    // Worst-case role placement visually verifies overlap count
    const strictRoles = assignBenchNodeRoles(5, 3, 3, 0);
    assert.equal(strictRoles.filter((n) => n.role === 'overlap').length, 1);

    const disjointRoles = assignBenchNodeRoles(5, 2, 3, 0);
    assert.equal(disjointRoles.filter((n) => n.role === 'overlap').length, 0);
  });

  it('evaluates Crash Fault Tolerance (Raft/Paxos) even-node waste and majority thresholds', () => {
    const c3 = analyzeCrashConsensus(3, 1, 0.99);
    assert.equal(c3.majorityQuorum, 2);
    assert.equal(c3.maxFaults, 1);
    assert.equal(c3.wastedEvenNode, false);
    assert.equal(c3.hasQuorumNow, true);

    const c4 = analyzeCrashConsensus(4, 1, 0.99);
    assert.equal(c4.majorityQuorum, 3);
    assert.equal(c4.maxFaults, 1);
    assert.equal(c4.wastedEvenNode, true);
    // 4-node cluster has LOWER availability than 3-node cluster for same p because both tolerate f=1
    assert.ok(c4.clusterAvailability < c3.clusterAvailability);

    const c5 = analyzeCrashConsensus(5, 3, 0.99);
    assert.equal(c5.majorityQuorum, 3);
    assert.equal(c5.maxFaults, 2);
    assert.equal(c5.hasQuorumNow, false);
  });

  it('evaluates Byzantine Fault Tolerance (3f + 1) bounds and guaranteed honest overlap', () => {
    assert.equal(minByzantineNodesForF(1), 4);
    assert.equal(minByzantineNodesForF(2), 7);
    assert.equal(minByzantineNodesForF(3), 10);

    const b3 = analyzeByzantineConsensus(3, 0, 0.99);
    assert.equal(b3.maxByzantineFaults, 0);
    assert.equal(b3.minNodesForNextF, 4);

    const b4 = analyzeByzantineConsensus(4, 1, 0.99);
    assert.equal(b4.maxByzantineFaults, 1);
    assert.equal(b4.quorumSize, 3);
    assert.equal(b4.intersectionSize, 2);
    assert.equal(b4.honestOverlap, 1);
    assert.equal(b4.hasQuorumNow, true);

    const b7 = analyzeByzantineConsensus(7, 2, 0.99);
    assert.equal(b7.maxByzantineFaults, 2);
    assert.equal(b7.quorumSize, 5);
    assert.equal(b7.intersectionSize, 3);
    assert.equal(b7.honestOverlap, 1);
    assert.equal(b7.hasQuorumNow, true);
  });
});
