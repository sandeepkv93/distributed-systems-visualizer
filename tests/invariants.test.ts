import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRaftInvariants,
  evaluatePaxosInvariants,
  evaluatePBFTInvariants,
  evaluateTwoPhaseCommitInvariants,
  evaluateQuorumInvariants,
  evaluateVectorClockInvariants,
  summarizeInvariants,
} from '../lib/invariants';
import { RaftAlgorithm } from '../lib/algorithms/raft';
import { PaxosAlgorithm } from '../lib/algorithms/paxos';
import { PBFTAlgorithm } from '../lib/algorithms/pbft';
import { TwoPhaseCommitAlgorithm } from '../lib/algorithms/twoPhaseCommit';
import { QuorumReplicationAlgorithm } from '../lib/algorithms/quorumReplication';
import { VectorClocksAlgorithm } from '../lib/algorithms/vectorClocks';

describe('Live Formal Invariant Monitor evaluators', () => {
  it('evaluates Raft Election Safety, Quorum Liveness, and detects split-leader violations', () => {
    const raft = new RaftAlgorithm(5);
    raft.startElection('node-0');
    raft.processRequestVotes();
    raft.processVoteResponses();
    raft.finalizeElection();

    const healthyChecks = evaluateRaftInvariants(raft.getNodes(), raft.getPartitions());
    assert.equal(summarizeInvariants(healthyChecks).overall, 'holding');

    // Crash 3 nodes to lose majority quorum
    raft.failNode('node-2');
    raft.failNode('node-3');
    raft.failNode('node-4');
    const degradedChecks = evaluateRaftInvariants(raft.getNodes(), raft.getPartitions());
    assert.equal(
      degradedChecks.find((c) => c.id === 'raft-quorum-liveness')?.status,
      'degraded'
    );

    // Artificially inject two leaders in the same term to verify Election Safety catches it
    const tampered = raft.getNodes().map((n) =>
      n.id === 'node-1' ? { ...n, status: 'healthy' as const, state: 'leader' as const, term: 1 } : n
    );
    const violatedChecks = evaluateRaftInvariants(tampered, []);
    assert.equal(
      violatedChecks.find((c) => c.id === 'raft-election-safety')?.status,
      'violated'
    );
    assert.equal(summarizeInvariants(violatedChecks).overall, 'violated');
  });

  it('evaluates Paxos acceptor quorum and PBFT 3f+1 bounds', () => {
    const paxos = new PaxosAlgorithm(2, 5, 2);
    assert.equal(summarizeInvariants(evaluatePaxosInvariants(paxos.getAllNodes(), [])).overall, 'holding');

    paxos.failNode('acceptor-0');
    paxos.failNode('acceptor-1');
    paxos.failNode('acceptor-2');
    const paxosDegraded = evaluatePaxosInvariants(paxos.getAllNodes(), []);
    assert.equal(
      paxosDegraded.find((c) => c.id === 'paxos-acceptor-quorum')?.status,
      'degraded'
    );

    const pbft = new PBFTAlgorithm(4);
    assert.equal(summarizeInvariants(evaluatePBFTInvariants(pbft.getNodes())).overall, 'holding');

    pbft.failNode('N0');
    pbft.failNode('N1');
    const pbftDegraded = evaluatePBFTInvariants(pbft.getNodes());
    assert.equal(
      pbftDegraded.find((c) => c.id === 'pbft-quorum-bound')?.status,
      'degraded'
    );
  });

  it('detects 2PC blocking window and atomic decision violations', () => {
    const tpc = new TwoPhaseCommitAlgorithm(3);
    tpc.startTransaction();
    tpc.participantVote('participant-0', 'yes');

    // Simulate coordinator crash while participant-0 is PREPARED
    const crashedCoord = { ...tpc.getCoordinator(), status: 'failed' as const };
    const blockedChecks = evaluateTwoPhaseCommitInvariants(crashedCoord, tpc.getParticipants());
    assert.equal(
      blockedChecks.find((c) => c.id === '2pc-blocking-window')?.status,
      'degraded'
    );

    // Simulate mixed COMMIT + ABORT violation
    const mixed = tpc.getParticipants().map((p, idx) => ({
      ...p,
      state: idx === 0 ? ('committed' as const) : ('aborted' as const),
    }));
    const violated = evaluateTwoPhaseCommitInvariants(tpc.getCoordinator(), mixed);
    assert.equal(violated.find((c) => c.id === '2pc-atomicity')?.status, 'violated');
  });

  it('evaluates Dynamo quorum overlap W+R>N and Vector Clock integrity', () => {
    const quorum = new QuorumReplicationAlgorithm(5, 3);
    const strict = evaluateQuorumInvariants(quorum.getNodes(), 3, 3);
    assert.equal(summarizeInvariants(strict).overall, 'holding');

    const stale = evaluateQuorumInvariants(quorum.getNodes(), 2, 2);
    assert.equal(stale.find((c) => c.id === 'quorum-overlap')?.status, 'violated');

    const vc = new VectorClocksAlgorithm(3);
    vc.createLocalEvent('P0', 'evt-1');
    vc.createLocalEvent('P2', 'evt-2');
    const vcChecks = evaluateVectorClockInvariants(vc.getProcesses(), vc.getStats().concurrentPairs);
    assert.equal(summarizeInvariants(vcChecks).overall, 'holding');
  });
});
