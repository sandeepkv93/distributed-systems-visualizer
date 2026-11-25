import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TOPOLOGY_PRESETS, evaluateProtocolLatencies } from '../lib/latency-math';
import { CONCEPTS_BY_ID } from '../lib/catalog';

describe('Latency & Message Complexity Estimator engine', () => {
  it('references valid catalog concepts across all 7 protocols and defines 4 topology presets', () => {
    assert.equal(TOPOLOGY_PRESETS.length, 4);

    const results = evaluateProtocolLatencies({
      clusterSize: 5,
      baseRttMs: 45,
      jitterMultiplier: 1.8,
    });
    assert.equal(results.length, 7);

    for (const item of results) {
      assert.ok(CONCEPTS_BY_ID.has(item.conceptId), `Unknown conceptId: ${item.conceptId}`);
      assert.ok(item.p50Ms > 0);
      assert.ok(item.p99Ms >= item.p50Ms);
      assert.ok(item.phases.length >= 1);
      assert.ok(item.serialOpsPerSec > 0);
    }
  });

  it('captures O(N^2) PBFT message explosion vs O(N) Raft and O(1) CRDTs', () => {
    const n4 = evaluateProtocolLatencies({ clusterSize: 4, baseRttMs: 10, jitterMultiplier: 2.0 });
    const n10 = evaluateProtocolLatencies({ clusterSize: 10, baseRttMs: 10, jitterMultiplier: 2.0 });

    const raft4 = n4.find((p) => p.id === 'raft')!;
    const raft10 = n10.find((p) => p.id === 'raft')!;
    const pbft4 = n4.find((p) => p.id === 'pbft')!;
    const pbft10 = n10.find((p) => p.id === 'pbft')!;
    const crdt10 = n10.find((p) => p.id === 'crdts')!;

    assert.equal(crdt10.messagesPerWrite, 0);
    assert.equal(raft4.messagesPerWrite, 6);
    assert.equal(raft10.messagesPerWrite, 18);
    assert.equal(pbft4.messagesPerWrite, 27); // 3 + 2*4*3
    assert.equal(pbft10.messagesPerWrite, 189); // 9 + 2*10*9
    assert.ok(pbft10.messagesPerWrite > raft10.messagesPerWrite * 8);
  });

  it('marks PBFT non-viable for N=3 and amplifies 2PC p99 straggler tail over Basic Paxos', () => {
    const n3 = evaluateProtocolLatencies({ clusterSize: 3, baseRttMs: 40, jitterMultiplier: 2.0 });
    const pbft3 = n3.find((p) => p.id === 'pbft')!;
    assert.equal(pbft3.viable, false);

    const n7 = evaluateProtocolLatencies({ clusterSize: 7, baseRttMs: 40, jitterMultiplier: 2.5 });
    const paxos7 = n7.find((p) => p.id === 'paxos')!;
    const tpc7 = n7.find((p) => p.id === 'two-phase-commit')!;
    // Both take 2 RTTs, but 2PC waits for ALL participants while Paxos waits for majority quorum
    assert.ok(tpc7.p99Ms > paxos7.p99Ms);
  });
});
